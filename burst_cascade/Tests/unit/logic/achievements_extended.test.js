(function () {
    const BC = (typeof window !== 'undefined' ? window : global).BurstCascade || {};
    const { AchievementManager } = BC;

    describe('AchievementManager Extended', () => {
        let am;

        beforeEach(() => {
            global.localStorage.clear();
            am = new AchievementManager();
        });

        test('should track best records (min/max) with victory condition', () => {
            // "speed_run" uses metric: game.turnCount, metricType: 'min', metricCondition: win
            const game1 = { winner: 1, turnCount: 20 };
            am.checkAchievements(game1, 'regular', 'normal');
            expect(am.data.progress.regular.normal.best.speed_run).toBe(20);

            const game2 = { winner: 1, turnCount: 15 };
            am.checkAchievements(game2, 'regular', 'normal');
            expect(am.data.progress.regular.normal.best.speed_run).toBe(15);

            const game3 = { winner: 2, turnCount: 5 }; // Loss with fewer turns
            am.checkAchievements(game3, 'regular', 'normal');
            expect(am.data.progress.regular.normal.best.speed_run).toBe(15); // Should stay 15 because it's a loss
        });

        test('should track cumulative total for suicide_victory', () => {
            // 1st suicide victory
            const game1 = { winner: 1, currentPlayer: 2, turnCount: 15 }; // currentPlayer 2 is the one who lost (suicided)
            am.checkAchievements(game1, 'regular', 'normal');
            
            let context = am.data.progress.regular.normal;
            expect(context.totalSuicideWins).toBe(1);
            expect(context.best.suicide_victory).toBe(1); // Assuming 'best' for suicide_victory tracks the count

            // 2nd suicide victory
            const game2 = { winner: 1, currentPlayer: 2, turnCount: 20 };
            am.checkAchievements(game2, 'regular', 'normal');
            
            context = am.data.progress.regular.normal;
            expect(context.totalSuicideWins).toBe(2);
            expect(context.best.suicide_victory).toBe(2);
        });

        test('should track minimum cores for Last Stand', () => {
            // "last_stand" now tracks min cores on win
            am.stats[1].coreCount.current = 3;
            am.checkAchievements({ winner: 1 }, 'regular', 'normal');
            expect(am.data.progress.regular.normal.best.last_stand).toBe(3);

            am.stats[1].coreCount.current = 1;
            am.checkAchievements({ winner: 1 }, 'regular', 'normal');
            expect(am.data.progress.regular.normal.best.last_stand).toBe(1);

            am.stats[1].coreCount.current = 2;
            am.checkAchievements({ winner: 1 }, 'regular', 'normal');
            expect(am.data.progress.regular.normal.best.last_stand).toBe(1); // Min should stay 1
        });

        test('should track Marathon (win) and Hard-fought (loss) separately', () => {
            // Marathon (endurance_win) tracks max turns on win
            am.checkAchievements({ winner: 1, turnCount: 70 }, 'regular', 'normal');
            expect(am.data.progress.regular.normal.best.endurance_win).toBe(70);
            expect(am.data.progress.regular.normal.best.honorable_defeat).toBeUndefined();

            // Hard-fought (honorable_defeat) tracks max turns on loss
            am.checkAchievements({ winner: 2, turnCount: 80 }, 'regular', 'normal');
            expect(am.data.progress.regular.normal.best.honorable_defeat).toBe(80);
            expect(am.data.progress.regular.normal.best.endurance_win).toBe(70); // Should stay 70

            // Loss with 100 turns shouldn't update Marathon
            am.checkAchievements({ winner: 2, turnCount: 100 }, 'regular', 'normal');
            expect(am.data.progress.regular.normal.best.endurance_win).toBe(70);
            expect(am.data.progress.regular.normal.best.honorable_defeat).toBe(100);
        });

        test('should track total losses and draws', () => {
            am.checkAchievements({ winner: 2 }, 'regular', 'normal'); // Loss
            am.checkAchievements({ winner: 2 }, 'regular', 'normal'); // Loss
            am.checkAchievements({ winner: 0 }, 'regular', 'normal'); // Draw

            expect(am.data.progress.regular.normal.totalLosses).toBe(2);
            expect(am.data.progress.regular.normal.totalDraws).toBe(1);
            expect(am.data.progress.regular.normal.winStreak).toBe(0);
        });

        test('should update best records even if achievement is already unlocked', () => {
            // Unlock "speed_run" (<= 12 turns)
            am.checkAchievements({ winner: 1, turnCount: 10 }, 'regular', 'normal');
            expect(am.data.progress.regular.normal.achievements.speed_run).toBe(true);
            expect(am.data.progress.regular.normal.best.speed_run).toBe(10);

            // Achieve better score later
            am.checkAchievements({ winner: 1, turnCount: 8 }, 'regular', 'normal');
            expect(am.data.progress.regular.normal.best.speed_run).toBe(8);
        });

        test('getDisplayData should include best records', () => {
            am.checkAchievements({ winner: 1, turnCount: 10 }, 'regular', 'normal');
            const data = am.getDisplayData('regular');
            const speedRun = data.find(a => a.id === 'speed_run');
            
            expect(speedRun.best.normal).toBe(10);
            expect(speedRun.best.easy).toBeUndefined();
        });
    });
})();
