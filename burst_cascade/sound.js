(function () {
    const { Constants } = window.BurstCascade;

    class SoundManager {
        constructor() {
            this.ctx = null;
            this.bgmGain = null;
            this.isPlaying = false;
            this.bpm = Constants.BPM.GAME;
            this.nextNoteTime = 0;
            this.tick = 0;
            this.schedulerId = null;
            this.currentPattern = null;
            this.targetBpm = Constants.BPM.GAME;
            this.masterVolume = 0.4; // Initial setting value (0.0 to 1.0) - Slider 50% = 0.4
            this.masterGain = null;
            this.isMuted = false;
            // Dynamic Rhythmic Intensities
            this.p1Intensity = 0;
            this.p2Intensity = 0;
            this.maxCores = 5; // Default normalized ceiling
            this.patternStartTick = 0; // Ver 4.7.20: Track pattern change time
        }

        updateContextData(cores1, cores2, totalCores = 0) {
            if (totalCores > 0) this.maxCores = totalCores;
            const max = this.maxCores;
            // Morphing intensity (Higher is more aggressive)
            this.p1Intensity = Math.max(0, 1.0 - cores1 / max);
            this.p2Intensity = Math.max(0, 1.0 - cores2 / max);
        }

        init() {
            if (this.ctx) return;
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();

            // --- High-end FX Chain ---
            this.masterCompressor = this.ctx.createDynamicsCompressor();
            this.masterCompressor.threshold.setValueAtTime(-24, this.ctx.currentTime);
            this.masterCompressor.knee.setValueAtTime(40, this.ctx.currentTime);
            this.masterCompressor.ratio.setValueAtTime(12, this.ctx.currentTime);
            this.masterCompressor.attack.setValueAtTime(0, this.ctx.currentTime);
            this.masterCompressor.release.setValueAtTime(0.25, this.ctx.currentTime);

            this.bgmGain = this.ctx.createGain();

            // Reverb (Simple Impulse Response hack using noise)
            this.reverbNode = this.ctx.createConvolver();
            const revDur = 2.5;
            const revRate = this.ctx.sampleRate;
            const revLen = revRate * revDur;
            const revBuffer = this.ctx.createBuffer(2, revLen, revRate);
            for (let c = 0; c < 2; c++) {
                const data = revBuffer.getChannelData(c);
                for (let i = 0; i < revLen; i++) {
                    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / revLen, 2);
                }
            }
            this.reverbNode.buffer = revBuffer;
            this.reverbGain = this.ctx.createGain();
            this.reverbGain.gain.setValueAtTime(0.15, this.ctx.currentTime);

            // Delay FX
            this.delayNode = this.ctx.createDelay(1.0);
            this.delayNode.delayTime.setValueAtTime(0.375, this.ctx.currentTime); // Dotted 8th at 120BPM
            this.delayFeedback = this.ctx.createGain();
            this.delayFeedback.gain.setValueAtTime(0.3, this.ctx.currentTime);
            this.delayGain = this.ctx.createGain();
            this.delayGain.gain.setValueAtTime(0.1, this.ctx.currentTime);

            this.masterGain = this.ctx.createGain();
            this.masterGain.connect(this.ctx.destination);

            // Routing
            this.bgmGain.connect(this.masterCompressor);
            this.bgmGain.connect(this.delayNode);
            this.delayNode.connect(this.delayFeedback);
            this.delayFeedback.connect(this.delayNode);
            this.delayNode.connect(this.delayGain);
            this.delayGain.connect(this.masterCompressor);

            this.masterCompressor.connect(this.reverbNode);
            this.reverbNode.connect(this.reverbGain);
            this.reverbGain.connect(this.masterGain);
            this.masterCompressor.connect(this.masterGain);

            this.updateVolume();

        }

        resume() {
            if (this.ctx && this.ctx.state === 'suspended') {
                return this.ctx.resume().catch(e => {
                    // Suppress warning if called without gesture
                });
            }
            return Promise.resolve();
        }

        updateVolume() {
            if (!this.bgmGain || !this.masterGain) return;
            const gainValue = this.isMuted ? 0 : this.masterVolume * 0.8;
            this.masterGain.gain.setTargetAtTime(gainValue, this.ctx.currentTime, 0.1);
            this.bgmGain.gain.setTargetAtTime(1.0, this.ctx.currentTime, 0.1);
        }

        setVolume(vol) {
            this.masterVolume = Math.max(0, Math.min(1, vol));
            if (this.ctx) this.updateVolume();
        }

        toggleMute() {
            this.isMuted = !this.isMuted;
            if (this.ctx) this.updateVolume();
        }

        // --- SFX ---
        playPlace() {
            if (!this.ctx || this.ctx.state === 'suspended') return;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(440, this.ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start();
            osc.stop(this.ctx.currentTime + 0.1);
        }

        playBurst() {
            if (!this.ctx || this.ctx.state === 'suspended') return;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(100, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.2);
            gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.2);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start();
            osc.stop(this.ctx.currentTime + 0.2);
        }

        playReward() {
            if (!this.ctx || this.ctx.state === 'suspended') return;
            const now = this.ctx.currentTime;
            [1320, 1760, 2640].forEach((freq, i) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + i * 0.05);
                gain.gain.setValueAtTime(0.05, now + i * 0.05);
                gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.05 + 0.2);
                osc.connect(gain);
                gain.connect(this.masterGain);
                osc.start(now + i * 0.05);
                osc.stop(now + i * 0.05 + 0.2);
            });
        }

        playTurnChange() {
            if (!this.ctx || this.ctx.state === 'suspended') return;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(220, this.ctx.currentTime);
            gain.gain.setValueAtTime(0.02, this.ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.05);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start();
            osc.stop(this.ctx.currentTime + 0.05);
        }

        // --- 先行決定演出用音響「エネルギーバースト」 (Ver 5.4.0) ---
        playResonanceSync(phase, timer) {
            if (!this.ctx || this.ctx.state === 'suspended') return;
            const now = this.ctx.currentTime;

            if (phase === 'gathering') {
                // 粒子の収束音（微細なグリッチ音）
                if (Math.random() < 0.2) {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(440 + Math.random() * 880, now);
                    gain.gain.setValueAtTime(0.003, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
                    osc.connect(gain);
                    gain.connect(this.masterGain);
                    osc.start();
                    osc.stop(now + 0.05);
                }
            } else if (phase === 'fusion') {
                // エネルギー膨張音：高密度の共鳴音
                // 周期を短くし、ピッチをより急激に上げることで「限界まで溜まっている感」を出す
                const interval = 80;
                if (Math.floor(timer / interval) !== Math.floor((timer - 16) / interval)) {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = 'triangle';
                    const freqBase = 120 + (timer / 300) * 440; // 0.3s で急激に上昇
                    osc.frequency.setValueAtTime(freqBase, now);
                    osc.frequency.exponentialRampToValueAtTime(freqBase * 1.2, now + 0.08);

                    gain.gain.setValueAtTime(0.015, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

                    osc.connect(gain);
                    gain.connect(this.masterGain);
                    osc.start();
                    osc.stop(now + 0.08);
                }
            }
        }

        // --- BGM Engine ---
        startBgm(type) {
            if (this.currentPattern === type && this.isPlaying && this.schedulerId) return;
            if (this.currentPattern === 'victory' && this.isPlaying) return;

            const prevPattern = this.currentPattern;
            this.currentPattern = type;
            this.isPlaying = true;

            if (!this.ctx) this.init();
            if (this.ctx.state === 'suspended') return;

            const shouldResetTick = (type === 'title' || prevPattern === 'title');
            if (shouldResetTick || !this.schedulerId) {
                this.tick = 0;
            }
            this.patternStartTick = this.tick;

            // Dynamic BPM setup
            if (type === 'title') this.targetBpm = Constants.BPM.TITLE;
            else if (type === 'game') this.targetBpm = Constants.BPM.GAME;
            else if (type === 'pinch') this.targetBpm = Constants.BPM.PINCH;
            else if (type === 'victory' || type === 'defeat') {
                this.targetBpm = this.bpm;
            }

            if (this.schedulerId) return;

            this.bpm = this.targetBpm;
            this.nextNoteTime = this.ctx.currentTime + 0.1;
            this.scheduler();
        }

        stopBgm() {
            this.isPlaying = false;
            if (this.schedulerId) {
                clearTimeout(this.schedulerId);
                this.schedulerId = null;
            }
        }

        scheduler() {
            if (!this.isPlaying) return;
            while (this.nextNoteTime < this.ctx.currentTime + 0.1) {
                if (this.tick < 511 || (this.currentPattern !== 'victory' && this.currentPattern !== 'defeat')) {
                    this.scheduleNote(this.tick, this.nextNoteTime);
                }
                this.advanceNote();
            }
            this.schedulerId = setTimeout(() => this.scheduler(), 25);
        }

        advanceNote() {
            const secondsPerBeat = 60.0 / this.bpm;
            this.nextNoteTime += 0.25 * secondsPerBeat;

            if (this.currentPattern === 'victory' || this.currentPattern === 'defeat') {
                const elapsed = (this.tick - this.patternStartTick + 512) % 512;
                if (elapsed < 96) {
                    this.tick++;
                } else {
                    this.stopBgm();
                }
            } else {
                this.tick = (this.tick + 1) % 512;
            }

            if (Math.abs(this.bpm - this.targetBpm) > 0.1) {
                this.bpm += (this.targetBpm - this.bpm) * 0.05;
                if (this.delayNode) {
                    this.delayNode.delayTime.setTargetAtTime(0.375 * (120 / this.bpm), this.ctx.currentTime, 0.1);
                }
            } else {
                this.bpm = this.targetBpm;
            }
        }

        playTone(freq, time, duration, vol, type = 'sine', filterType = 'none', filterFreq = 1000, res = 1, modulation = 0) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, time);

            let node = osc;
            if (modulation > 0) {
                const modOsc = this.ctx.createOscillator();
                const modGain = this.ctx.createGain();
                modOsc.frequency.setValueAtTime(freq * 1.5, time);
                modGain.gain.setValueAtTime(modulation * freq, time);
                modGain.gain.exponentialRampToValueAtTime(0.01, time + duration);
                modOsc.connect(modGain);
                modGain.connect(osc.frequency);
                modOsc.start(time);
                modOsc.stop(time + duration);
            }

            if (filterType !== 'none') {
                const filter = this.ctx.createBiquadFilter();
                filter.type = filterType;
                filter.frequency.setValueAtTime(filterFreq, time);
                filter.Q.setValueAtTime(res, time);
                filter.frequency.exponentialRampToValueAtTime(filterFreq * 0.1, time + duration);
                osc.connect(filter);
                node = filter;
            }

            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(vol, time + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
            node.connect(gain);

            const panner = this.ctx.createStereoPanner();
            panner.pan.setValueAtTime((Math.random() * 2 - 1) * 0.5, time);
            gain.connect(panner);
            panner.connect(this.bgmGain);

            osc.start(time);
            osc.stop(time + duration);
        }

        playDrum(type, time, vol) {
            const gain = this.ctx.createGain();
            if (type === 'kick') {
                const osc = this.ctx.createOscillator();
                osc.frequency.setValueAtTime(180, time);
                osc.frequency.exponentialRampToValueAtTime(40, time + 0.2);
                gain.gain.setValueAtTime(vol * 2.5, time);
                gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
                osc.connect(gain);
                osc.start(time);
                osc.stop(time + 0.2);
            } else if (type === 'snare') {
                const bufSize = this.ctx.sampleRate * 0.2;
                const buffer = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
                const noise = this.ctx.createBufferSource();
                noise.buffer = buffer;
                const filter = this.ctx.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.value = 1800;
                gain.gain.setValueAtTime(vol * 1.5, time);
                gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
                noise.connect(filter);
                filter.connect(gain);
                noise.start(time);
                noise.stop(time + 0.2);
            } else if (type === 'hat') {
                const filter = this.ctx.createBiquadFilter();
                filter.type = 'highpass';
                filter.frequency.value = 10000;
                const bufSize = this.ctx.sampleRate * 0.05;
                const noise = this.ctx.createBufferSource();
                const buffer = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
                noise.buffer = buffer;
                gain.gain.setValueAtTime(vol * 0.5, time);
                gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
                noise.connect(filter);
                filter.connect(gain);
                noise.start(time);
                noise.stop(time + 0.05);
            }
            gain.connect(this.bgmGain);
        }

        scheduleNote(tick, time) {
            if (this.currentPattern === 'title') {
                this.playTitle(tick, time);
            } else if (this.currentPattern === 'victory') {
                this.playVictory(tick, time);
            } else if (this.currentPattern === 'defeat') {
                this.playDefeat(tick, time);
            } else {
                this.playGame(tick, time, this.currentPattern === 'pinch');
            }
        }

        playTitle(tick, time) {
            const rhythm = tick % 16;
            if (rhythm === 0) this.playDrum('kick', time, 0.12);
            if (rhythm === 8) this.playDrum('snare', time, 0.08);
            if (rhythm % 4 === 2) this.playDrum('hat', time, 0.02);
            if (tick % 64 === 0) {
                this.playTone(55, time, 4.0, 0.04, 'sine', 'lowpass', 100, 1, 0);
            }
        }

        playGame(tick, time, isPinch) {
            const rhythm = tick % 16;
            if (rhythm === 0) this.playDrum('kick', time, 0.18);
            if (rhythm === 8) this.playDrum('snare', time, 0.1);
            if (rhythm % 4 === 2) this.playDrum('hat', time, 0.03);

            const p1Intensity = Math.pow(this.p1Intensity, 1.2);
            const p1Prob = 0.25;
            if (tick % 4 === 1 && (Math.random() < p1Prob)) {
                const vol = 0.08;
                const freq = 523.25 * (1 + p1Intensity);
                this.playTone(freq, time, 0.08, vol, 'triangle', 'lowpass', 1500, 1, 0);
            }

            const p2Intensity = Math.pow(this.p2Intensity, 1.2);
            const p2Prob = 0.25;
            if (tick % 4 === 3 && (Math.random() < p2Prob)) {
                const vol = 0.010;
                const freq = 880 * (1 + p2Intensity * 1.5);
                this.playTone(freq, time, 0.1, vol, 'sine', 'none', 1000, 1, 0.5);
            }

            if (tick % 64 === 0) {
                const droneFreq = isPinch ? 41.2 : 55;
                this.playTone(droneFreq, time, 8.0, 0.06, 'sine', 'lowpass', 150, 1, 0.2);
            }
        }

        playVictory(tick, time) {
            this.playSharedFinale(tick, time);
        }

        playDefeat(tick, time) {
            this.playSharedFinale(tick, time);
        }

        playSharedFinale(tick, time) {
            const relTick = (tick - this.patternStartTick + 512) % 512;
            const rhythm = tick % 16;

            if (relTick < 48) {
                if (rhythm === 0 || rhythm === 4) this.playDrum('kick', time, 0.18);
                if (rhythm === 8) this.playDrum('snare', time, 0.1);
                if (rhythm % 4 === 2) this.playDrum('hat', time, 0.03);
                return;
            }

            if (relTick === 48 || relTick === 50) this.playDrum('kick', time, 0.3);
            if (relTick === 52 || relTick === 56 || relTick === 60) {
                this.playDrum('kick', time, 0.4);
                this.playDrum('snare', time, 0.35);
            }

            if (relTick === 64) {
                this.playDrum('kick', time, 0.6);
                this.playDrum('snare', time, 0.5);

                const bufSize = this.ctx.sampleRate * 3.5;
                const buffer = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
                const noise = this.ctx.createBufferSource();
                noise.buffer = buffer;
                const filter = this.ctx.createBiquadFilter();
                filter.type = 'highpass';
                filter.frequency.value = 4000;
                const qGain = this.ctx.createGain();
                qGain.gain.setValueAtTime(0.5, time);
                qGain.gain.exponentialRampToValueAtTime(0.001, time + 3.0);
                noise.connect(filter);
                filter.connect(qGain);
                qGain.connect(this.bgmGain);
                noise.start(time);

                this.playTone(35, time, 3.0, 0.6, 'sine', 'lowpass', 80, 1, 0);
            }
        }
    }

    window.BurstCascade.SoundManager = SoundManager;
})();
