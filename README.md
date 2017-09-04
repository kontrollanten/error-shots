# errorshots
## Send your error logs to the cloud

# Configure
By default errorshots will look for error files in `$(npm config get cache)/_logs`.

If you want to add additional patterns to look for, then add a `.errorshots` in the root of your project containing all the patterns.

```.errorshots
errorshot*.png
logs/*
```

# API

```
# Prints a list of all error logs found
$ errorshots list

# Push errorshots to AWS S3
$ errorshots push s3
```


# Usage in CI

## Travis

```yaml
on_failure:
    - errorshots push
```
