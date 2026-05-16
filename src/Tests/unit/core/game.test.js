import { describe, test, expect, beforeEach } from 'vitest';
import { Game } from '../../../main.js';
import { Utils } from '../../../utils.js';

describe('Refactoring Smoke Tests', () => {
    let game;

    beforeEach(() => {
        game = new Game();
    });

    describe('Utility Methods (Current)', () => {
        test('adjustColor should correctly lighten/darken hex colors', () => {
            // Testing #000000 + 10 -> #0a0a0a
            expect(Utils.adjustColor('#000000', 10)).toBe('#0a0a0a');
            // Testing #ffffff - 10 -> #f5f5f5
            expect(Utils.adjustColor('#ffffff', -10).toLowerCase()).toBe('#f5f5f5');
        });
    });

    describe('SoundManager (Current)', () => {
        test('SoundManager should be instantiated in Game', () => {
            expect(game.sound).toBeDefined();
            expect(typeof game.sound.init).toBe('function');
        });

        test('SoundManager should have correct initial masterVolume', () => {
            // masterVolume default is 0.5
            expect(game.sound.masterVolume).toBe(0.5);
        });
    });

    describe('Game Structure', () => {
        test('Game should have required UI elements linked', () => {
            expect(game.canvas).not.toBeNull();
            expect(game.volumeSlider).not.toBeNull();
        });
    });
});
