(function () {
    describe('Refactoring Smoke Tests', () => {
        let game;

        beforeEach(() => {
            // jest-setup.js will initialize window.BurstCascade and load main.js
            game = new window.BurstCascade.Game();
        });

        describe('Utility Methods (Current)', () => {
            test('adjustColor should correctly lighten/darken hex colors', () => {
                const Utils = window.BurstCascade.Utils;
                // Testing #000000 + 10 -> #0a0a0a
                expect(Utils.adjustColor('#000000', 10)).toBe('#0a0a0a');
                // Testing #ffffff - 10 -> #f5f5f5
                expect(Utils.adjustColor('#ffffff', -10).toLowerCase()).toBe('#f5f5f5');
            });
        });

        describe('SoundManager (Current)', () => {
            test('SoundManager should be instantiated in Game', () => {
                expect(game.sound).toBeDefined();
                // SoundManager is currently private to main.js IIFE, so we check properties instead
                expect(typeof game.sound.init).toBe('function');
            });

            test('SoundManager should have correct initial masterVolume', () => {
                // Ver 4.8.0 change: masterVolume default is 0.4
                expect(game.sound.masterVolume).toBe(0.4);
            });
        });

        describe('Game Structure', () => {
            test('Game should have required UI elements linked', () => {
                expect(game.canvas).not.toBeNull();
                expect(game.volumeSlider).not.toBeNull();
            });
        });
    });
})();
