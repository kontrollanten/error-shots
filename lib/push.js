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
        },
    });

    console.info(`Initiating upload of ${files.length}`);

    files.forEach(filePath => {
        const uploader = s3Client.uploadFile({
            localFile: filePath,
            s3Params: {
                Bucket: s3Credentials.bucket,
                Key: filePath.split('/').pop()
            },
        });

        uploader.on('error', error => {
            console.error(error);
        });

        uploader.on('end', () => {
            console.info(`${filePath} successfully uploaded`);
        });
    });
}

module.exports = {
    push
};
