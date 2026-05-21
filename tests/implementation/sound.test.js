import { describe, test, expect, beforeEach, vi } from 'vitest';
import { SoundManager } from '../../src/sound.js';

describe('SoundManager Module', () => {
    let sound;

    beforeEach(() => {
        sound = new SoundManager();
    });

    test('SoundManager should initialize with default volume', () => {
        expect(sound.masterVolume).toBe(0.5);
        expect(sound.isMuted).toBe(false);
    });

    test('setVolume should update masterVolume', () => {
        sound.setVolume(0.8);
        expect(sound.masterVolume).toBe(0.8);
    });

    test('toggleMute should flip isMuted state', () => {
        const initialState = sound.isMuted;
        sound.toggleMute();
        expect(sound.isMuted).toBe(!initialState);
        sound.toggleMute();
        expect(sound.isMuted).toBe(initialState);
    });

    test('activateFromUserGesture should unlock audio immediately', async () => {
        const sourceStart = vi.fn();
        const ctx = createAudioContextMock({ sourceStart });
        window.AudioContext = vi.fn(() => ctx);

        await sound.activateFromUserGesture();

        expect(window.AudioContext).toHaveBeenCalled();
        expect(sourceStart).toHaveBeenCalled();
        expect(ctx.resume).toHaveBeenCalled();
    });

    test('primeFromUserGesture should create and unlock without awaiting resume', () => {
        const sourceStart = vi.fn();
        const ctx = createAudioContextMock({ sourceStart });
        window.AudioContext = vi.fn(() => ctx);

        sound.primeFromUserGesture();

        expect(window.AudioContext).toHaveBeenCalled();
        expect(sourceStart).toHaveBeenCalled();
        expect(ctx.resume).not.toHaveBeenCalled();
    });

    test('startBgm should resume pending pattern after audio activation', async () => {
        const ctx = createAudioContextMock();
        window.AudioContext = vi.fn(() => ctx);
        sound.scheduler = vi.fn();

        sound.startBgm('game');

        expect(sound.pendingBgmPattern).toBe('game');
        expect(sound.scheduler).not.toHaveBeenCalled();

        await sound.activateFromUserGesture();

        expect(sound.currentPattern).toBe('game');
        expect(sound.pendingBgmPattern).toBeNull();
        expect(sound.scheduler).toHaveBeenCalled();
    });

    test('recordAudioDebug should render diagnostic state to the panel', () => {
        document.body.innerHTML = '<pre id="audio-debug-output"></pre>';

        sound.recordAudioDebug('test event');

        const text = document.getElementById('audio-debug-output').textContent;
        expect(text).toContain('ctx: none');
        expect(text).toContain('last: test event');
    });

    test('bindAudioDebugControls should bind unlock and test buttons', async () => {
        document.body.innerHTML = `
            <button id="audio-debug-unlock-btn"></button>
            <button id="audio-debug-test-btn"></button>
            <pre id="audio-debug-output"></pre>
        `;
        const activateSpy = vi.spyOn(sound, 'activateFromUserGesture').mockResolvedValue();
        const playPlaceSpy = vi.spyOn(sound, 'playPlace').mockImplementation(() => {});

        sound.bindAudioDebugControls();
        document.getElementById('audio-debug-unlock-btn').click();
        document.getElementById('audio-debug-test-btn').click();
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(activateSpy).toHaveBeenCalledTimes(2);
        expect(playPlaceSpy).toHaveBeenCalled();
    });
});

function createAudioContextMock({ sourceStart = vi.fn() } = {}) {
    const ctx = {
        state: 'suspended',
        currentTime: 0,
        sampleRate: 44100,
        destination: {},
        resume: vi.fn().mockImplementation(() => {
            ctx.state = 'running';
            return Promise.resolve();
        }),
        createBuffer: vi.fn().mockReturnValue({
            getChannelData: vi.fn().mockReturnValue(new Float32Array(1024))
        }),
        createBufferSource: vi.fn().mockReturnValue({
            connect: vi.fn(),
            start: sourceStart,
            buffer: null
        }),
        createGain: vi.fn().mockReturnValue({
            connect: vi.fn(),
            gain: {
                setValueAtTime: vi.fn(),
                linearRampToValueAtTime: vi.fn(),
                exponentialRampToValueAtTime: vi.fn(),
                setTargetAtTime: vi.fn()
            }
        }),
        createOscillator: vi.fn().mockReturnValue({
            connect: vi.fn(),
            start: vi.fn(),
            stop: vi.fn(),
            frequency: {
                setValueAtTime: vi.fn(),
                exponentialRampToValueAtTime: vi.fn()
            },
            type: 'sine'
        }),
        createDelay: vi.fn().mockReturnValue({
            connect: vi.fn(),
            delayTime: {
                setValueAtTime: vi.fn(),
                setTargetAtTime: vi.fn()
            }
        }),
        createBiquadFilter: vi.fn().mockReturnValue({
            connect: vi.fn(),
            frequency: {
                setValueAtTime: vi.fn(),
                exponentialRampToValueAtTime: vi.fn(),
                value: 0
            },
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
        createStereoPanner: vi.fn().mockReturnValue({
            connect: vi.fn(),
            pan: { setValueAtTime: vi.fn() }
        }),
        createConvolver: vi.fn().mockReturnValue({
            connect: vi.fn(),
            buffer: null
        })
    };
    return ctx;
}
