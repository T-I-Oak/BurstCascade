import { describe, test, expect, beforeEach, vi } from 'vitest';
import { SoundManager } from '../../src/sound.js';
import {
    bindSoundLifecycleResumeHandlers,
    resumeSoundAfterPageReturn
} from '../../src/soundLifecycle.js';
import { playSharedFinale } from '../../src/soundFinale.js';

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

    test('startBgm should align finale start to the current beat', () => {
        const ctx = createAudioContextMock();
        ctx.state = 'running';
        window.AudioContext = vi.fn(() => ctx);
        sound.scheduler = vi.fn();
        sound.init();
        sound.currentPattern = 'game';
        sound.isPlaying = true;
        sound.schedulerId = 1;
        sound.tick = 37;

        sound.startBgm('victory');

        expect(sound.currentPattern).toBe('victory');
        expect(sound.patternStartTick).toBe(36);
        expect(sound.tick).toBe(37);
    });

    test('playSharedFinale should use finale-relative rhythm', () => {
        sound.playDrum = vi.fn();
        sound.playTone = vi.fn();
        sound.patternStartTick = 37;

        playSharedFinale(sound, 37, 1);

        expect(sound.playDrum).toHaveBeenCalledWith('kick', 1, 0.2);
    });

    test('resumeSoundAfterPageReturn should restart scheduler without resetting music state', async () => {
        const ctx = createAudioContextMock();
        window.AudioContext = vi.fn(() => ctx);
        sound.scheduler = vi.fn();
        sound.init();
        sound.currentPattern = 'game';
        sound.isPlaying = true;
        sound.schedulerId = null;
        sound.tick = 37;
        sound.patternStartTick = 12;
        sound.bpm = 116;
        sound.targetBpm = 132;

        await resumeSoundAfterPageReturn(sound);

        expect(ctx.resume).toHaveBeenCalled();
        expect(sound.currentPattern).toBe('game');
        expect(sound.tick).toBe(37);
        expect(sound.patternStartTick).toBe(12);
        expect(sound.bpm).toBe(116);
        expect(sound.targetBpm).toBe(132);
        expect(sound.scheduler).toHaveBeenCalled();
    });

    test('bindSoundLifecycleResumeHandlers should resume audio when page becomes visible', () => {
        const resumeSpy = vi.spyOn(sound, 'resume').mockResolvedValue();
        sound.ctx = { state: 'running' };
        bindSoundLifecycleResumeHandlers(sound);
        Object.defineProperty(document, 'visibilityState', {
            configurable: true,
            value: 'visible'
        });

        document.dispatchEvent(new Event('visibilitychange'));
        window.dispatchEvent(new Event('pageshow'));
        window.dispatchEvent(new Event('focus'));

        expect(resumeSpy).toHaveBeenCalledTimes(3);
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
