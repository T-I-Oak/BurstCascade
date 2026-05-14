import { describe, test, expect, beforeEach } from 'vitest';
import { Game } from '../../../main.js';

describe('Game Initialization and Reset Tests', () => {
    let game;

    beforeEach(() => {
        game = new Game();
    });

    test('startGame should reset cursor, hover, and visual states', () => {
        // 状態を汚染
        game.hoveredHex = { id: 'test-hex' };
        game.selectedHex = { id: 'test-hex' };
        game.hoveredNeighbors = [{ id: 'neighbor-hex' }];
        game.lastMoveHex = { id: 'test-hex' };
        game.effects = [{ type: 'particle' }];

        // ゲーム開始
        game.startGame();

        // リセットされていることを確認
        expect(game.hoveredHex).toBeNull();
        expect(game.selectedHex).toBeNull();
        expect(game.hoveredNeighbors).toEqual([]);
        expect(game.lastMoveHex).toBeNull();
        expect(game.effects).toEqual([]);
    });

    test('resetToTitle should reset cursor, hover, and visual states', () => {
        // 状態を汚染
        game.hoveredHex = { id: 'test-hex' };
        game.selectedHex = { id: 'test-hex' };
        game.lastMoveHex = { id: 'test-hex' };
        game.effects = [{ type: 'particle' }];

        // タイトルへ戻る
        game.resetToTitle();

        // リセットされていることを確認
        expect(game.hoveredHex).toBeNull();
        expect(game.selectedHex).toBeNull();
        expect(game.lastMoveHex).toBeNull();
        expect(game.effects).toEqual([]);
    });
});
