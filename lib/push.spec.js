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
        let mockS3FileUploader;
        let mockS3DirUploader;
        let fs;

        before(() => {
            fs = require('fs');
            sinon.stub(fs, 'lstatSync');
        });

        after(() => {
            fs.lstatSync.restore();
        });

        beforeEach(() => {
            process.env.ERROR_SHOTS_S3_ACCESS_KEY = 'access_key';
            process.env.ERROR_SHOTS_S3_SECRET_ACCESS_KEY = 'secret';
            process.env.ERROR_SHOTS_S3_BUCKET = 'bucket';
            process.env.ERROR_SHOTS_S3_REGION = 'go-west';

            mockS3FileUploader = sinon.stub().returns({ on: () => true });
            mockS3DirUploader = sinon.stub().returns({ on: () => true });

            sinon.stub(s3, 'createClient').returns({
                uploadFile: mockS3FileUploader,
                uploadDir: mockS3DirUploader,
            });
            sinon.stub(s3, 'getPublicUrl').returns('');
            fs.lstatSync.callsFake(filePath => ({
                isDirectory: () => filePath.indexOf('directory') !== -1,
            }));
        });

        afterEach(() => {
            mockS3DirUploader.reset();
            mockS3FileUploader.reset();
            fs.lstatSync.reset();
            s3.createClient.restore();
            s3.getPublicUrl.restore();
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

        it('should throw an error if ERROR_SHOTS_S3_REGION isnt set', () => {
            process.env.ERROR_SHOTS_S3_REGION = '';

            expect(() => push('s3')).to.throw('region');
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
                'im_a_directory',
            ];
            errorShotsList.getShots.returns(files);

            push('s3');

            errorShotsList.getShots.reset();

            files
                .filter(filePath => filePath.indexOf('directory') === -1)
                .forEach(filePath => {
                    expect(mockS3FileUploader).to.have.been.calledWith({
                        localFile: filePath,
                        s3Params: {
                            Bucket: process.env.ERROR_SHOTS_S3_BUCKET,
                            Key: filePath.split('/').pop(),
                        }
                    });
                });
        });

        it('should upload all folders given from errorshots getShots', () => {
            const files = [
                'a_regular_file',
                'one_directory',
                'two_directory',
            ];
            errorShotsList.getShots.returns(files);

            push('s3');

            errorShotsList.getShots.reset();

            files
                .filter(file => file.indexOf('directory') !== -1)
                .forEach(dirPath => {
                    expect(mockS3DirUploader).to.have.been.calledWith({
                        localDir: dirPath,
                        s3Params: {
                            Bucket: process.env.ERROR_SHOTS_S3_BUCKET,
                            Key: dirPath.split('/').pop(),
                            Prefix: dirPath,
                        },
                    });
                });
        });

        it('should log error when file upload emits an error', () => {
            const emitSpy = sinon.spy();
            mockS3FileUploader.returns({ on: emitSpy });
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

        it('should log info and URL when upload succeeded', () => {
            const emitSpy = sinon.spy();
            const region = 'eu-west-east-north-2';
            const files = ['first_file/path.txt', 'second_file.png'];
            const publicUrls = files
                .map(path => 'https://s3-bucket.com/'.concat(path));

            publicUrls.forEach((url, index) => {
                s3.getPublicUrl.onCall(index).returns(url);
            });

            mockS3FileUploader.returns({ on: emitSpy });
            errorShotsList.getShots.returns(files);
            process.env.ERROR_SHOTS_S3_BUCKET_REGION = region;

            push('s3');

            errorShotsList.getShots.reset();

            const completeListener = emitSpy.getCalls().filter(call => call.calledWith('end'));
            console.info.resetHistory();
            completeListener.forEach(listener => listener.args.pop()());

            expect(s3.getPublicUrl.callCount).to.equal(files.length);
            publicUrls.forEach((url, index) => {
                expect(s3.getPublicUrl.getCall(index).args[0]).to.equal(process.env.ERROR_SHOTS_S3_BUCKET);
                expect(s3.getPublicUrl.getCall(index).args[1]).to.equal(files[index].split('/').pop());
                expect(s3.getPublicUrl.getCall(index).args[2]).to.equal(process.env.ERROR_SHOTS_S3_REGION);
                expect(console.info).to.have.been.calledWithMatch(url);
            });
        });
    });
});
