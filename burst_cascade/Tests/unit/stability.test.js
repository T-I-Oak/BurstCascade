const fs = require('fs');
const path = require('path');

// Setup JSDOM environment
const html = `
<!DOCTYPE html>
<html>
<body>
    <canvas id="game-canvas"></canvas>
    <div id="player-select">
        <button class="toggle-btn selected" data-value="pvc"></button>
        <button class="toggle-btn" data-value="pvp"></button>
    </div>
    <div id="size-select">
        <button class="toggle-btn selected" data-value="regular"></button>
        <button class="toggle-btn" data-value="mini"></button>
    </div>
    <div id="ai-level-select">
        <button class="toggle-btn selected" data-value="easy"></button>
        <button class="toggle-btn" data-value="normal"></button>
        <button class="toggle-btn" data-value="hard"></button>
    </div>
    <div id="ai-level-group"></div>
    <div id="status-container">
        <div id="war-gauge-container">
            <div id="p1-bar"></div><div id="p2-bar"></div>
            <div id="p1-score"></div><div id="p2-score"></div>
        </div>
    </div>
    <span id="help-btn"></span>
    <span id="start-help-btn"></span>
    <button id="game-start-btn"></button>
    <button id="achievements-btn"></button>
    <button id="restart-btn"></button>
    <button id="help-close-btn"></button>
    <button class="help-back-btn"></button>
    <button id="achievements-back-btn"></button>
    <button id="achievement-reset-btn"></button>
    <button id="peek-board-btn"></button>
    <div id="overlay"></div>
    <div id="mode-selection-content"></div>
    <div id="help-content"></div>
    <div id="achievements-content"></div>
    <div id="game-over-content"></div>
    <div id="ai-thinking-overlay"></div>
    <div id="achievement-percent"></div>
    <table id="achievements-table"><tbody></tbody></table>
    <div class="tab-btn active" data-map="regular"></div>
    <div class="tab-btn" data-map="mini"></div>
</body>
</html>`;

// Initialize JSDOM body
document.body.innerHTML = html;

// Setup globals before loading main.js
global.BurstCascade = window.BurstCascade || {};

// Mock Canvas 2D context
window.HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
    fillRect: jest.fn(),
    clearRect: jest.fn(),
    getImageData: jest.fn(() => ({ data: new Uint8ClampedArray(4) })),
    putImageData: jest.fn(),
    createImageData: jest.fn(),
    setTransform: jest.fn(),
    drawImage: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    closePath: jest.fn(),
    stroke: jest.fn(),
    fill: jest.fn(),
    translate: jest.fn(),
    scale: jest.fn(),
    rotate: jest.fn(),
    arc: jest.fn(),
    ellipse: jest.fn(),
    createLinearGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
    fillText: jest.fn(),
    measureText: jest.fn(() => ({ width: 0 })),
}));

global.AudioContext = jest.fn().mockImplementation(() => ({
    createGain: jest.fn().mockReturnValue({ connect: jest.fn(), gain: { value: 0 } }),
    decodeAudioData: jest.fn()
}));

// Load source files
const files = ['map.js', 'achievements.js', 'ai.js', 'main.js'];
files.forEach(f => {
    const code = fs.readFileSync(path.resolve(__dirname, '../../', f), 'utf8');
    try {
        eval(code);
    } catch (e) {
        console.error(`Error loading ${f}:`, e);
        throw e;
    }
});

const { Game, AchievementManager, HexMap } = global.BurstCascade;

describe('System Stability (Game & Managers)', () => {
    let game;

    beforeEach(() => {
        // main.js defines window.game automatically
        game = window.game;
    });

    test('Game instance should be initialized correctly', () => {
        expect(game).toBeInstanceOf(Game);
        expect(game.achievementManager).toBeInstanceOf(AchievementManager);
        expect(game.map).toBeInstanceOf(HexMap);
    });

    test('HexMap should have players and cores properties', () => {
        expect(game.map.players).toBeDefined();
        expect(game.map.players[1].energy).toBeDefined();
        expect(game.map.cores).toBeDefined();
        expect(typeof game.map.cores[1]).toBe('number');
    });

    test('AchievementManager should have required methods', () => {
        const am = game.achievementManager;
        expect(typeof am.saveData).toBe('function');
        expect(typeof am.resetData).toBe('function');
        expect(typeof am.countHexes).toBe('function');
    });

    test('Game should have burst logic methods', () => {
        expect(typeof game.triggerBurst).toBe('function');
        expect(typeof game.queueReward).toBe('function');
    });
});

