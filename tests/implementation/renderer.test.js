import { describe, test, expect, beforeEach, vi } from 'vitest';
import { Game } from '../../src/main.js';

describe('Renderer Module', () => {
    let game;
    let renderer;

    beforeEach(() => {
        document.body.innerHTML = `
            <canvas id="game-canvas"></canvas>
            <div id="overlay"></div>
            <div id="help-btn"></div>
            <div id="start-help-btn"></div>
            <div id="help-content"></div>
            <div id="mode-selection-content"></div>
            <div id="game-over-content"></div>
            <div id="ai-thinking-overlay"></div>
            <div id="version-display"></div>
            <div id="player-select">
                <div class="toggle-btn selected" data-value="pvc"></div>
                <div class="toggle-btn" data-value="pvp"></div>
            </div>
            <div id="size-select">
                <div class="toggle-btn selected" data-value="regular"></div>
                <div class="toggle-btn" data-value="mini"></div>
            </div>
            <div id="ai-level-select">
                <div class="toggle-btn selected" data-value="normal"></div>
            </div>
            <div id="ai-level-group"></div>
            <input id="volume-slider" type="range" value="50">
            <div id="volume-value"></div>
            <div id="game-start-btn"></div>
            <div id="restart-btn"></div>
            <div id="help-close-btn"></div>
            <div id="achievements-btn"></div>
            <div id="achievements-content"></div>
            <div id="achievements-back-btn"></div>
            <div id="achievement-reset-btn"></div>
            <table id="achievements-table"><tbody></tbody></table>
            <div id="achievement-percent"></div>
            <div id="share-btn"></div>
            <div id="copyright-container"></div>
        `;
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

        renderer.drawHex(hex, mockCtx, mockLayout);
        expect(mockCtx.save).toHaveBeenCalled();
        expect(mockCtx.restore).toHaveBeenCalled();
    });
});
