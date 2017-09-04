const { expect } = require('chai');
const proxyQuire = require('proxyquire');

describe('list', function () {
    describe('getShots', function () {
        it('should throw an error upon spawn stderr', function () {
            const errorMessage = 'This went really bad.';
            const { getShots } = proxyQuire('./list', {
                child_process: {
                    spawnSync: () => {
                        return {
                            error: errorMessage
                        };
                    }
                }
            });
    
            expect(getShots).to.throw(errorMessage);
        });

        it('should throw an error when ls fails', () => {
            const errorMessage = 'This went even more bad.';
            const { getShots } = proxyQuire('./list', {
                child_process: {
                    spawnSync: (cmd) => {
                        switch (cmd) {
                            case 'npm':
                                return {
                                    stdout: '/path/to/cache',
                                };
                            case 'ls':
                                return {
                                    error: errorMessage,
                                };
                        }
                    }
                }
            });

            expect(getShots).to.throw(errorMessage);
        });

        it('should print all the files within the npm cache logs directory', () => {
            const cachePath = '/path/to/cache';
            const files = '/error/logs';
            const { getShots } = proxyQuire('./list', {
                child_process: {
                    spawnSync: (cmd, args) => {
                        switch (cmd) {
                            case 'npm':
                                return {
                                    stdout: cachePath,
                                };
                            case 'ls':

                                expect(args[0]).to.contain(cachePath);

                                return {
                                    stdout: files,
                                };
                        }
                    }
                }
            });

            expect(getShots()).to.equal(files);
        });
    });
});