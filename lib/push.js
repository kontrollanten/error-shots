const fs = require('fs');

function push(provider) {
    const errorshots = require('./list').getShots();

    console.info('Errorshots: Getting ready to push the following files', errorshots);

    switch (provider) {
        case 's3':
            pushS3(errorshots);
            break;
        case undefined:
            throw new Error('No provider is provided.');
        default:
            throw new Error(`Provider ${provider} is unknown.`);
    }
}

function pushS3(files) {
    const s3 = require('s3');
    const s3Credentials = {
        accessKeyId: process.env.ERROR_SHOTS_S3_ACCESS_KEY,
        secretAccessKey: process.env.ERROR_SHOTS_S3_SECRET_ACCESS_KEY,
        bucket: process.env.ERROR_SHOTS_S3_BUCKET,
        region: process.env.ERROR_SHOTS_S3_REGION,
    };

    Object.keys(s3Credentials)
        .filter(key => !s3Credentials[key])
        .some(key => {
            throw new Error(`S3 credential ${key} havent been defined.`);
        });

    console.info('Authenticating against AWS with given credentials...');

    const s3Client = s3.createClient({
        s3Options: {
            accessKeyId: s3Credentials.accessKeyId,
            secretAccessKey: s3Credentials.secretAccessKey,
            signatureVersion: 's3',
        },
    });

    console.info(`Initiating upload of ${files.length} files`);

    files.forEach(filePath => {
        const key = filePath.split('/').pop();
        const config = {
            s3Params: {
                Bucket: s3Credentials.bucket,
                Key: key,
            },
        };

        const onError = error => console.error(error);
        // https://docs.aws.amazon.com/AmazonS3/latest/dev/UsingBucket.html#access-bucket-intro
        const onEnd = () => {
            const url = s3.getPublicUrl(s3Credentials.bucket, key, s3Credentials.region);
            console.info(`${filePath} successfully uploaded at ${url}`);
        };

        let uploader;
        if (fs.lstatSync(filePath).isDirectory()) {
            uploader = s3Client.uploadDir(Object.assign({}, config, {
                localDir: filePath,
                s3Params: Object.assign({}, config.s3Params, {
                    Prefix: filePath,
                }),
            }));
        } else {
            uploader = s3Client.uploadFile(Object.assign(config, {
                localFile: filePath,
            }));
        }

        uploader.on('error', onError);
        uploader.on('end', onEnd);
    });
}

module.exports = {
    push
};
