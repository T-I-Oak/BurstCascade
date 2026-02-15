const fs = require('fs');
const path = require('path');
const vm = require('vm');

const achievementsPath = path.join(__dirname, '../achievements.js');
const code = fs.readFileSync(achievementsPath, 'utf8');

const sandbox = {
    window: {},
    console: console,
    localStorage: {
        getItem: () => null,
        setItem: () => { }
    },
    confirm: () => false // Mock confirm
};

vm.createContext(sandbox);
vm.runInContext(code, sandbox);

const { AchievementManager, StatItem } = sandbox.window.BurstCascade || {};

if (!AchievementManager || !StatItem) {
    console.error("Classes not found in window.BurstCascade. Ensure StatItem is exported.");
    if (sandbox.window.BurstCascade) {
        console.log("Available keys:", Object.keys(sandbox.window.BurstCascade));
    }
    process.exit(1);
}

function assert(condition, msg) {
    if (condition) {
        console.log(`[PASS] ${msg}`);
    } else {
        console.error(`[FAIL] ${msg}`);
        process.exit(1);
    }
}

console.log("Starting Node.js Verification for Atomic Stats...");

// 1. Test StatItem
const stat = new StatItem();
stat.add(10);
assert(stat.action === 10, "StatItem.add updates action");
assert(stat.turn === 10, "StatItem.add updates turn");
assert(stat.game === 10, "StatItem.add updates game");
assert(stat.maxAction === 10, "StatItem.add updates maxAction");

stat.newAction();
assert(stat.action === 0, "StatItem.newAction resets action");
assert(stat.turn === 10, "StatItem.newAction preserves turn");
assert(stat.maxAction === 10, "StatItem.newAction preserves maxAction within turn");

stat.add(15);
assert(stat.action === 15, "Added 15 in new action");
assert(stat.maxAction === 15, "maxAction updated to 15 (new max)");
assert(stat.turn === 25, "Turn total is 10+15=25");

stat.newTurn();
assert(stat.turn === 0, "newTurn resets turn");
// maxAction logic: Implementation preserves it until newGame
assert(stat.maxAction === 15, "newTurn PRESERVES maxAction (Game Scope)");
assert(stat.game === 25, "Game total persists (25)");

// 2. Test AchievementManager Integration
const am = new AchievementManager();
assert(am.stats.actions instanceof StatItem, "stats.actions initialized");
assert(am.stats.bursts instanceof StatItem, "stats.bursts initialized");

am.startNewGame();
am.stats.actions.add(1);
assert(am.stats.actions.game === 1, "AM stats functional");

am.startNewAction();
assert(am.stats.actions.action === 0, "AM startNewAction works");

am.startNewTurn();
assert(am.stats.actions.turn === 0, "AM startNewTurn works");

console.log("Verification Complete. All tests passed.");
