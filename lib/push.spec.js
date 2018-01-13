const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
chai.use(sinonChai);

const push = require('./push').push;
const s3 = require('s3');
const errorShotsList = require('./list');

describe('push', () => {
    before(() => {
        sinon.stub(console, 'info');
        sinon.stub(errorShotsList, 'getShots');
    });

    beforeEach(() => {
        console.info.reset();
    });

    after(() => {
        console.info.restore();
    });
    it('should throw an error if an unknown provider is passed', () => {
        expect(() => push('who am i')).to.throw('is unknown');
    });

    it('should throw an error if no provider is passed', () => {
        expect(push).to.throw('No provider');
    });

    describe('s3', () => {
        let mockS3Uploader;

        beforeEach(() => {
            process.env.ERROR_SHOTS_S3_ACCESS_KEY = 'access_key';
            process.env.ERROR_SHOTS_S3_SECRET_ACCESS_KEY = 'secret';
            process.env.ERROR_SHOTS_S3_BUCKET = 'bucket';

            mockS3Uploader = sinon.stub().returns({ on: () => true });
            sinon.stub(s3, 'createClient').returns({ uploadFile: mockS3Uploader });
        });

        afterEach(() => {
            s3.createClient.restore();
        });

        it('should throw an error if ERROR_SHOTS_S3_ACCESS_KEY isnt set', () => {
            process.env.ERROR_SHOTS_S3_ACCESS_KEY = '';

            expect(() => push('s3')).to.throw('accessKeyId');
        });

        it('should throw an error if ERROR_SHOTS_S3_SECRET_ACCESS_KEY isnt set', () => {
            process.env.ERROR_SHOTS_S3_SECRET_ACCESS_KEY = '';

            expect(() => push('s3')).to.throw('secretAccessKey');
        });

        it('should throw an error if ERROR_SHOTS_S3_BUCKET isnt set', () => {
            process.env.ERROR_SHOTS_S3_BUCKET = '';

            expect(() => push('s3')).to.throw('bucket');
        });

        it('should create s3 client with appropriate options', () => {
            errorShotsList.getShots.returns([]);
            push('s3');
            errorShotsList.getShots.reset();

            expect(s3.createClient).to.have.been.calledWith({
                s3Options: {
                    accessKeyId: process.env.ERROR_SHOTS_S3_ACCESS_KEY,
                    secretAccessKey: process.env.ERROR_SHOTS_S3_SECRET_ACCESS_KEY,
                },
            });
        });

        it('should upload all files given from errorshots getShots', () => {
            const files = [
                'nested/file_1',
                'no_nested_file_2',
            ];
            errorShotsList.getShots.returns(files);

            push('s3');

            errorShotsList.getShots.reset();

            files.forEach(filePath => {
                expect(mockS3Uploader).to.have.been.calledWith({
                    localFile: filePath,
                    s3Params: {
                        Bucket: process.env.ERROR_SHOTS_S3_BUCKET,
                        Key: filePath.split('/').pop(),
                    }
                });
            });
        });

        it('should log error when file upload emits an error', () => {
            const emitSpy = sinon.spy();
            mockS3Uploader.returns({ on: emitSpy });
            errorShotsList.getShots.returns(['only_one_single_file']);

            push('s3');

            errorShotsList.getShots.reset();

            sinon.stub(console, 'error');
            const error = new Error('this is an amazing error');
            const errorListener = emitSpy.getCalls().filter(call => call.calledWith('error')).pop();
            errorListener.args.pop()(error);

            expect(console.error).to.have.been.calledWith(error);
            console.error.restore();
        });

        it('should log info when upload succeeded', () => {
            const emitSpy = sinon.spy();
            mockS3Uploader.returns({ on: emitSpy });
            errorShotsList.getShots.returns(['another_one_single_file']);

            push('s3');

            errorShotsList.getShots.reset();

            const completeListener = emitSpy.getCalls().filter(call => call.calledWith('end')).pop();
            completeListener.args.pop()();

            expect(console.info).to.have.been.calledWithMatch(/successfully uploaded/);
        });
    });
});
