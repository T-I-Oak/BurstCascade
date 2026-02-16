let AchievementManager;
let RangeStatItem;

if (typeof require !== 'undefined' && typeof process !== 'undefined' && typeof window === 'undefined') {
    // Node.js Standalone Mode
    const fs = require('fs');
    const path = require('path');
    const vm = require('vm');

    const sandbox = {
        window: {
            BurstCascade: {
                HexMap: class { constructor() { } },
                Layout: class { constructor() { } }
            }
        },
        console: console,
        localStorage: {
            getItem: () => null,
            setItem: () => null,
            removeItem: () => null
        },
        confirm: () => true
    };
    sandbox.window.self = sandbox.window;
    vm.createContext(sandbox);

    const code = fs.readFileSync(path.join(__dirname, '..', 'achievements.js'), 'utf8');
    vm.runInContext(code, sandbox);
    AchievementManager = sandbox.window.BurstCascade.AchievementManager;
    RangeStatItem = sandbox.window.BurstCascade.RangeStatItem;
} else {
    // Browser or Jest Mode
    const BC = window.BurstCascade || {};
    AchievementManager = BC.AchievementManager;
    RangeStatItem = BC.RangeStatItem;
}

function assert(condition, message, extra = "") {
    if (condition) {
        console.log(`✅ [PASS] ${message} ${extra}`);
    } else {
        console.error(`❌ [FAIL] ${message} ${extra}`);
        if (typeof process !== 'undefined' && process.exit) process.exit(1);
    }
}

console.log("--- Starting Behavioral Verification: Range Stats Framework v5.1 ---");

try {
    // ==========================================
    // TEST 1: RangeStatItem Basic Logic
    // ==========================================
    console.log("\nTEST 1: RangeStatItem Basic Logic");
    const ri = new RangeStatItem();
    ri.newGame(10);
    assert(ri.current === 10 && ri.min === 10 && ri.max === 10, "Initial state (10)");

    ri.update(5);
    assert(ri.current === 5 && ri.min === 5 && ri.max === 10, "Update to 5 (Min change)");

    ri.update(15);
    assert(ri.current === 15 && ri.min === 5 && ri.max === 15, "Update to 15 (Max change)");

    ri.update(8);
    assert(ri.current === 8 && ri.min === 5 && ri.max === 15, "Update to 8 (No range change)");

    // ==========================================
    // TEST 2: PlayerStats Integration & Diffs
    // ==========================================
    console.log("\nTEST 2: PlayerStats Integration & Diffs");
    const am = new AchievementManager();

    // Initial state simulation (e.g. game start with 3 cores each, 0 grids - actually grids start with 1 center?)
    am.startNewGame({ 1: 1, 2: 1 }, { 1: 3, 2: 3 });

    assert(am.stats[1].gridCount.current === 1, "P1 initial gridCount == 1");
    assert(am.stats[1].gridDiff.current === 0, "P1 initial gridDiff == 0");
    assert(am.stats[1].coreCount.current === 3, "P1 initial coreCount == 3");

    // Simulate move: P1 gains 2 grids, P2 loses 1 core
    // In main.js, _updateRangeStats would be called. Let's simulate its effect.
    const g1 = 3, g2 = 1, c1 = 3, c2 = 2;

    const s1 = am.stats[1];
    const s2 = am.stats[2];

    s1.gridCount.update(g1);
    s1.gridDiff.update(g1 - g2);
    s2.gridCount.update(g2);
    s2.gridDiff.update(g2 - g1);

    assert(s1.gridDiff.current === 2, "P1 gridDiff == 2");
    assert(s1.gridDiff.max === 2, "P1 gridDiff.max == 2");
    assert(s2.gridDiff.current === -2, "P2 gridDiff == -2");
    assert(s2.gridDiff.min === -2, "P2 gridDiff.min == -2");

    // Simulate P1 near defeat: grids = 1
    s1.gridCount.update(1);
    assert(s1.gridCount.min === 1, "P1 gridCount.min captured 1");

    console.log("\nALL RANGE STATS TESTS PASSED! 🏆");

} catch (e) {
    console.error("Fatal test error:");
    console.error(e);
    if (typeof process !== 'undefined' && process.exit) process.exit(1);
}
