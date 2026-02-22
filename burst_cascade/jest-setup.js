const fs = require('fs');
const path = require('path');

// Ensure window is global
global.window = global;

// Mock DOM elements required by Game constructor
document.body.innerHTML = `
    <canvas id="game-canvas"></canvas>
    <div id="overlay"></div>
    <div id="help-btn"></div>
    <div id="start-help-btn"></div>
    <div id="help-content"></div>
    <div id="mode-selection-content"></div>
    <div id="game-over-content"></div>
    <div id="ai-thinking-overlay"></div>
    <div id="player-select"></div>
    <div id="size-select"></div>
    <div id="ai-level-select"></div>
    <div id="ai-level-group"></div>
    <div id="volume-slider-container">
        <input type="range" id="volume-slider" min="0" max="100" value="50">
        <span id="volume-value">50%</span>
    </div>
    <div id="bgm-select"></div>
    <div id="game-start-btn"></div>
    <div id="restart-btn"></div>
    <div id="help-close-btn"></div>
    <div id="peek-board-btn"></div>
    <div id="achievements-btn"></div>
    <div id="achievements-content"></div>
    <div id="achievements-back-btn"></div>
    <div id="achievement-reset-btn"></div>
    <div id="achievement-percent"></div>
    <table id="achievements-table"><tbody></tbody></table>
`;

// Mock Web Audio API (Ver 5.2.1: Robust mock for SoundManager evolution)
global.AudioContext = jest.fn().mockImplementation(() => {
    const mockParam = {
        setValueAtTime: jest.fn(),
        setTargetAtTime: jest.fn(),
        linearRampToValueAtTime: jest.fn(),
        exponentialRampToValueAtTime: jest.fn(),
        value: 1
    };
    const mockNode = { connect: jest.fn(), disconnect: jest.fn() };

    return {
        createOscillator: jest.fn(() => ({
            ...mockNode,
            start: jest.fn(),
            stop: jest.fn(),
            frequency: { ...mockParam },
            type: 'sine'
        })),
        createGain: jest.fn(() => ({
            ...mockNode,
            gain: { ...mockParam }
        })),
        createDynamicsCompressor: jest.fn(() => ({
            ...mockNode,
            threshold: { ...mockParam },
            knee: { ...mockParam },
            ratio: { ...mockParam },
            attack: { ...mockParam },
            release: { ...mockParam }
        })),
        createConvolver: jest.fn(() => ({
            ...mockNode,
            buffer: null
        })),
        createDelay: jest.fn(() => ({
            ...mockNode,
            delayTime: { ...mockParam }
        })),
        createBuffer: jest.fn((channels, length, rate) => ({
            getChannelData: jest.fn(() => new Float32Array(length)),
            length,
            duration: length / rate,
            sampleRate: rate,
            numberOfChannels: channels
        })),
        createStereoPanner: jest.fn(() => ({
            ...mockNode,
            pan: { ...mockParam }
        })),
        decodeAudioData: jest.fn().mockResolvedValue(new ArrayBuffer(0)),
        currentTime: 0,
        sampleRate: 44100,
        destination: {},
        state: 'suspended',
        resume: jest.fn().mockResolvedValue()
    };
});

// Mock Canvas/Context
if (typeof HTMLCanvasElement !== 'undefined') {
    HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
        drawImage: jest.fn(),
        fillRect: jest.fn(),
        clearRect: jest.fn(),
        beginPath: jest.fn(),
        arc: jest.fn(),
        fill: jest.fn(),
        stroke: jest.fn(),
        closePath: jest.fn(),
        save: jest.fn(),
        restore: jest.fn(),
        translate: jest.fn(),
        rotate: jest.fn(),
        scale: jest.fn(),
        setTransform: jest.fn(),
        moveTo: jest.fn(),
        lineTo: jest.fn(),
        setLineDash: jest.fn(), // Ver 5.2.0: Added for coin toss decoration
        strokeRect: jest.fn(),
        ellipse: jest.fn(),
        createLinearGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
        createRadialGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
        fillText: jest.fn(),
        measureText: jest.fn(() => ({ width: 0 })),
        canvas: { width: 800, height: 600 }
    }));
}

// Spy on Storage to allow expect(localStorage.setItem).toHaveBeenCalled()
jest.spyOn(Storage.prototype, 'setItem');
jest.spyOn(Storage.prototype, 'getItem');
jest.spyOn(Storage.prototype, 'clear');

// Load source files in order
const sourceFiles = [
    'constants.js',
    'utils.js',
    'map.js',
    'achievements.js',
    'sound.js',
    'renderer.js',
    'ai.js',
    'main.js',
    'tutorial.js'
];

sourceFiles.forEach(file => {
    const filePath = path.resolve(__dirname, file);
    const code = fs.readFileSync(filePath, 'utf8');
    try {
        eval(code);
    } catch (e) {
        console.error(`Failed to load ${file}:`, e.message);
    }
});
