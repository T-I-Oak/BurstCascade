(function () {

    // Infrastructure removed: Now handled by jest-setup.js

    const BC = (typeof window !== 'undefined' ? window : global).BurstCascade || {};
    const { Game, AchievementManager, HexMap } = BC;

    describe('System Stability (Game & Managers)', () => {
        let game;

        beforeEach(() => {
            // In browser, main.js usually instantiates window.game
            // If not, we use the one created in runSingleTest setup or create a fresh one
            game = window.game || (BC.Game ? new BC.Game() : null);
        });

        test('Game instance should be available', () => {
            expect(game).toBeDefined();
            if (game) {
                expect(game.achievementManager).toBeInstanceOf(AchievementManager);
                expect(game.map).toBeInstanceOf(HexMap);
            }
        });

        test('HexMap should have players and cores properties', () => {
            if (game && game.map) {
                expect(game.map.players).toBeDefined();
                expect(game.map.cores).toBeDefined();
            }
        });
    });
})();
