const chai = require('chai');
const expect = chai.expect;
const push = require('./push').push;

describe('push', () => {
    it('should throw an error if an unknown provider is passed', () => {
        expect(() => push('who am i')).to.throw('is unknown');
    });

    it('should throw an error if no provider is passed', () => {
        expect(push).to.throw('No provider');
    });

    describe('s3', () => {
        beforeEach(() => {
            process.env.ERROR_SHOTS_S3_ACCESS_KEY = 'access_key';
            process.env.ERROR_SHOTS_S3_SECRET_ACCESS_KEY = 'secret';
            process.env.ERROR_SHOTS_S3_BUCKET = 'bucket';
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
    });
});
