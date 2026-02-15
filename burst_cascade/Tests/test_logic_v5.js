const fs = require('fs');
const path = require('path');
const vm = require('vm');

// 1. Setup Sandbox Context
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

// 2. Load Logic File
const code = fs.readFileSync(path.join(__dirname, '..', 'achievements.js'), 'utf8');
vm.runInContext(code, sandbox);

const { AchievementManager } = sandbox.window.BurstCascade;

function assert(condition, message, extra = "") {
    if (condition) {
        console.log(`✅ [PASS] ${message} ${extra}`);
    } else {
        console.error(`❌ [FAIL] ${message} ${extra}`);
        process.exit(1);
    }
}

console.log("--- Starting Behavioral Verification: Achievement Framework v5 ---");

try {
    const am = new AchievementManager();
    am.resetData();

    // ==========================================
    // TEST 1: Player Segregation (Px Array)
    // ==========================================
    console.log("\nTEST 1: Stat Segregation (P1 vs P2)");

    am.stats[1].actions.add(3);
    assert(am.stats[1].actions.game === 3, "P1 actions.game == 3", `(Actual: ${am.stats[1].actions.game})`);
    assert(am.stats[2].actions.game === 0, "P2 actions.game == 0", `(Actual: ${am.stats[2].actions.game})`);

    am.stats[1].neutralized[2].add(1);
    assert(am.stats[1].neutralized[2].game === 1, "P1 neut P2 == 1");
    assert(am.stats[1].neutralized[1].game === 0, "P1 neut P1 == 0");

    // ==========================================
    // TEST 2: Scopes & Resets
    // ==========================================
    console.log("\nTEST 2: Scope & Reset Management");

    am.stats[1].burstGrid.both.add(4);
    assert(am.stats[1].burstGrid.both.action === 4, "Initial action count is 4");

    am.startNewAction();
    assert(am.stats[1].burstGrid.both.action === 0, "Action resets after startNewAction()");
    assert(am.stats[1].burstGrid.both.maxAction === 4, "maxAction == 4");

    am.stats[1].burstGrid.both.add(2);
    am.startNewAction();
    assert(am.stats[1].burstGrid.both.maxAction === 4, "maxAction remains 4 (Peak check)");
    assert(am.stats[1].burstGrid.both.game === 6, "Total game count is 6");

    am.startNewTurn();
    assert(am.stats[1].burstGrid.both.turn === 0, "Turn scope resets");
    assert(am.stats[1].burstGrid.both.maxTurn === 6, "maxTurn == 6", `(Actual: ${am.stats[1].burstGrid.both.maxTurn})`);

    // ==========================================
    // TEST 3: Achievement Conditions
    // ==========================================
    console.log("\nTEST 3: Condition Evaluation");

    am.stats[1].neutralized[2].game = 5;
    const gameMock = {
        turnCount: 10,
        winner: 1,
        currentPlayer: 2
    };
    am.stats[1].neutralized[1].game = 0;
    am.stats[2].rewardCore.game = 0;

    am.checkAchievements(gameMock, 'regular', 'easy');

    const progress = am.data.progress['regular']['easy'];
    assert(progress['saboteur'] === true, "'saboteur' (p1.neut[2] >= 5)");
    assert(progress['speed_run'] === true, "'speed_run' (turn <= 12)");
    assert(progress['unscathed'] === true, "'unscathed' (p1.neut[1] == 0)");
    assert(progress['core_shutdown'] === true, "'core_shutdown' (p2.reward == 0)");
    assert(progress['suicide_victory'] === true, "'suicide_victory' (Win on AI turn)");

    console.log("\nALL BEHAVIORAL TESTS PASSED! 🏆");

} catch (e) {
    console.error("Fatal test error:");
    console.error(e);
    process.exit(1);
}
