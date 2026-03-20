(function () {
    const BC = (typeof window !== 'undefined' ? window : global).BurstCascade || {};
    const { AchievementManager } = BC;

    describe('AchievementManager Extended', () => {
        let am;

        beforeEach(() => {
            global.localStorage.clear();
            am = new AchievementManager();
        });

        test('should track best records (min/max)', () => {
            // "speed_run" uses metric: game.turnCount, metricType: 'min'
            const game1 = { winner: 1, turnCount: 20 };
            am.checkAchievements(game1, 'regular', 'normal');
            expect(am.data.progress.regular.normal.best.speed_run).toBe(20);

            const game2 = { winner: 1, turnCount: 15 };
            am.checkAchievements(game2, 'regular', 'normal');
            expect(am.data.progress.regular.normal.best.speed_run).toBe(15);

            const game3 = { winner: 1, turnCount: 25 };
            am.checkAchievements(game3, 'regular', 'normal');
            expect(am.data.progress.regular.normal.best.speed_run).toBe(15); // Should remain 15 (min)

            // "win" uses metric: context.totalWins, metricType: 'max'
            expect(am.data.progress.regular.normal.best.win).toBe(3);
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
