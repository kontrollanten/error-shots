const { spawnSync } = require('child_process');
const fs = require('fs');

function getShots() {
    const npmLogsPath = getNpmLogsPath();
    const customPaths = getCustomLogPatterns();
    const findArgs = [npmLogsPath].concat(...customPaths, '-type', 'f');

    const findShots = spawnSync('find', findArgs, {
        encoding: 'utf8',
        shell: true
    });

    if (findShots.error) {
        throw new Error(findShots.error.toString());
    }

    return findShots.stdout
        .split('\n');
}

function getNpmLogsPath() {
    const npmConfigCache = spawnSync('npm', [
        'config',
        'get',
        'cache'
    ], {
        encoding: 'utf8'
    });

    if (npmConfigCache.error) {
        throw new Error(npmConfigCache.error.toString());
    }

    return npmConfigCache.stdout
        .replace('\n', '')
        .concat('/_logs');
}

function getCustomLogPatterns() {
    const path = process.cwd().concat('/.errorshots');

    if (!fs.existsSync(path)) {
        return '';
    }

    return fs
        .readFileSync(path, {
            encoding: 'utf8',
        })
        .split(/\n/)
        .filter(row => !!row);
}

module.exports = {
    getShots,
};
