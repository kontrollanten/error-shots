const chai = require('chai');
const expect = chai.expect;
const spies = require('chai-spies-next');
const proxyQuire = require('proxyquire');
const mockSpawnSync = require('../tests/mocks/mock-spawn-sync');

chai.use(spies);

describe('list', function () {
    describe('getShots', function () {
        it('should throw an error upon spawn stderr', function () {
            const errorMessage = 'This went really bad.';
            const { getShots } = proxyQuire('./list', mockSpawnSync({
                npm: () => {
                    return { error: errorMessage };
                }
            }));

            expect(getShots).to.throw(errorMessage);
        });

        it('should throw an error when find fails', () => {
            const errorMessage = 'This went even more bad.';
            const { getShots } = proxyQuire('./list', mockSpawnSync({
                npm: () => {
                    return {
                        stdout: '/path/to/cache',
                    };
                },
                find: () => {
                    return {
                        error: errorMessage,
                    };
                }
            }));

            expect(getShots).to.throw(errorMessage);
        });

        it('should print all the files within the npm cache logs directory', () => {
            const cachePath = '/path/to/cache';
            const files = '/error/logs';
            const { getShots } = proxyQuire('./list', mockSpawnSync({
                npm: () => {
                    return {
                        stdout: cachePath,
                    };
                },
                find: args => {
                    expect(args[0]).to.contain(cachePath);

                    return {
                        stdout: files,
                    };
                }
            }));

            expect(getShots()[0]).to.equal(files);
        });

        it('should list files specified in .errorshots file', () => {
            const errorshotsFileContents = 'deep/down/in/the/logs/*.log\nanother/path';
            const findMock = () => {
                return {
                    stdout: ''
                };
            };
            const findSpy = chai.spy(findMock);

            const { getShots } = proxyQuire('./list', Object.assign(mockSpawnSync({
                npm: () => {
                    return {
                        stdout: '/cache/path',
                    };
                },
                find: findSpy
            }), {
                fs: {
                    existsSync: () => true,
                    readFileSync: () => errorshotsFileContents,
                }
            }));

            getShots();

            errorshotsFileContents
                .split('\n')
                .forEach(pattern => {
                    expect(findSpy.__spy.calls[0][0]).to.contain(pattern);
                });

        });
    });
});