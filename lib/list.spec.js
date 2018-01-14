const chai = require('chai');
const expect = chai.expect;
const proxyQuire = require('proxyquire');
const mockSpawnSync = require('../tests/mocks/mock-spawn-sync');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');

chai.use(sinonChai);

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

        it('should not scan paths in .errorshots whom don\'t contain a wildcard', () => {
            const wildcardedPaths = ['look-here/*', 'and-*-here.log'];
            const nonWildcardPaths = ['but-also-here'];

            const findSpy = sinon.stub().returns({ stdout: '' });

            const { getShots } = proxyQuire('./list', Object.assign(mockSpawnSync({
                find: findSpy
            }), {
                fs: {
                    existsSync: () => true,
                    readFileSync: () => [...wildcardedPaths, ...nonWildcardPaths].join('\n'),
                }
            }));

            getShots();

            findSpy.firstCall.args.pop()
                .filter(findArg => findArg.indexOf('-type') === -1)
                .filter(findArg => findArg !== 'f')
                .forEach(findArg => {
                    expect(wildcardedPaths).to.not.contain(findArg);
                    expect(nonWildcardPaths).to.contain(findArg);
                });
        });

        it('should list files specified in .errorshots file concated with scanned files', () => {
            const filesListedInErrorshots = ['deep/down/in/the/logs/*.log', 'another/path'];
            const errorshotsFileContents = filesListedInErrorshots.join('\n');
            const scannedFiles = ['i_am_scanned', 'with_find_cmd'];
            const findSpy = sinon.stub().returns({ stdout: scannedFiles.join('\n') });

            const { getShots } = proxyQuire('./list', Object.assign(mockSpawnSync({
                find: findSpy
            }), {
                fs: {
                    existsSync: () => true,
                    readFileSync: () => errorshotsFileContents,
                }
            }));

            const files = getShots();

            expect(files).to.eql([
                ...scannedFiles,
                ...filesListedInErrorshots.filter(path => path.indexOf('*') === -1),
            ]);

        });

        it('should trim empty rows', () => {
            const errorshotsFileContents = '\ndeep/down/in/the/logs/*.log\n\n\nanother/path\n';
            const findSpy = sinon.stub().returns({
                stdout: '',
            });

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

            findSpy.getCalls()
                .map(call => call.args.pop())
                .reduce((a, b) => a.concat(b), [])
                .forEach(row => {
                    expect(row).to.not.be.empty;
                });
        });
    });
});
