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

        test('Constructors and Namespaces should be defined', () => {
            const BC = (typeof window !== 'undefined' ? window : global).BurstCascade || {};
            expect(typeof BC.Game).toBe('function');
            expect(typeof BC.HexMap).toBe('function');
            expect(typeof BC.AchievementManager).toBe('function');
        });

        test('Game instance should be available', () => {
            expect(game).toBeDefined();
            expect(game instanceof BC.Game).toBe(true);
        });

        test('HexMap should have players, cores and energy properties', () => {
            expect(game.map.players).toBeDefined();
            expect(game.map.players[1]).toBeDefined();
            expect(game.map.players[1].energy).toBeDefined();
            expect(game.map.cores).toBeDefined();
            expect(typeof game.map.cores[1]).toBe('number');
        });

        test('AchievementManager should have required methods', () => {
            const am = game.achievementManager;
            expect(am).toBeDefined();
            expect(typeof am.saveData).toBe('function');
            expect(typeof am.resetData).toBe('function');
            expect(typeof am.countHexes).toBe('function');
        });

        test('Game should have triggerBurst method', () => {
            expect(typeof game.triggerBurst).toBe('function');
        });
    });
})();
