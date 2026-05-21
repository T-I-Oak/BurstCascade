export function playSharedFinale(sound, tick, time) {
    const relTick = (tick - sound.patternStartTick + 512) % 512;
    const rhythm = relTick % 16;

    if (relTick < 32) {
        if (rhythm === 0 || rhythm === 6 || rhythm === 12) sound.playDrum('kick', time, 0.2);
        if (rhythm === 8) sound.playDrum('snare', time, 0.13);
        if (rhythm % 4 === 2) sound.playDrum('hat', time, 0.035);
        return;
    }

    if (relTick < 48) {
        if (rhythm === 0 || rhythm === 6 || rhythm === 12 || rhythm === 14) sound.playDrum('kick', time, 0.26);
        if (rhythm === 4 || rhythm === 10) sound.playDrum('snare', time, 0.18);
        if (rhythm % 2 === 0) sound.playDrum('hat', time, 0.035);
        return;
    }

    if (relTick === 48 || relTick === 52 || relTick === 56) sound.playDrum('kick', time, 0.34);
    if (relTick === 50 || relTick === 54 || relTick === 58) sound.playDrum('snare', time, 0.26);
    if (relTick === 60 || relTick === 62) {
        sound.playDrum('kick', time, 0.45);
        sound.playDrum('snare', time, 0.38);
    }

    if (relTick === 64) {
        sound.playDrum('kick', time, 0.6);
        sound.playDrum('snare', time, 0.5);

        const bufSize = sound.ctx.sampleRate * 3.5;
        const buffer = sound.ctx.createBuffer(1, bufSize, sound.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = sound.ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = sound.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 4000;
        const qGain = sound.ctx.createGain();
        qGain.gain.setValueAtTime(0.5, time);
        qGain.gain.exponentialRampToValueAtTime(0.001, time + 3.0);
        noise.connect(filter);
        filter.connect(qGain);
        qGain.connect(sound.bgmGain);
        noise.start(time);

        sound.playTone(35, time, 3.0, 0.6, 'sine', 'lowpass', 80, 1, 0);
    }
}
