[![Coverage Status](https://coveralls.io/repos/github/kontrollanten/errorshots/badge.svg?branch=master)](https://coveralls.io/github/kontrollanten/errorshots?branch=master)
# Error Shots - Send your error logs to the cloud

# Usage
## Installation
```
npm install errorshots --dev
```

## Configuration

### Amazon S3 credentials
To be able to upload your error shots to an Amazon S3 bucket you'll need to specify the following environment variables:

```
ERROR_SHOTS_S3_ACCESS_KEY
ERROR_SHOTS_S3_SECRET_ACCESS_KEY
ERROR_SHOTS_S3_BUCKET
```
### Error shots
If you've provided a .errorshots file in your project root, the errorshots will be fetched from there. By default Error Shots will look for error files in `$(npm config get cache)/_logs`.

```.errorshots
errorshot*.png
logs/*
```

## API

```
# Prints a list of all error logs found
$ errorshots list

# Push errorshots to AWS S3
$ errorshots push s3
```


## Usage in CI

### Travis

```yaml
on_failure:
    - errorshots push s3
```

# Contributing

1. Fork the repository
2. Create a new branch named after the feature or bug your adding/fixing
3. Implement your code with test cases added, describing what you've done
4. Run `npm run lint` and `npm run test`
5. Push your code
6. Make a pull request
