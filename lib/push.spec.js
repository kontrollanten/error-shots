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

    it('should print the files that\'ll be pushed', () => {
        try {
            push('someProvider');
            // eslint-disable-next-line no-empty
        } catch (e) {}

        expect(console.info).to.have.been.calledWith();
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

        it('should print info about its time to authenticate', () => {
            errorShotsList.getShots.returns([]);
            push('s3');
            errorShotsList.getShots.reset();

            expect(console.info).to.have.been.calledWithMatch(/Authenticating/);
        });

        it('should create s3 client with appropriate options', () => {
            errorShotsList.getShots.returns([]);
            push('s3');
            errorShotsList.getShots.reset();

            expect(s3.createClient).to.have.been.calledWith({
                s3Options: {
                    accessKeyId: process.env.ERROR_SHOTS_S3_ACCESS_KEY,
                    secretAccessKey: process.env.ERROR_SHOTS_S3_SECRET_ACCESS_KEY,
                    signatureVersion: 's3',
                },
            });
        });

        it('should log info before starting uploading files', () => {
            errorShotsList.getShots.returns([]);
            push('s3');
            errorShotsList.getShots.reset();

            expect(console.info).to.have.been.calledWithMatch(/Initiating upload/);
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

        it('should log info and URL when uploade is succeeded', () => {
            const emitSpy = sinon.spy();
            const region = 'eu-west-east-north-2';
            const files = ['first_file/path.txt', 'second_file.png'];
            mockS3Uploader.returns({ on: emitSpy });
            errorShotsList.getShots.returns(files);
            process.env.ERROR_SHOTS_S3_BUCKET_REGION = region;

            push('s3');

            errorShotsList.getShots.reset();

            const completeListener = emitSpy.getCalls().filter(call => call.calledWith('end'));
            completeListener.forEach(listener => listener.args.pop()());

            files.forEach(filePath => {
                expect(console.info).to.have.been.calledWithMatch(new RegExp(`https://${process.env.ERROR_SHOTS_S3_BUCKET}.s3.amazonaws.com/${filePath}`));
            });
        });
    });
});
