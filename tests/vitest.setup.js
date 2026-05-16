import { vi, beforeEach } from 'vitest';
import { setAppVersion } from '../../GameWorksOAK/src/lib/utils/env.js';

// Mock remote library for tests
vi.mock('https://t-i-oak.github.io/GameWorksOAK/lib/utils/env.js', () => {
    return import('../../GameWorksOAK/src/lib/utils/env.js');
});
vi.mock('https://t-i-oak.github.io/GameWorksOAK/lib/core/dataManager.js', () => {
    return import('../../GameWorksOAK/src/lib/core/dataManager.js');
});

global.window.IS_TESTING = true;
global.__APP_VERSION__ = '0.6.3';
setAppVersion(global.__APP_VERSION__);

// Mock Canvas getContext
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn().mockReturnValue({ width: 0 }),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    strokeText: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    setTransform: vi.fn(),
    drawImage: vi.fn(),
    createLinearGradient: vi.fn().mockReturnValue({
        addColorStop: vi.fn()
    })
});

// Explicitly mock localStorage if it's missing or broken in JSDOM
const mockStorage = {};
global.localStorage = {
    getItem: vi.fn(key => mockStorage[key] || null),
    setItem: vi.fn((key, value) => { mockStorage[key] = value.toString(); }),
    clear: vi.fn(() => { Object.keys(mockStorage).forEach(key => delete mockStorage[key]); }),
    removeItem: vi.fn(key => { delete mockStorage[key]; }),
    key: vi.fn(index => Object.keys(mockStorage)[index] || null),
    get length() { return Object.keys(mockStorage).length; }
};
global.window.localStorage = global.localStorage;


// Mock AudioContext
global.window.AudioContext = vi.fn().mockImplementation(() => ({
    state: 'suspended',
    currentTime: 0,
    sampleRate: 44100,
    resume: vi.fn().mockResolvedValue(),
    createBuffer: vi.fn().mockReturnValue({
        getChannelData: vi.fn().mockReturnValue(new Float32Array(1024))
    }),
    createGain: vi.fn().mockReturnValue({
        connect: vi.fn(),
        gain: { value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), setTargetAtTime: vi.fn() }
    }),
    createOscillator: vi.fn().mockReturnValue({
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        frequency: { setValueAtTime: vi.fn() },
        type: 'sine'
    }),
    createDelay: vi.fn().mockReturnValue({
        connect: vi.fn(),
        delayTime: { setValueAtTime: vi.fn() }
    }),
    createBiquadFilter: vi.fn().mockReturnValue({
        connect: vi.fn(),
        frequency: { setValueAtTime: vi.fn() },
        Q: { setValueAtTime: vi.fn() },
        type: 'lowpass'
    }),
    createDynamicsCompressor: vi.fn().mockReturnValue({
        connect: vi.fn(),
        threshold: { setValueAtTime: vi.fn() },
        knee: { setValueAtTime: vi.fn() },
        ratio: { setValueAtTime: vi.fn() },
        attack: { setValueAtTime: vi.fn() },
        release: { setValueAtTime: vi.fn() }
    }),
    createPanner: vi.fn().mockReturnValue({
        connect: vi.fn(),
        pan: { setValueAtTime: vi.fn() }
    }),
    createConvolver: vi.fn().mockReturnValue({
        connect: vi.fn(),
        buffer: null
    }),
    destination: {}
}));

// Mock ResizeObserver
global.window.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn()
}));

// Setup DOM elements that Game needs
beforeEach(() => {
    document.body.innerHTML = `
        <div id="app">
            <canvas id="game-canvas"></canvas>
            <div id="overlay" class="hidden">
                <div id="mode-selection-content" class="modal-content"></div>
                <div id="help-content" class="modal-content hidden">
                    <button id="help-close-btn"></button>
                    <button class="help-back-btn"></button>
                </div>
                <div id="achievements-content" class="modal-content hidden">
                    <button id="achievements-back-btn"></button>
                    <button id="achievement-reset-btn"></button>
                    <table id="achievements-table"><tbody></tbody></table>
                    <div id="achievement-percent"></div>
                    <button class="tab-btn" data-map="mini"></button>
                    <button class="tab-btn" data-map="regular"></button>
                </div>
                <div id="game-over-content" class="modal-content hidden">
                    <h2 id="winner-text"></h2>
                    <button id="restart-btn"></button>
                </div>
            </div>
            <div id="ai-thinking-overlay" class="hidden"></div>
            <div id="player-select">
                <button class="toggle-btn selected" data-value="pvc"></button>
                <button class="toggle-btn" data-value="pvp"></button>
            </div>
            <div id="size-select">
                <button class="toggle-btn" data-value="mini"></button>
                <button class="toggle-btn selected" data-value="regular"></button>
            </div>
            <div id="ai-level-select">
                <button class="toggle-btn" data-value="easy"></button>
                <button class="toggle-btn selected" data-value="normal"></button>
                <button class="toggle-btn" data-value="hard"></button>
            </div>
            <div id="ai-level-group"></div>
            <input type="range" id="volume-slider" value="50">
            <span id="volume-value">50%</span>
            <button id="help-btn"></button>
            <button id="start-help-btn"></button>
            <button id="game-start-btn"></button>
            <button id="achievements-btn"></button>
            <button id="peek-board-btn"></button>
        </div>
    `;
});
