/**
 * Jest Browser Shim for Burst Cascade
 * Provides basic describe/test/expect functionality in the browser.
 */

(function (window) {
    const results = {
        passed: 0,
        failed: 0,
        suites: []
    };

    let currentSuite = null;

    window.describe = function (name, fn) {
        const suite = { name, tests: [], passed: 0, failed: 0 };
        currentSuite = suite;
        results.suites.push(suite);
        console.log(`%c DESCRIBE: ${name} `, 'background: #1e293b; color: #38bdf8; font-weight: bold;');
        fn();
        currentSuite = null;
    };

    window.test = window.it = async function (name, fn) {
        const suite = currentSuite;
        const testResult = { name, status: 'running' };
        if (suite) suite.tests.push(testResult);

        try {
            await fn();
            testResult.status = 'pass';
            if (suite) suite.passed++;
            console.log(`%c  ✅ [PASS] ${name} `, 'color: #10b981;');
        } catch (error) {
            testResult.status = 'fail';
            testResult.error = error.message;
            if (suite) suite.failed++;
            console.log(`%c  ❌ [FAIL] ${name} `, 'color: #ef4444; font-weight: bold;');
            console.error(error);
        }
    };

    window.beforeEach = function (fn) {
        // Simple implementation: wrap each test
        const originalTest = window.test;
        window.test = window.it = async function (name, testFn) {
            return originalTest(name, async () => {
                await fn();
                await testFn();
            });
        };
    };

    window.expect = function (actual) {
        return {
            toBe: function (expected) {
                if (actual !== expected) {
                    throw new Error(`Expected ${expected} but got ${actual}`);
                }
            },
            toBeDefined: function () {
                if (actual === undefined) {
                    throw new Error(`Expected value to be defined`);
                }
            },
            toBeFalsy: function () {
                if (actual) {
                    throw new Error(`Expected value to be falsy`);
                }
            },
            toBeTruthy: function () {
                if (!actual) {
                    throw new Error(`Expected value to be truthy`);
                }
            },
            toEqual: function (expected) {
                const sActual = JSON.stringify(actual);
                const sExpected = JSON.stringify(expected);
                if (sActual !== sExpected) {
                    throw new Error(`Expected ${sExpected} but got ${sActual}`);
                }
            },
            toContain: function (expected) {
                if (!actual.includes(expected)) {
                    throw new Error(`Expected ${actual} to contain ${expected}`);
                }
            },
            toHaveBeenCalled: function () {
                if (!actual.mock || actual.mock.calls.length === 0) {
                    throw new Error(`Expected function to have been called`);
                }
            }
        };
    };

    window.jest = {
        fn: function (implementation) {
            const mockFn = function (...args) {
                mockFn.mock.calls.push(args);
                return implementation ? implementation(...args) : undefined;
            };
            mockFn.mock = { calls: [] };
            return mockFn;
        }
    };

})(window);
