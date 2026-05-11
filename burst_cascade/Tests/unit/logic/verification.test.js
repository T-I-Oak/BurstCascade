(function () {
    const BC = (typeof window !== 'undefined' ? window : global).BurstCascade || {};
    const { AchievementManager, Game } = BC;

    describe('Bug Fix Verification', () => {
        let am;

        beforeEach(() => {
            global.localStorage.clear();
            am = new AchievementManager();
        });

        describe('Achievements', () => {
            test('speed_run should have 30 turn threshold', () => {
                const speedRun = am.achievements.find(a => a.id === 'speed_run');
                expect(speedRun.description).toContain('30');
                
                // 12 turns (old limit) should pass
                expect(speedRun.condition({ turnCount: 12 })).toBe(true);
                // 25 turns (new limit) should pass
                expect(speedRun.condition({ turnCount: 25 })).toBe(true);
                // 30 turns should pass
                expect(speedRun.condition({ turnCount: 30 })).toBe(true);
                // 31 turns should fail
                expect(speedRun.condition({ turnCount: 31 })).toBe(false);
            });

            test('core_collector should use current core count as metric', () => {
                const coreCollector = am.achievements.find(a => a.id === 'core_collector');
                
                // Mock stats
                am.stats[1].coreCount.current = 6;
                am.stats[1].coreCount.max = 10;
                
                const metricValue = coreCollector.metric({});
                // Should be current (6), not max (10)
                expect(metricValue).toBe(6);
            });

            test('core_sniper and core_hunter conditions', () => {
                const sniper = am.achievements.find(a => a.id === 'core_sniper');
                const hunter = am.achievements.find(a => a.id === 'core_hunter');

                // Mock stats: 2 cores in one action
                am.stats[1].burstCore[2].maxAction = 2;
                am.stats[1].burstCore[2].maxTurn = 2;
                expect(sniper.condition({})).toBe(true);
                expect(hunter.condition({})).toBe(false);

                // Mock stats: 3 cores in one turn (across actions)
                am.stats[1].burstCore[2].maxTurn = 3;
                expect(hunter.condition({})).toBe(true);
            });
        });

        describe('Game Logic (Draw Detection)', () => {
            let game;
            beforeEach(() => {
                game = new Game();
                // Initialize map manually for testing
                game.map = {
                    mainHexes: [],
                    players: { 1: { energy: 0 }, 2: { energy: 0 } },
                    cores: { 1: 0, 2: 0 },
                    centers: {}
                };
                game.overlay = document.getElementById('overlay');
                game.gameOverContent = document.getElementById('game-over-content');
                game.aiLevelSelect = { querySelector: () => ({ dataset: { value: 'normal' } }) };
                game.sizeSelect = { querySelector: () => ({ dataset: { value: 'regular' } }) };
            });

            test('checkGameOverStatus should detect draw when both cores are 0', () => {
                // Mock mainHexes with 0 cores for both
                game.map.mainHexes = [
                    { owner: 1, isCore: false, hasFlag: false, isDisabled: false },
                    { owner: 2, isCore: false, hasFlag: false, isDisabled: false }
                ];
                
                const showGameOverSpy = jest.spyOn(game, 'showGameOver');
                game.checkGameOverStatus();
                
                expect(showGameOverSpy).toHaveBeenCalledWith(0);
            });

            test('getVictoryType should return DRAW for winner 0', () => {
                const type = game.getVictoryType(0);
                expect(type).toBe('DRAW');
            });
        });
    });
})();
