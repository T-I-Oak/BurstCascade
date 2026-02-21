/**
 * Jest Browser Shim for Burst Cascade (v5)
 * Provides basic describe/test/expect functionality in the browser.
 */

(function (window) {
    // Shim global for browser environment compatibility
    window.global = window;

    // Stateful mock localStorage for tests
    const mockStorage = {};
    const lsMock = {
        clear: createLifeCycleMock('clear', () => {
            for (let k in mockStorage) delete mockStorage[k];
        }),
        setItem: createLifeCycleMock('setItem', (key, val) => {
            mockStorage[key] = String(val);
        }),
        getItem: createLifeCycleMock('getItem', (key) => {
            const val = mockStorage[key];
            return val === undefined ? null : val;
        }),
        removeItem: createLifeCycleMock('removeItem', (key) => {
            delete mockStorage[key];
        }),
        get length() { return Object.keys(mockStorage).length; }
    };

    function createLifeCycleMock(name, implementation) {
        const mockFn = function (...args) {
            mockFn.mock.calls.push(args);
            return implementation ? implementation(...args) : undefined;
        };
        mockFn.mock = { calls: [] };
        return mockFn;
    }

    // Aggressively shadow localStorage
    try {
        Object.defineProperty(window, 'localStorage', {
            value: lsMock,
            configurable: true,
            enumerable: true,
            writable: true
        });
    } catch (e) {
        window.localStorage = lsMock;
    }

    let suiteStack = [];
    let pendingTests = [];

    window.jest = {
        fn: implementation => createLifeCycleMock('fn', implementation),
        mock: () => window.jest,
        spyOn: (obj, method) => {
            const original = obj[method];
            const mock = createLifeCycleMock(method, original);
            obj[method] = mock;
            return {
                mockImplementation: fn => { mock.mockImplementation = fn; return this; },
                mockReturnValue: val => { mock.mockImplementation = () => val; return this; },
                mockClear: () => { mock.mock.calls = []; return this; },
                mockRestore: () => { obj[method] = original; }
            };
        },
        async waitForTests() {
            while (pendingTests.length > 0) {
                const testToRun = pendingTests.shift();
                await testToRun();
            }
        },
        clearAllMocks() {
            // Reset localStorage calls
            [lsMock.setItem, lsMock.getItem, lsMock.clear, lsMock.removeItem].forEach(m => {
                if (m.mock) m.mock.calls = [];
            });
        }
    };

    window.describe = function (name, fn) {
        const suite = {
            name,
            beforeEaches: [],
            afterEaches: [],
            parent: suiteStack[suiteStack.length - 1]
        };
        suiteStack.push(suite);
        console.log(`%c DESCRIBE: ${name} `, 'background: #1e293b; color: #38bdf8; font-weight: bold;');
        try {
            fn();
        } catch (error) {
            console.error(`Error in describe block "${name}":`, error.stack || error.message || error);
        }
        suiteStack.pop();
    };

    window.beforeEach = function (fn) {
        if (suiteStack.length > 0) {
            suiteStack[suiteStack.length - 1].beforeEaches.push(fn);
        }
    };

    window.afterEach = function (fn) {
        if (suiteStack.length > 0) {
            suiteStack[suiteStack.length - 1].afterEaches.push(fn);
        }
    };

    const runWithLifeCycle = async (suite, testFn) => {
        let lineage = [];
        let curr = suite;
        while (curr) {
            lineage.unshift(curr);
            curr = curr.parent;
        }

        for (let s of lineage) {
            for (let be of s.beforeEaches) await be();
        }

        try {
            await testFn();
        } finally {
            for (let s of lineage.slice().reverse()) {
                for (let ae of s.afterEaches) await ae();
            }
        }
    };

    window.test = window.it = function (name, fn) {
        const currentSuite = suiteStack[suiteStack.length - 1];
        const runTest = async () => {
            try {
                if (currentSuite) {
                    await runWithLifeCycle(currentSuite, fn);
                } else {
                    await fn();
                }
                console.log(`%c  ✅ [PASS] ${name} `, 'color: #10b981;');
            } catch (error) {
                console.log(`%c  ❌ [FAIL] ${name} `, 'color: #ef4444; font-weight: bold;');
                console.error(error.stack || Error(error).stack || error);
            }
        };
        pendingTests.push(runTest);
    };

    window.expect = function (actual) {
        const matchers = {
            toBe: (expected) => {
                if (actual !== expected) throw new Error(`Expected ${expected} but got ${actual}`);
            },
            toBeNull: () => {
                if (actual !== null) throw new Error(`Expected null but got ${actual}`);
            },
            toBeDefined: () => {
                if (actual === undefined) throw new Error(`Expected value to be defined`);
            },
            toBeFalsy: () => {
                if (actual) throw new Error(`Expected value to be falsy`);
            },
            toBeTruthy: () => {
                if (!actual) throw new Error(`Expected value to be truthy`);
            },
            toEqual: (expected) => {
                const sActual = JSON.stringify(actual);
                const sExpected = JSON.stringify(expected);
                if (sActual !== sExpected) throw new Error(`Expected ${sExpected} but got ${sActual}`);
            },
            toContain: (expected) => {
                if (!actual || !actual.includes || !actual.includes(expected)) {
                    throw new Error(`Expected ${actual} to contain ${expected}`);
                }
            },
            toHaveBeenCalled: () => {
                if (!actual || !actual.mock || actual.mock.calls.length === 0) {
                    const info = actual ? (actual.mock ? ' (Mock exists, length 0)' : ' (Not a mock function)') : ' (Actual is null/undefined)';
                    throw new Error(`Expected function to have been called${info}`);
                }
            },
            toHaveBeenCalledWith: (...expectedArgs) => {
                if (!actual || !actual.mock || actual.mock.calls.length === 0) {
                    throw new Error(`Expected function to have been called with ${JSON.stringify(expectedArgs)} but it was never called.`);
                }
                const wasCalledWith = actual.mock.calls.some(call => JSON.stringify(call) === JSON.stringify(expectedArgs));
                if (!wasCalledWith) {
                    throw new Error(`Expected function to have been called with ${JSON.stringify(expectedArgs)}, but calls were: ${JSON.stringify(actual.mock.calls)}`);
                }
            },
            toBeInstanceOf: (expected) => {
                if (!(actual instanceof expected)) {
                    const actualName = actual ? (actual.constructor ? actual.constructor.name : typeof actual) : String(actual);
                    throw new Error(`Expected instance of ${expected.name} but got ${actualName}`);
                }
            },
            toBeGreaterThan: (expected) => {
                if (!(actual > expected)) throw new Error(`Expected ${actual} to be > ${expected}`);
            },
            toBeLessThan: (expected) => {
                if (!(actual < expected)) throw new Error(`Expected ${actual} to be < ${expected}`);
            },
            toBeLessThanOrEqual: (expected) => {
                if (!(actual <= expected)) throw new Error(`Expected ${actual} to be <= ${expected}`);
            }
        };

        // Add 'not' proxy
        matchers.not = {};
        for (let key in matchers) {
            if (key === 'not') continue;
            matchers.not[key] = (...args) => {
                try {
                    matchers[key](...args);
                } catch (e) {
                    return; // Pass if original matcher failed
                }
                throw new Error(`Expected NOT ${key} with ${args.join(', ')} but it passed.`);
            };
        }

        return matchers;
    };

    window.addEventListener('error', e => console.error(`[Global Error] ${e.message} at ${e.filename}:${e.lineno}`));
    window.addEventListener('unhandledrejection', e => console.error('[Unhandled Promise Rejection]', e.reason));

})(window);
