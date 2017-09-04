const { spawnSync } = require('child_process');

function getShots() {
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
    
    const npmLogsPath = npmConfigCache.stdout
        .replace('\n', '')
        .concat('/_logs');

    const lsShots = spawnSync('ls', [npmLogsPath], {
        encoding: 'utf8',
    });

    if (lsShots.error) {
        throw new Error(lsShots.error.toString());
    }

    return lsShots.stdout;
}

module.exports = {
    getShots,
};
