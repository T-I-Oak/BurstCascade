import { describe, test, expect, beforeEach, vi } from 'vitest';
import { Game } from '../../src/main.js';
import { drawLabel } from '../../src/rendererLabels.js';

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
                <div class="toggle-btn" data-value="regular"></div>
                <div class="toggle-btn selected" data-value="mini"></div>
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
            canvas: document.createElement('canvas'),
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

    test('drawHexNumber should use explicit render DPR for non-main canvases', () => {
        const targetCanvas = document.createElement('canvas');
        const mockCtx = {
            canvas: targetCanvas,
            __burstCascadeDpr: 2,
            save: vi.fn(),
            restore: vi.fn(),
            setTransform: vi.fn(),
            fillText: vi.fn()
        };

        renderer.drawHexNumber(10, 20, 0, { top: '#ffffff' }, 3, mockCtx, game.layout);

        expect(mockCtx.setTransform).toHaveBeenCalled();
        const transform = mockCtx.setTransform.mock.calls[0];
        expect(transform[4]).toBe(20);
        expect(transform[5]).toBe(40);
    });

    test('renderToCanvas should keep result canvas drawing on one DPR scale', () => {
        const targetCanvas = document.createElement('canvas');
        targetCanvas.width = 800;
        targetCanvas.height = 800;
        const mockCtx = {
            canvas: targetCanvas,
            setTransform: vi.fn(),
            clearRect: vi.fn()
        };
        targetCanvas.getContext = vi.fn().mockReturnValue(mockCtx);
        const drawHex = vi.spyOn(renderer, 'drawHex').mockImplementation(() => {});

        renderer.renderToCanvas(targetCanvas, game.map, game.layout, 2);

        expect(mockCtx.__burstCascadeDpr).toBe(2);
        expect(mockCtx.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0);
        expect(mockCtx.clearRect).toHaveBeenCalledWith(0, 0, 400, 400);
        expect(drawHex).toHaveBeenCalled();
    });

    test('drawLabel should draw active marker as canvas shape instead of text glyph', () => {
        const mockCtx = {
            save: vi.fn(),
            restore: vi.fn(),
            beginPath: vi.fn(),
            moveTo: vi.fn(),
            lineTo: vi.fn(),
            closePath: vi.fn(),
            arc: vi.fn(),
            fill: vi.fn(),
            stroke: vi.fn(),
            fillText: vi.fn(),
            measureText: vi.fn().mockReturnValue({ width: 80 })
        };
        const rendererMock = {
            ctx: mockCtx,
            game: {
                currentPlayer: 2,
                gameOver: false,
                pulseValue: 0,
                coinToss: { active: false },
                layout: {
                    size: 20,
                    hexToPixel: vi.fn().mockReturnValue({ x: 200, y: 100 })
                },
                map: {
                    centers: {
                        'hand-p2': { q: 0, r: 0 }
                    }
                },
                chains: {
                    2: { self: 0, enemy: 0 }
                },
                chainAnims: {
                    2: { self: 0, enemy: 0 }
                },
                pendingRewards: [],
                dotTargets: {}
            }
        };

        drawLabel(rendererMock, 'Player 2', 'hand-p2', '#f87171', 'right');

        expect(mockCtx.fillText).toHaveBeenCalledWith('Player 2', expect.any(Number), 100);
        expect(mockCtx.fillText.mock.calls[0][0]).not.toContain('▶');
        expect(mockCtx.moveTo).toHaveBeenCalled();
        expect(mockCtx.lineTo).toHaveBeenCalled();
    });
});
