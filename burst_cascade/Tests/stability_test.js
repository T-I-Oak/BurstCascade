(function () {
    const { Hex, HexMap, Game, AchievementManager } = window.BurstCascade;

    async function runStabilityTest() {
        console.log("--- Starting Test: System Stability Check ---");
        let results = [];

        function assert(condition, message) {
            if (condition) {
                console.log(`✅ [PASS] ${message}`);
                results.push({ message, status: 'pass' });
            } else {
                console.error(`❌ [FAIL] ${message}`);
                results.push({ message, status: 'fail' });
            }
        }

        // 1. Namespace & Constructor Checks
        assert(typeof Game === 'function', "Game should be a constructor function");
        assert(typeof AchievementManager === 'function', "AchievementManager should be a constructor function");
        assert(typeof HexMap === 'function', "HexMap should be a constructor function");

        // 2. Game Instance Initialization
        try {
            if (!window.game) {
                window.game = new Game();
            }
            const g = window.game;
            assert(g instanceof Game, "Global game instance should be initialized");

            // 3. HexMap Integrity (Recent Fix Verification)
            assert(g.map.players !== undefined, "HexMap should have 'players' property");
            assert(g.map.players[1] !== undefined, "HexMap players[1] should exist");
            assert(g.map.players[1].energy !== undefined, "Player 1 should have 'energy' property");
            assert(g.map.cores !== undefined, "HexMap should have 'cores' property");
            assert(typeof g.map.cores[1] === 'number', "HexMap.cores[1] should be a number");

            // 4. AchievementManager Integrity (Recent Fix Verification)
            const am = g.achievementManager;
            assert(am instanceof AchievementManager, "Game should have an AchievementManager instance");
            assert(typeof am.saveData === 'function', "AchievementManager should have 'saveData' method");
            assert(typeof am.resetData === 'function', "AchievementManager should have 'resetData' method");
            assert(typeof am.countHexes === 'function', "AchievementManager should have 'countHexes' method");

            // 5. Check missing variables (ReferenceError prevention)
            // Note: We can't easily check internal scope variables but we can verify the method that failed
            assert(typeof g.triggerBurst === 'function', "Game should have 'triggerBurst' method");

        } catch (e) {
            console.error(`Fatal Error during stability check: ${e.message}`);
            results.push({ message: `Fatal Error: ${e.message}`, status: 'fail' });
        }

        const failCount = results.filter(r => r.status === 'fail').length;
        if (failCount === 0) {
            console.log("🏆 ALL STABILITY CHECKS PASSED!");
        } else {
            console.error(`🚨 ${failCount} STABILITY CHECKS FAILED! Check console for details.`);
        }
    }

    // グローバルに登録
    window.runStabilityTest = runStabilityTest;

    // 単体スクリプトとして読み込まれた場合は自動実行
    if (document.currentScript && document.currentScript.src.includes('stability_test.js')) {
        runStabilityTest();
    }
})();
