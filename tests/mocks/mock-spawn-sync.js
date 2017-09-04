function mockSpawnSync(cbTree) {
    return {
        child_process: {
            spawnSync: (cmd, args) => {
                return cbTree[cmd](args);
            }
        }
    };
}

module.exports = mockSpawnSync;