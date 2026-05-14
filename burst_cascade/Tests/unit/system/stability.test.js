import { describe, test, expect, beforeEach } from 'vitest';
import { Game } from '../../../main.js';
import { HexMap } from '../../../map.js';
import { AchievementManager } from '../../../achievements.js';

describe('System Stability (Game & Managers)', () => {
    let game;

    beforeEach(() => {
        game = new Game();
    });

    test('Constructors should be defined', () => {
        expect(typeof Game).toBe('function');
        expect(typeof HexMap).toBe('function');
        expect(typeof AchievementManager).toBe('function');
    });

    test('Game instance should be available', () => {
        expect(game).toBeDefined();
        expect(game instanceof Game).toBe(true);
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
