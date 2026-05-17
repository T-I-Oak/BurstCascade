import { describe, test, expect, beforeEach, vi } from 'vitest';
import { Game } from '../../src/main.js';

describe('InputHandler Module', () => {
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
});
