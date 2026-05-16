import { describe, test, expect, beforeEach, vi } from 'vitest';
import { Game } from '../../src/main.js';
import { Utils } from '../../src/utils.js';

describe('Game Core (main.js)', () => {
    let game;

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
    });

    describe('Initialization and Basics', () => {
        test('Game instance should be available', () => {
            expect(game).toBeDefined();
            expect(game instanceof Game).toBe(true);
        });

        test('Utility Methods: adjustColor should correctly lighten/darken hex colors', () => {
            expect(Utils.adjustColor('#000000', 10)).toBe('#0a0a0a');
            expect(Utils.adjustColor('#ffffff', -10).toLowerCase()).toBe('#f5f5f5');
        });

        test('SoundManager should be instantiated in Game', () => {
            expect(game.sound).toBeDefined();
            expect(typeof game.sound.init).toBe('function');
        });

        test('Game should have required UI elements linked', () => {
            expect(game.canvas).not.toBeNull();
            expect(game.volumeSlider).not.toBeNull();
        });
    });

    describe('Reset Logic', () => {
        test('startGame should reset cursor, hover, and visual states', () => {
            game.hoveredHex = { id: 'test-hex' };
            game.selectedHex = { id: 'test-hex' };
            game.hoveredNeighbors = [{ id: 'neighbor-hex' }];
            game.lastMoveHex = { id: 'test-hex' };
            game.effects = [{ type: 'particle' }];

            game.startGame();

            expect(game.hoveredHex).toBeNull();
            expect(game.selectedHex).toBeNull();
            expect(game.hoveredNeighbors).toEqual([]);
            expect(game.lastMoveHex).toBeNull();
            expect(game.effects).toEqual([]);
        });

        test('resetToTitle should reset cursor, hover, and visual states', () => {
            game.hoveredHex = { id: 'test-hex' };
            game.selectedHex = { id: 'test-hex' };
            game.lastMoveHex = { id: 'test-hex' };
            game.effects = [{ type: 'particle' }];

            game.resetToTitle();

            expect(game.hoveredHex).toBeNull();
            expect(game.selectedHex).toBeNull();
            expect(game.lastMoveHex).toBeNull();
            expect(game.effects).toEqual([]);
        });
    });

    describe('Starter Decision (Resonance Sync)', () => {
        test('startGame should trigger resonance sync and result in either player 1 or 2', () => {
            game.startGame();
            expect(game.coinToss.active).toBe(true);
            expect(game.coinToss.phase).toBe('gathering');
            expect([1, 2]).toContain(game.coinToss.result);
        });

        test('updateCoinToss should transition through phases', () => {
            game.gameMode = 'pvc';
            game.startGame();
            const result = game.coinToss.result;
            const cpuTurnSpy = vi.spyOn(game, 'handleCPUTurn').mockImplementation(() => { });

            // gathering phase
            game.updateCoinToss(1250);
            expect(game.coinToss.phase).toBe('fusion');

            // fusion phase
            game.updateCoinToss(250);
            expect(game.coinToss.phase).toBe('burst');

            // burst phase
            game.coinToss.particles = []; 
            game.updateCoinToss(500);
            expect(game.coinToss.phase).toBe('stabilized');

            // stabilized phase
            game.updateCoinToss(1050);
            expect(game.coinToss.active).toBe(false);
            expect(game.currentPlayer).toBe(result);

            if (result === 2) {
                expect(cpuTurnSpy).toHaveBeenCalled();
            } else {
                expect(cpuTurnSpy).not.toHaveBeenCalled();
            }
            cpuTurnSpy.mockRestore();
        });
    });

    describe('Click Handling and Injection', () => {
        test('Should NOT allow injection into enemy grid', () => {
            const triggerDropSpy = vi.spyOn(game, 'triggerDropSequence').mockImplementation(() => {});
            game.currentPlayer = 1;
            const enemyHex = { zone: 'main', owner: 2, isDisabled: false };
            game.handleClick({ isSimulated: true, simulatedHex: enemyHex });

            expect(triggerDropSpy).not.toHaveBeenCalled();
        });

        test('Should allow injection into player grid', () => {
            const triggerDropSpy = vi.spyOn(game, 'triggerDropSequence').mockImplementation(() => {});
            game.currentPlayer = 1;
            const playerHex = { zone: 'main', owner: 1, isDisabled: false };
            game.handleClick({ isSimulated: true, simulatedHex: playerHex });

            expect(triggerDropSpy).toHaveBeenCalledWith(playerHex);
        });
    });

    describe('Game Rules (Burst/Extra Move)', () => {
        test('Extra move granted after enemy burst', async () => {
            game.startGame();
            // Force stabilized phase to allow moves
            game.coinToss.active = false;
            game.currentPlayer = 1;

            const targetHex = game.map.getHexAt(0, 0, 'main');
            targetHex.height = 9;
            targetHex.owner = 2; 

            const handZoneId = 'hand-p1';
            const handOffset = game.map.offsets[handZoneId];
            const centerHandHex = game.map.hexes.find(h => h.zone === handZoneId && h.q === handOffset.q && h.r === handOffset.r);
            if (centerHandHex) centerHandHex.height = 1;

            game.handleClick({ clientX: 0, clientY: 0, isSimulated: true, simulatedHex: targetHex });

            // We don't wait for real async if we mock effects, but here we check turnEndRequested
            // In main.js, if enemy burst occurs, turnEndRequested should be false.
            expect(game.currentPlayer).toBe(1);
            expect(game.turnEndRequested).toBe(false);
        });
    });
});
