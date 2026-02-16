// Load dependencies (Environment-aware)
if (typeof require !== 'undefined') {
    const fs = require('fs');
    const path = require('path');
    const code = fs.readFileSync(path.resolve(__dirname, '../../achievements.js'), 'utf8');
    eval(code);
}

const { AchievementManager } = window.BurstCascade || global.BurstCascade || {};

describe('AchievementManager', () => {
    let am;

    beforeEach(() => {
        global.localStorage.clear();
        am = new AchievementManager();
    });

    test('initialization should load default data', () => {
        expect(am.data.totalWins).toBe(0);
        expect(am.data.winStreak).toBe(0);
        expect(am.data.progress.regular).toBeDefined();
    });

    test('checkAchievements should unlock "win" when winner is 1', () => {
        const gameMock = { winner: 1, currentPlayer: 1, turnCount: 20 };
        const unlocks = am.checkAchievements(gameMock, 'regular', 'normal');

        expect(unlocks.some(a => a.id === 'win')).toBe(true);
        expect(am.data.progress.regular.normal.win).toBe(true);
        expect(am.data.totalWins).toBe(1);
        expect(am.data.winStreak).toBe(1);
    });

    test('checkAchievements should track win streaks', () => {
        const gameMock = { winner: 1, currentPlayer: 1, turnCount: 20 };
        am.checkAchievements(gameMock, 'regular', 'normal');
        am.checkAchievements(gameMock, 'regular', 'normal');

        expect(am.data.winStreak).toBe(2);

        // Loss resets streak
        am.checkAchievements({ winner: 2 }, 'regular', 'normal');
        expect(am.data.winStreak).toBe(0);
    });

    test('suicide_victory condition', () => {
        const suicideAch = am.achievements.find(a => a.id === 'suicide_victory');
        const gameMock = { winner: 1, currentPlayer: 2 }; // AI turn
        expect(suicideAch.condition(gameMock)).toBe(true);
    });

    test('resetData should clear progress', () => {
        am.data.totalWins = 10;
        am.resetData();
        expect(am.data.totalWins).toBe(0);
        expect(global.localStorage.setItem).toHaveBeenCalled();
    });
});
