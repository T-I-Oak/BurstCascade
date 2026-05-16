import { describe, test, expect, beforeEach, vi } from 'vitest';
import { AchievementManager } from '../../src/achievements.js';

describe('Achievement System (achievements.js)', () => {
    let am;

    beforeEach(() => {
        localStorage.clear();
        vi.spyOn(Storage.prototype, 'setItem');
        am = new AchievementManager();
    });

    describe('Initialization', () => {
        test('should load default data', () => {
            expect(am.data.progress.regular.normal.totalWins).toBe(0);
            expect(am.data.progress.regular.normal.winStreak).toBe(0);
        });
    });

    describe('Win/Loss Tracking', () => {
        test('checkAchievements should unlock "win" when winner is 1', () => {
            const gameMock = { winner: 1, currentPlayer: 1, turnCount: 20 };
            const unlocks = am.checkAchievements(gameMock, 'regular', 'normal');

            expect(unlocks.some(a => a.id === 'win')).toBe(true);
            expect(am.data.progress.regular.normal.achievements.win).toBe(true);
            expect(am.data.progress.regular.normal.totalWins).toBe(1);
            expect(am.data.progress.regular.normal.winStreak).toBe(1);
        });

        test('checkAchievements should track win streaks', () => {
            const gameMock = { winner: 1, currentPlayer: 1, turnCount: 20 };
            am.checkAchievements(gameMock, 'regular', 'normal');
            am.checkAchievements(gameMock, 'regular', 'normal');

            expect(am.data.progress.regular.normal.winStreak).toBe(2);

            // Loss resets streak
            am.checkAchievements({ winner: 2 }, 'regular', 'normal');
            expect(am.data.progress.regular.normal.winStreak).toBe(0);
        });
    });

    describe('Achievement Conditions (v5.2 Behavioral Verification)', () => {
        test('Suicide victory condition (winner=1, current=2)', () => {
            const suicideAch = am.achievements.find(a => a.id === 'suicide_victory');
            const gameMock = { winner: 1, currentPlayer: 2 }; 
            expect(suicideAch.condition(gameMock)).toBe(true);
        });

        test('War Veteran (Lost 5 cores but won)', () => {
            am.stats[2].neutralized[1].game = 5; 
            const gameMock = { winner: 1, currentPlayer: 1 };
            const veteranAch = am.achievements.find(a => a.id === 'war_veteran');
            expect(veteranAch.condition(gameMock)).toBe(true);
        });

        test('Saboteur (Destroyed 5 enemy cores)', () => {
            am.stats[1].neutralized[2].game = 5;
            const gameMock = { winner: 1, currentPlayer: 1 };
            const saboteurAch = am.achievements.find(a => a.id === 'saboteur');
            expect(saboteurAch.condition(gameMock)).toBe(true);
        });

        test('Grid Blaster (4 grid bursts in 1 action)', () => {
            am.stats[1].burstGrid.both.maxAction = 4;
            const gridBlasterAch = am.achievements.find(a => a.id === 'grid_blaster');
            expect(gridBlasterAch.condition({ winner: 1 })).toBe(true);
        });
    });

    describe('Extended Records', () => {
        test('should track best records (min turns for speed_run)', () => {
            const game1 = { winner: 1, turnCount: 20 };
            am.checkAchievements(game1, 'regular', 'normal');
            expect(am.data.progress.regular.normal.best.speed_run).toBe(20);

            const game2 = { winner: 1, turnCount: 15 };
            am.checkAchievements(game2, 'regular', 'normal');
            expect(am.data.progress.regular.normal.best.speed_run).toBe(15);
        });

        test('should track cumulative total for suicide_victory', () => {
            const game1 = { winner: 1, currentPlayer: 2, turnCount: 15 };
            am.checkAchievements(game1, 'regular', 'normal');
            expect(am.data.progress.regular.normal.totalSuicideWins).toBe(1);

            const game2 = { winner: 1, currentPlayer: 2, turnCount: 20 };
            am.checkAchievements(game2, 'regular', 'normal');
            expect(am.data.progress.regular.normal.totalSuicideWins).toBe(2);
        });
    });
});
