import { describe, test, expect, beforeEach, vi } from 'vitest';
import { Game } from '../../../main.js';

describe('Renderer Module', () => {
    let game;
    let renderer;

    beforeEach(() => {
        game = new Game();
        renderer = game.renderer;
    });

    test('Renderer should be initialized with a context', () => {
        expect(renderer.ctx).toBeDefined();
        expect(renderer.ctx).not.toBeNull();
    });

    test('drawHex should accept override context and layout', () => {
        const mockCtx = {
            save: vi.fn(),
            restore: vi.fn(),
            beginPath: vi.fn(),
            moveTo: vi.fn(),
            lineTo: vi.fn(),
            closePath: vi.fn(),
            stroke: vi.fn(),
            fill: vi.fn(),
            fillText: vi.fn(),
            translate: vi.fn(),
            scale: vi.fn(),
            rotate: vi.fn(),
            setTransform: vi.fn(),
            createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
            createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
            measureText: vi.fn().mockReturnValue({ width: 0 })
        };
        const mockLayout = game.layout;
        const hex = game.map.hexes[0];
        hex.visualHeight = 1;

        // Should not throw and should use the provided context
        renderer.drawHex(hex, mockCtx, mockLayout);
        expect(mockCtx.save).toHaveBeenCalled();
        expect(mockCtx.restore).toHaveBeenCalled();
    });

    test('drawHexNumber should handle text rendering', () => {
        const mockCtx = {
            fillText: vi.fn(),
            save: vi.fn(),
            restore: vi.fn(),
            beginPath: vi.fn(),
            closePath: vi.fn(),
            setTransform: vi.fn(),
            measureText: vi.fn().mockReturnValue({ width: 0 })
        };
        const color = { top: '#ff0000', side: '#aa0000', border: '#550000', highlight: '#ff5555' };

        // drawHexNumber(tx, ty, h, color, value, overrideCtx, overrideLayout)
        renderer.drawHexNumber(100, 100, 10, color, 5, mockCtx, game.layout);
        expect(mockCtx.fillText).toHaveBeenCalled();
    });

    test('drawCoinToss should not throw in any phase', () => {
        const phases = ['gathering', 'fusion', 'burst', 'stabilized'];
        game.startGame();

        phases.forEach(phase => {
            game.coinToss.phase = phase;
            game.coinToss.timer = 500;
            if (phase === 'stabilized') game.coinToss.ripple = 0.5;

            expect(() => {
                renderer.drawCoinToss();
            }).not.toThrow();
        });
    });
});
