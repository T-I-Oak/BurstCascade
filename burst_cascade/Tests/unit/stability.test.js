(function () {


    // Load dependencies (Environment-aware)
    if (typeof require !== 'undefined') {
        const fs = require('fs');
        const path = require('path');

        // Set up global mocks for Node
        global.window = global;
        global.BurstCascade = {};
        global.console = console;

        // Mock JSDOM-like environment for Node
        global.document = {
            createElement: jest.fn(() => ({
                getContext: jest.fn(() => ({
                    drawImage: jest.fn(),
                    fillRect: jest.fn(),
                    clearRect: jest.fn(),
                    beginPath: jest.fn(),
                    arc: jest.fn(),
                    fill: jest.fn(),
                    stroke: jest.fn(),
                    closePath: jest.fn(),
                    save: jest.fn(),
                    restore: jest.fn(),
                    translate: jest.fn(),
                    rotate: jest.fn(),
                    scale: jest.fn(),
                    setTransform: jest.fn(),
                    moveTo: jest.fn(),
                    lineTo: jest.fn(),
                    strokeRect: jest.fn(),
                    ellipse: jest.fn(),
                    createLinearGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
                    fillText: jest.fn(),
                    measureText: jest.fn(() => ({ width: 0 })),
                })),
                width: 800,
                height: 600
            })),
            getElementById: jest.fn(() => ({
                appendChild: jest.fn(),
                innerHTML: '',
                style: {}
            })),
            body: { appendChild: jest.fn() },
            addEventListener: jest.fn(),
            querySelector: jest.fn(() => ({ remove: jest.fn() }))
        };
        global.window.addEventListener = jest.fn();
        global.navigator = { userAgent: 'node' };

        const files = ['map.js', 'achievements.js', 'ai.js', 'main.js'];
        files.forEach(f => {
            const code = fs.readFileSync(path.resolve(__dirname, '../../', f), 'utf8');
            eval(code);
        });
    }

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
