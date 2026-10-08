// SoundManager.js - Dynamic Procedural Web Audio Engine + 2-Minute Symphonic Electronic Suite
// Features: Full progressive arrangements, builds, extended drops, harmonic progressions, and realistic procedural sound effects

const SoundManager = {
    ctx: null,
    muted: false,
    musicMuted: false,
    sfxVolume: 0.7,
    musicVolume: 0.35,
    currentTrack: null,
    musicInterval: null,
    stepIndex: 0,

    init() {
        if (this.ctx) return;
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
            }
            const savedMute = localStorage.getItem('emoji_royale_muted');
            if (savedMute !== null) this.muted = savedMute === 'true';
            const savedMusicMute = localStorage.getItem('emoji_royale_music_muted');
            if (savedMusicMute !== null) this.musicMuted = savedMusicMute === 'true';
        } catch (e) {
            console.warn('Web Audio API not supported', e);
        }
    },

    resume() {
        if (!this.ctx) this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
        if (!this.musicInterval && !this.musicMuted && !this.muted) {
            this.playMusic(this.currentTrack || 'menu');
        }
    },

    toggleMute() {
        this.muted = !this.muted;
        localStorage.setItem('emoji_royale_muted', this.muted);
        if (this.muted) {
            this.stopMusic();
        } else {
            this.playMusic(this.currentTrack || 'menu');
        }
        return this.muted;
    },

    toggleMusic() {
        this.musicMuted = !this.musicMuted;
        localStorage.setItem('emoji_royale_music_muted', this.musicMuted);
        if (this.musicMuted) {
            this.stopMusic();
        } else {
            this.playMusic(this.currentTrack || 'menu');
        }
        return this.musicMuted;
    },

    // ================= FULL 2-MINUTE MUSIC ENGINE =================
    playMusic(trackName) {
        if (this.currentTrack === trackName && this.musicInterval && !this.musicMuted && !this.muted) {
            if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
            return;
        }

        this.currentTrack = trackName;
        if (this.musicMuted || this.muted) return;
        if (!this.ctx) this.init();
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        this.stopMusic();

        this.stepIndex = 0;
        const tempo = trackName === 'battle' ? 130 : 115; // BPM
        const stepTimeMs = (60000 / tempo) / 4; // 16th note in ms (~130ms)

        if (trackName === 'menu') {
            this._startMenuMusic(stepTimeMs);
        } else if (trackName === 'battle') {
            this._startBattleMusic(stepTimeMs);
        }
    },

    stopMusic() {
        if (this.musicInterval) {
            clearInterval(this.musicInterval);
            this.musicInterval = null;
        }
    },

    _startMenuMusic(stepMs) {
        // Full ~90-Second Progressive Royal Symphony (512 Steps / 32 Bars):
        // [0-63]    Intro: Warm acoustic harp arpeggio & pad (Am -> F -> C -> G)
        // [64-127]  Verse: Bassline enters with royal flute melody
        // [128-159] Pre-Drop Build: Snare roll accelerando, pitch sweeps & tension riser
        // [160-255] 🔥 MASSIVE BEAT DROP (Extended 24 bars / ~25s): 
        //           Crushing 808 Sub-bass, Four-on-the-Floor Kick, Crispy Claps, High-energy Brass & Synth Leads!
        // [256-319] Chill Bridge / Breakdown: Ambient strings, melodic piano cadence (Dm -> Am -> Em -> Am)
        // [320-351] Second Build-up (Double speed snare roll + riser filter)
        // [352-447] 💥 SECOND DROP (Peak Energy Climax): Full brass choir & synth arps going crazy!
        // [448-511] Outro & Resolving Cadence: Peaceful harp cadence that seamlessly loops to Step 0.

        const chordProgression = [
            // Intro / Verse: Am - F - C - G (64 steps)
            { from: 0, to: 15, chord: [220.00, 261.63, 329.63], root: 55.00 },   // Am
            { from: 16, to: 31, chord: [174.61, 220.00, 261.63], root: 43.65 },  // F
            { from: 32, to: 47, chord: [130.81, 164.81, 196.00], root: 65.41 },  // C
            { from: 48, to: 63, chord: [196.00, 246.94, 293.66], root: 49.00 },  // G
            // Verse 2
            { from: 64, to: 79, chord: [220.00, 261.63, 329.63], root: 55.00 },
            { from: 80, to: 95, chord: [174.61, 220.00, 261.63], root: 43.65 },
            { from: 96, to: 111, chord: [130.81, 164.81, 196.00], root: 65.41 },
            { from: 112, to: 127, chord: [196.00, 246.94, 293.66], root: 49.00 },
            // Build 1
            { from: 128, to: 143, chord: [174.61, 220.00, 261.63], root: 43.65 }, // F
            { from: 144, to: 159, chord: [196.00, 246.94, 293.66], root: 49.00 }, // G
            // DROP 1 (Am - F - C - G x 2)
            { from: 160, to: 183, chord: [220.00, 261.63, 329.63], root: 55.00 },
            { from: 184, to: 207, chord: [174.61, 220.00, 261.63], root: 43.65 },
            { from: 208, to: 231, chord: [130.81, 164.81, 196.00], root: 65.41 },
            { from: 232, to: 255, chord: [196.00, 246.94, 293.66], root: 49.00 },
            // Bridge
            { from: 256, to: 271, chord: [146.83, 174.61, 220.00], root: 36.71 }, // Dm
            { from: 272, to: 287, chord: [220.00, 261.63, 329.63], root: 55.00 }, // Am
            { from: 288, to: 303, chord: [164.81, 196.00, 246.94], root: 41.20 }, // Em
            { from: 304, to: 319, chord: [220.00, 261.63, 329.63], root: 55.00 }, // Am
            // Build 2
            { from: 320, to: 335, chord: [174.61, 220.00, 261.63], root: 43.65 },
            { from: 336, to: 351, chord: [196.00, 246.94, 293.66], root: 49.00 },
            // DROP 2
            { from: 352, to: 375, chord: [220.00, 261.63, 329.63], root: 55.00 },
            { from: 376, to: 399, chord: [174.61, 220.00, 261.63], root: 43.65 },
            { from: 400, to: 423, chord: [130.81, 164.81, 196.00], root: 65.41 },
            { from: 424, to: 447, chord: [196.00, 246.94, 293.66], root: 49.00 },
            // Outro
            { from: 448, to: 479, chord: [146.83, 174.61, 220.00], root: 36.71 }, // Dm
            { from: 480, to: 511, chord: [164.81, 207.65, 246.94], root: 41.20 }  // E7 -> Am
        ];

        // 512-Step Melodic Lead Line
        const leadNotes = [
            // Intro Theme
            { s: 0, f: 523.25, d: 0.25 }, { s: 4, f: 659.25, d: 0.2 }, { s: 8, f: 587.33, d: 0.25 }, { s: 12, f: 523.25, d: 0.35 },
            { s: 16, f: 698.46, d: 0.25 }, { s: 20, f: 659.25, d: 0.2 }, { s: 24, f: 587.33, d: 0.25 }, { s: 28, f: 493.88, d: 0.4 },
            { s: 32, f: 523.25, d: 0.25 }, { s: 36, f: 587.33, d: 0.2 }, { s: 40, f: 659.25, d: 0.25 }, { s: 44, f: 783.99, d: 0.35 },
            { s: 48, f: 698.46, d: 0.25 }, { s: 52, f: 659.25, d: 0.2 }, { s: 56, f: 587.33, d: 0.3 }, { s: 60, f: 523.25, d: 0.5 },
            // Verse Theme
            { s: 64, f: 440.00, d: 0.25 }, { s: 68, f: 523.25, d: 0.2 }, { s: 72, f: 659.25, d: 0.3 }, { s: 76, f: 587.33, d: 0.25 },
            { s: 80, f: 698.46, d: 0.3 }, { s: 84, f: 783.99, d: 0.25 }, { s: 88, f: 880.00, d: 0.4 }, { s: 92, f: 659.25, d: 0.3 },
            // Build 1
            { s: 136, f: 440.00, d: 0.15 }, { s: 140, f: 523.25, d: 0.15 }, { s: 144, f: 659.25, d: 0.15 }, { s: 148, f: 783.99, d: 0.15 }, { s: 152, f: 880.00, d: 0.15 }, { s: 156, f: 987.77, d: 0.2 },
            // 🔥 DROP 1 EXTENDED (High Energy Brass Stabs & Leads)
            { s: 160, f: 1046.50, d: 0.35 }, { s: 164, f: 880.00, d: 0.25 }, { s: 168, f: 783.99, d: 0.3 }, { s: 172, f: 880.00, d: 0.4 },
            { s: 176, f: 1046.50, d: 0.3 }, { s: 180, f: 1174.66, d: 0.25 }, { s: 184, f: 1318.51, d: 0.45 }, { s: 188, f: 1046.50, d: 0.3 },
            { s: 192, f: 1046.50, d: 0.3 }, { s: 196, f: 880.00, d: 0.25 }, { s: 200, f: 783.99, d: 0.3 }, { s: 204, f: 659.25, d: 0.4 },
            { s: 208, f: 880.00, d: 0.3 }, { s: 212, f: 1046.50, d: 0.3 }, { s: 216, f: 1174.66, d: 0.35 }, { s: 220, f: 1318.51, d: 0.45 },
            { s: 224, f: 1046.50, d: 0.35 }, { s: 228, f: 880.00, d: 0.25 }, { s: 232, f: 783.99, d: 0.3 }, { s: 236, f: 880.00, d: 0.4 },
            { s: 240, f: 659.25, d: 0.3 }, { s: 244, f: 587.33, d: 0.3 }, { s: 248, f: 523.25, d: 0.35 }, { s: 252, f: 440.00, d: 0.5 },
            // Bridge
            { s: 256, f: 587.33, d: 0.35 }, { s: 264, f: 659.25, d: 0.3 }, { s: 272, f: 523.25, d: 0.35 }, { s: 280, f: 440.00, d: 0.4 },
            { s: 288, f: 659.25, d: 0.35 }, { s: 296, f: 587.33, d: 0.3 }, { s: 304, f: 523.25, d: 0.35 }, { s: 312, f: 440.00, d: 0.6 },
            // Build 2
            { s: 328, f: 523.25, d: 0.15 }, { s: 332, f: 659.25, d: 0.15 }, { s: 336, f: 783.99, d: 0.15 }, { s: 340, f: 880.00, d: 0.15 }, { s: 344, f: 1046.50, d: 0.15 }, { s: 348, f: 1174.66, d: 0.2 },
            // 💥 DROP 2 (CRAZY OCTAVE PEAK DROP)
            { s: 352, f: 1318.51, d: 0.35 }, { s: 356, f: 1174.66, d: 0.25 }, { s: 360, f: 1046.50, d: 0.3 }, { s: 364, f: 1174.66, d: 0.4 },
            { s: 368, f: 1318.51, d: 0.3 }, { s: 372, f: 1567.98, d: 0.35 }, { s: 376, f: 1760.00, d: 0.45 }, { s: 380, f: 1318.51, d: 0.35 },
            { s: 384, f: 1318.51, d: 0.3 }, { s: 388, f: 1174.66, d: 0.25 }, { s: 392, f: 1046.50, d: 0.3 }, { s: 396, f: 880.00, d: 0.4 },
            { s: 400, f: 1046.50, d: 0.3 }, { s: 404, f: 1174.66, d: 0.3 }, { s: 408, f: 1318.51, d: 0.35 }, { s: 412, f: 1567.98, d: 0.45 },
            { s: 416, f: 1318.51, d: 0.35 }, { s: 420, f: 1174.66, d: 0.25 }, { s: 424, f: 1046.50, d: 0.3 }, { s: 428, f: 1174.66, d: 0.4 },
            { s: 432, f: 880.00, d: 0.3 }, { s: 436, f: 783.99, d: 0.3 }, { s: 440, f: 659.25, d: 0.35 }, { s: 444, f: 523.25, d: 0.5 },
            // Outro Resolution
            { s: 448, f: 880.00, d: 0.35 }, { s: 460, f: 783.99, d: 0.35 }, { s: 472, f: 659.25, d: 0.4 }, { s: 484, f: 587.33, d: 0.35 }, { s: 496, f: 523.25, d: 0.5 }, { s: 504, f: 440.00, d: 0.8 }
        ];

        this.musicInterval = setInterval(() => {
            if (this.muted || this.musicMuted || !this.ctx) return;
            const now = this.ctx.currentTime;
            const step = this.stepIndex % 512;
            const isDrop = (step >= 160 && step < 256) || (step >= 352 && step < 448);
            const isBuild = (step >= 128 && step < 160) || (step >= 320 && step < 352);
            const isDrumsActive = (step >= 64 && step < 128) || isDrop;

            // Current Harmonic Block
            const curBlock = chordProgression.find(p => step >= p.from && step <= p.to) || chordProgression[0];

            // 1. EXTENDED BEAT DROP PERCUSSION (Four-on-the-floor Kick, Claps & Hi-hats)
            if (isDrop || isDrumsActive) {
                // Punchy Kick Drum on downbeats
                if (step % 4 === 0) {
                    const kick = this.ctx.createOscillator();
                    const kGain = this.ctx.createGain();
                    kick.type = 'sine';
                    kick.frequency.setValueAtTime(isDrop ? 150 : 110, now);
                    kick.frequency.exponentialRampToValueAtTime(36, now + 0.14);
                    kGain.gain.setValueAtTime(this.musicVolume * (isDrop ? 0.5 : 0.35), now);
                    kGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
                    kick.connect(kGain);
                    kGain.connect(this.ctx.destination);
                    kick.start(now);
                    kick.stop(now + 0.14);
                }
                // Crisp Claps on beats 4 & 12
                if (step % 8 === 4) {
                    const clapNoise = this.ctx.createBufferSource();
                    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.08, this.ctx.sampleRate);
                    const data = buf.getChannelData(0);
                    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
                    clapNoise.buffer = buf;

                    const cFilter = this.ctx.createBiquadFilter();
                    cFilter.type = 'highpass';
                    cFilter.frequency.setValueAtTime(1400, now);

                    const cGain = this.ctx.createGain();
                    cGain.gain.setValueAtTime(this.musicVolume * (isDrop ? 0.32 : 0.2), now);
                    cGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

                    clapNoise.connect(cFilter);
                    cFilter.connect(cGain);
                    cGain.connect(this.ctx.destination);
                    clapNoise.start(now);
                }
                // Fast 16th-note Hi-Hats during Drops
                if (isDrop && step % 2 === 0) {
                    const hatNoise = this.ctx.createBufferSource();
                    const hBuf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.03, this.ctx.sampleRate);
                    const hData = hBuf.getChannelData(0);
                    for (let i = 0; i < hData.length; i++) hData[i] = Math.random() * 2 - 1;
                    hatNoise.buffer = hBuf;

                    const hFilter = this.ctx.createBiquadFilter();
                    hFilter.type = 'highpass';
                    hFilter.frequency.setValueAtTime(6000, now);

                    const hGain = this.ctx.createGain();
                    hGain.gain.setValueAtTime(this.musicVolume * 0.14, now);
                    hGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

                    hatNoise.connect(hFilter);
                    hFilter.connect(hGain);
                    hGain.connect(this.ctx.destination);
                    hatNoise.start(now);
                }
            }

            // 2. HEAVY 808 SUB-BASS (Drives whole drop sections)
            if (isDrop && step % 4 === 0) {
                const subOsc = this.ctx.createOscillator();
                const subGain = this.ctx.createGain();
                subOsc.type = 'sine';
                subOsc.frequency.setValueAtTime(curBlock.root, now);
                subGain.gain.setValueAtTime(this.musicVolume * 0.45, now);
                subGain.gain.exponentialRampToValueAtTime(0.001, now + (stepMs * 4 / 1000) - 0.02);
                subOsc.connect(subGain);
                subGain.connect(this.ctx.destination);
                subOsc.start(now);
                subOsc.stop(now + (stepMs * 4 / 1000));
            }

            // 3. BUILD-UP ROLLS (Snare roll accelerating into the drop)
            if (isBuild) {
                const snareSpeed = step % 32 >= 24 ? 1 : step % 32 >= 16 ? 2 : 4;
                if (step % snareSpeed === 0) {
                    const sOsc = this.ctx.createOscillator();
                    const sGain = this.ctx.createGain();
                    sOsc.type = 'triangle';
                    const pitch = 180 + ((step % 32) * 15); // Rising frequency
                    sOsc.frequency.setValueAtTime(pitch, now);
                    sGain.gain.setValueAtTime(this.musicVolume * 0.28, now);
                    sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
                    sOsc.connect(sGain);
                    sGain.connect(this.ctx.destination);
                    sOsc.start(now);
                    sOsc.stop(now + 0.05);
                }
            }

            // 4. HARMONIC CHORD PADS & ARPS
            if (step % 8 === 0 && !isBuild) {
                curBlock.chord.forEach((freq, idx) => {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    const filter = this.ctx.createBiquadFilter();

                    osc.type = isDrop ? 'sawtooth' : 'triangle';
                    osc.frequency.setValueAtTime(freq, now);
                    filter.type = 'lowpass';
                    filter.frequency.setValueAtTime(isDrop ? 1400 : 700 + idx * 200, now);

                    gain.gain.setValueAtTime(0.001, now);
                    gain.gain.linearRampToValueAtTime(this.musicVolume * (isDrop ? 0.12 : 0.16), now + 0.08);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + (stepMs * 8 / 1000) - 0.03);

                    osc.connect(filter);
                    filter.connect(gain);
                    gain.connect(this.ctx.destination);

                    osc.start(now);
                    osc.stop(now + (stepMs * 8 / 1000));
                });
            }

            // 5. LEAD MELODY LINE
            const mel = leadNotes.find(m => m.s === step);
            if (mel) {
                const mOsc = this.ctx.createOscillator();
                const mGain = this.ctx.createGain();
                const mFilter = this.ctx.createBiquadFilter();

                mOsc.type = isDrop ? 'sawtooth' : 'sine';
                mOsc.frequency.setValueAtTime(mel.f, now);
                mFilter.type = 'bandpass';
                mFilter.frequency.setValueAtTime(mel.f * (isDrop ? 2.2 : 1.5), now);

                mGain.gain.setValueAtTime(this.musicVolume * (isDrop ? 0.34 : 0.22), now);
                mGain.gain.exponentialRampToValueAtTime(0.001, now + mel.d);

                mOsc.connect(mFilter);
                mFilter.connect(mGain);
                mGain.connect(this.ctx.destination);

                mOsc.start(now);
                mOsc.stop(now + mel.d);
            }

            this.stepIndex++;
        }, stepMs);
    },

    _startBattleMusic(stepMs) {
        // High-Energy Battle Symphony (512 Steps / ~90s):
        // Part 1 [0-63]: War march intro (D minor march)
        // Part 2 [64-127]: Intense combat build
        // Part 3 [128-159]: Epic pre-drop war snare roll
        // Part 4 [160-255] 🔥 CRAZY BATTLE DROP (Extended ~25s): Crushing kick, 808 war bass, blazing horns & saw leads!
        // Part 5 [256-319]: Strategic breakdown
        // Part 6 [320-351]: Second frantic buildup
        // Part 7 [352-447] 💥 MAXIMUM OVERDRIVE DROP: Double brass fanfare & high-octave synth frenzy!
        // Part 8 [448-511]: Outro victory march loop.

        const battleChords = [
            { from: 0, to: 63, chord: [293.66, 349.23, 440.00], root: 73.42 },    // Dm
            { from: 64, to: 127, chord: [233.08, 293.66, 349.23], root: 58.27 },  // Bb
            { from: 128, to: 159, chord: [261.63, 329.63, 392.00], root: 65.41 }, // C
            // DROP 1
            { from: 160, to: 207, chord: [293.66, 349.23, 440.00], root: 73.42 }, // Dm
            { from: 208, to: 255, chord: [233.08, 293.66, 349.23], root: 58.27 }, // Bb -> C
            // Breakdown
            { from: 256, to: 319, chord: [349.23, 440.00, 523.25], root: 87.31 },  // F
            // Build 2
            { from: 320, to: 351, chord: [220.00, 277.18, 329.63], root: 55.00 }, // A7
            // DROP 2
            { from: 352, to: 399, chord: [293.66, 349.23, 440.00], root: 73.42 }, // Dm
            { from: 400, to: 447, chord: [233.08, 293.66, 349.23], root: 58.27 }, // Bb
            // Outro
            { from: 448, to: 511, chord: [293.66, 349.23, 440.00], root: 73.42 }  // Dm
        ];

        const battleMelody = [
            // Part 1 Theme
            { s: 0, f: 293.66, d: 0.3 }, { s: 4, f: 349.23, d: 0.25 }, { s: 8, f: 392.00, d: 0.25 }, { s: 12, f: 440.00, d: 0.4 },
            { s: 16, f: 523.25, d: 0.3 }, { s: 20, f: 440.00, d: 0.25 }, { s: 24, f: 349.23, d: 0.3 }, { s: 28, f: 293.66, d: 0.4 },
            // Build 1
            { s: 136, f: 349.23, d: 0.15 }, { s: 140, f: 440.00, d: 0.15 }, { s: 144, f: 523.25, d: 0.15 }, { s: 148, f: 587.33, d: 0.15 }, { s: 152, f: 698.46, d: 0.15 }, { s: 156, f: 880.00, d: 0.2 },
            // 💥 BATTLE DROP 1 (Blazing Horn Fanfare)
            { s: 160, f: 1174.66, d: 0.4 }, { s: 164, f: 1046.50, d: 0.25 }, { s: 168, f: 880.00, d: 0.3 }, { s: 172, f: 1046.50, d: 0.4 },
            { s: 176, f: 1174.66, d: 0.35 }, { s: 180, f: 1396.91, d: 0.3 }, { s: 184, f: 1567.98, d: 0.45 }, { s: 188, f: 1174.66, d: 0.35 },
            { s: 192, f: 1174.66, d: 0.35 }, { s: 196, f: 1046.50, d: 0.25 }, { s: 200, f: 880.00, d: 0.3 }, { s: 204, f: 698.46, d: 0.4 },
            { s: 208, f: 880.00, d: 0.35 }, { s: 216, f: 1046.50, d: 0.3 }, { s: 224, f: 1174.66, d: 0.4 }, { s: 236, f: 1046.50, d: 0.3 },
            // Breakdown
            { s: 256, f: 698.46, d: 0.35 }, { s: 268, f: 880.00, d: 0.3 }, { s: 280, f: 1046.50, d: 0.4 }, { s: 296, f: 880.00, d: 0.4 },
            // Build 2
            { s: 328, f: 440.00, d: 0.15 }, { s: 336, f: 554.37, d: 0.15 }, { s: 344, f: 698.46, d: 0.15 }, { s: 348, f: 880.00, d: 0.2 },
            // 💥 BATTLE DROP 2 (Maximum Intensity Brass & Leads)
            { s: 352, f: 1567.98, d: 0.4 }, { s: 356, f: 1396.91, d: 0.25 }, { s: 360, f: 1174.66, d: 0.3 }, { s: 364, f: 1396.91, d: 0.4 },
            { s: 368, f: 1567.98, d: 0.35 }, { s: 372, f: 1760.00, d: 0.3 }, { s: 376, f: 2093.00, d: 0.5 }, { s: 380, f: 1567.98, d: 0.35 },
            { s: 384, f: 1396.91, d: 0.35 }, { s: 396, f: 1174.66, d: 0.35 }, { s: 408, f: 1046.50, d: 0.4 }, { s: 420, f: 880.00, d: 0.45 },
            // Outro
            { s: 448, f: 880.00, d: 0.35 }, { s: 464, f: 698.46, d: 0.35 }, { s: 480, f: 587.33, d: 0.4 }, { s: 496, f: 440.00, d: 0.5 }, { s: 504, f: 293.66, d: 0.8 }
        ];

        this.musicInterval = setInterval(() => {
            if (this.muted || this.musicMuted || !this.ctx) return;
            const now = this.ctx.currentTime;
            const step = this.stepIndex % 512;
            const isDrop = (step >= 160 && step < 256) || (step >= 352 && step < 448);
            const isRiser = (step >= 128 && step < 160) || (step >= 320 && step < 352);
            const curBlock = battleChords.find(p => step >= p.from && step <= p.to) || battleChords[0];

            // 1. PUNCHY KICK DRUM
            if (step % 4 === 0) {
                const k = this.ctx.createOscillator();
                const kg = this.ctx.createGain();
                k.type = 'sine';
                k.frequency.setValueAtTime(isDrop ? 165 : 120, now);
                k.frequency.exponentialRampToValueAtTime(32, now + 0.13);
                kg.gain.setValueAtTime(this.musicVolume * (isDrop ? 0.52 : 0.35), now);
                kg.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
                k.connect(kg);
                kg.connect(this.ctx.destination);
                k.start(now);
                k.stop(now + 0.13);
            }

            // 2. SNARE / WAR DRUM CRACK
            if (step % 8 === 4 || (isRiser && step % 2 === 0)) {
                const sn = this.ctx.createOscillator();
                const sng = this.ctx.createGain();
                sn.type = 'triangle';
                const sFreq = isRiser ? 220 + ((step % 32) * 20) : 320;
                sn.frequency.setValueAtTime(sFreq, now);
                sn.frequency.exponentialRampToValueAtTime(60, now + 0.08);
                sng.gain.setValueAtTime(this.musicVolume * 0.3, now);
                sng.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
                sn.connect(sng);
                sng.connect(this.ctx.destination);
                sn.start(now);
                sn.stop(now + 0.08);
            }

            // 3. SYNCOPATED 808 WAR BASSLINE
            if (step % 2 === 0) {
                const bOsc = this.ctx.createOscillator();
                const bGain = this.ctx.createGain();
                const bFilt = this.ctx.createBiquadFilter();

                bOsc.type = isDrop ? 'sawtooth' : 'triangle';
                bOsc.frequency.setValueAtTime(curBlock.root, now);
                bFilt.type = 'lowpass';
                bFilt.frequency.setValueAtTime(isDrop ? 700 : 380, now);

                bGain.gain.setValueAtTime(this.musicVolume * (isDrop ? 0.34 : 0.2), now);
                bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

                bOsc.connect(bFilt);
                bFilt.connect(bGain);
                bGain.connect(this.ctx.destination);

                bOsc.start(now);
                bOsc.stop(now + 0.13);
            }

            // 4. BRASS / HORN MELODY
            const bMel = battleMelody.find(m => m.s === step);
            if (bMel) {
                const horn = this.ctx.createOscillator();
                const hGain = this.ctx.createGain();
                const hFilt = this.ctx.createBiquadFilter();

                horn.type = 'sawtooth';
                horn.frequency.setValueAtTime(bMel.f, now);
                hFilt.type = 'bandpass';
                hFilt.frequency.setValueAtTime(bMel.f * (isDrop ? 2.4 : 1.6), now);

                hGain.gain.setValueAtTime(this.musicVolume * (isDrop ? 0.38 : 0.25), now);
                hGain.gain.exponentialRampToValueAtTime(0.001, now + bMel.d);

                horn.connect(hFilt);
                hFilt.connect(hGain);
                hGain.connect(this.ctx.destination);

                horn.start(now);
                horn.stop(now + bMel.d);
            }

            this.stepIndex++;
        }, stepMs);
    },

    // ================= SFX ENGINE =================
    play(soundName) {
        if (this.muted) return;
        if (!this.ctx) this.init();
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const now = this.ctx.currentTime;
        const mainGain = this.ctx.createGain();
        mainGain.gain.setValueAtTime(this.sfxVolume, now);
        mainGain.connect(this.ctx.destination);

        switch (soundName) {
            case 'click':
            case 'button_click':
                this._playClick(now, mainGain);
                break;
            case 'tab':
                this._playTab(now, mainGain);
                break;
            case 'card_deploy':
            case 'deploy':
                this._playCardDeploy(now, mainGain);
                break;
            case 'sword_hit':
            case 'hit':
                this._playSwordClash(now, mainGain);
                break;
            case 'arrow_shoot':
            case 'shoot':
                this._playBowShoot(now, mainGain);
                break;
            case 'arrow_hit':
                this._playArrowHit(now, mainGain);
                break;
            case 'cannon_fire':
            case 'cannon':
                this._playCannonFire(now, mainGain);
                break;
            case 'explosion':
                this._playExplosion(now, mainGain);
                break;
            case 'fireball':
                this._playFireball(now, mainGain);
                break;
            case 'magic':
            case 'heal':
                this._playMagicChime(now, mainGain);
                break;
            case 'zap':
            case 'lightning':
                this._playElectricZap(now, mainGain);
                break;
            case 'tower_damage':
                this._playStoneCrack(now, mainGain);
                break;
            case 'tower_destroy':
                this._playTowerDestroy(now, mainGain);
                break;
            case 'chest_open':
                this._playChestOpen(now, mainGain);
                break;
            case 'gold':
            case 'coin':
                this._playCoin(now, mainGain);
                break;
            case 'gem':
                this._playGemChime(now, mainGain);
                break;
            case 'upgrade':
                this._playUpgradeFanfare(now, mainGain);
                break;
            case 'victory':
                this._playVictoryFanfare(now, mainGain);
                break;
            case 'defeat':
                this._playDefeatSound(now, mainGain);
                break;
            case 'countdown':
                this._playCountdownBeep(now, mainGain);
                break;
            case 'match_start':
            case 'announcement':
                this._playWarHorn(now, mainGain);
                break;
            case 'emote':
                this._playEmotePop(now, mainGain);
                break;
            case 'evo_activate':
                this._playEvoActivate(now, mainGain);
                break;
            default:
                this._playClick(now, mainGain);
                break;
        }
    },

    // Procedural Synth SFX
    _playClick(t, dest) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, t);
        osc.frequency.exponentialRampToValueAtTime(300, t + 0.04);
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
        osc.connect(gain);
        gain.connect(dest);
        osc.start(t);
        osc.stop(t + 0.04);
    },

    _playTab(t, dest) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, t);
        osc.frequency.exponentialRampToValueAtTime(880, t + 0.08);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        osc.connect(gain);
        gain.connect(dest);
        osc.start(t);
        osc.stop(t + 0.08);
    },

    _playCardDeploy(t, dest) {
        const bufferSize = this.ctx.sampleRate * 0.18;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
        const whiteNoise = this.ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(800, t);
        filter.frequency.exponentialRampToValueAtTime(200, t + 0.18);
        filter.Q.setValueAtTime(3, t);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.35, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.18);

        whiteNoise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(dest);
        whiteNoise.start(t);

        const osc = this.ctx.createOscillator();
        const thudGain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, t + 0.05);
        osc.frequency.exponentialRampToValueAtTime(45, t + 0.22);
        thudGain.gain.setValueAtTime(0.5, t + 0.05);
        thudGain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

        osc.connect(thudGain);
        thudGain.connect(dest);
        osc.start(t + 0.05);
        osc.stop(t + 0.25);
    },

    _playSwordClash(t, dest) {
        const freqs = [1820, 2430, 3180, 4200];
        freqs.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = idx % 2 === 0 ? 'triangle' : 'sine';
            osc.frequency.setValueAtTime(freq + (Math.random() * 80 - 40), t);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.7, t + 0.15);

            const initialGain = 0.18 / (idx + 1);
            gain.gain.setValueAtTime(initialGain, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18 + idx * 0.04);

            osc.connect(gain);
            gain.connect(dest);
            osc.start(t);
            osc.stop(t + 0.25);
        });

        const oscTransient = this.ctx.createOscillator();
        const transGain = this.ctx.createGain();
        oscTransient.type = 'sawtooth';
        oscTransient.frequency.setValueAtTime(4800, t);
        oscTransient.frequency.exponentialRampToValueAtTime(600, t + 0.03);
        transGain.gain.setValueAtTime(0.3, t);
        transGain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
        oscTransient.connect(transGain);
        transGain.connect(dest);
        oscTransient.start(t);
        oscTransient.stop(t + 0.03);
    },

    _playBowShoot(t, dest) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(580, t);
        osc.frequency.exponentialRampToValueAtTime(140, t + 0.12);
        gain.gain.setValueAtTime(0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        osc.connect(gain);
        gain.connect(dest);
        osc.start(t);
        osc.stop(t + 0.12);
    },

    _playArrowHit(t, dest) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(700, t);
        osc.frequency.exponentialRampToValueAtTime(180, t + 0.08);
        gain.gain.setValueAtTime(0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        osc.connect(gain);
        gain.connect(dest);
        osc.start(t);
        osc.stop(t + 0.08);
    },

    _playCannonFire(t, dest) {
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, t);
        osc.frequency.exponentialRampToValueAtTime(32, t + 0.45);
        oscGain.gain.setValueAtTime(0.8, t);
        oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
        osc.connect(oscGain);
        oscGain.connect(dest);
        osc.start(t);
        osc.stop(t + 0.45);
    },

    _playExplosion(t, dest) {
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, t);
        osc.frequency.exponentialRampToValueAtTime(28, t + 0.6);
        oscGain.gain.setValueAtTime(0.9, t);
        oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
        osc.connect(oscGain);
        oscGain.connect(dest);
        osc.start(t);
        osc.stop(t + 0.6);
    },

    _playFireball(t, dest) {
        const bufferSize = this.ctx.sampleRate * 0.35;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
        const noise = this.ctx.createBufferSource();
        noise.buffer = noiseBuffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(300, t);
        filter.frequency.exponentialRampToValueAtTime(1400, t + 0.15);
        filter.frequency.exponentialRampToValueAtTime(200, t + 0.35);

        const nGain = this.ctx.createGain();
        nGain.gain.setValueAtTime(0.5, t);
        nGain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);

        noise.connect(filter);
        filter.connect(nGain);
        nGain.connect(dest);
        noise.start(t);
    },

    _playMagicChime(t, dest) {
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t + i * 0.05);

            gain.gain.setValueAtTime(0.2, t + i * 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.05 + 0.3);

            osc.connect(gain);
            gain.connect(dest);
            osc.start(t + i * 0.05);
            osc.stop(t + i * 0.05 + 0.3);
        });
    },

    _playElectricZap(t, dest) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(2200, t);
        osc.frequency.exponentialRampToValueAtTime(80, t + 0.18);

        gain.gain.setValueAtTime(0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

        osc.connect(gain);
        gain.connect(dest);
        osc.start(t);
        osc.stop(t + 0.18);
    },

    _playStoneCrack(t, dest) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(280, t);
        osc.frequency.exponentialRampToValueAtTime(60, t + 0.12);

        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

        osc.connect(gain);
        gain.connect(dest);
        osc.start(t);
        osc.stop(t + 0.12);
    },

    _playTowerDestroy(t, dest) {
        this._playExplosion(t, dest);
        setTimeout(() => {
            if (this.ctx && !this.muted) {
                const now = this.ctx.currentTime;
                const mg = this.ctx.createGain();
                mg.gain.setValueAtTime(this.sfxVolume, now);
                mg.connect(this.ctx.destination);
                this._playStoneCrack(now, mg);
            }
        }, 150);
    },

    _playChestOpen(t, dest) {
        const chords = [587.33, 739.99, 880.00, 1174.66, 1479.98];
        chords.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t + 0.08 + idx * 0.05);

            g.gain.setValueAtTime(0.2, t + 0.08 + idx * 0.05);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.08 + idx * 0.05 + 0.4);

            osc.connect(g);
            g.connect(dest);
            osc.start(t + 0.08 + idx * 0.05);
            osc.stop(t + 0.08 + idx * 0.05 + 0.4);
        });
    },

    _playCoin(t, dest) {
        const pitch = 1800 + Math.random() * 200;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = 'sine';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(pitch, t);
        osc2.frequency.setValueAtTime(pitch * 2.76, t);

        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(dest);

        osc1.start(t);
        osc2.start(t);
        osc1.stop(t + 0.2);
        osc2.stop(t + 0.2);
    },

    _playGemChime(t, dest) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(2637.02, t);
        osc.frequency.exponentialRampToValueAtTime(2093.00, t + 0.25);

        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

        osc.connect(gain);
        gain.connect(dest);
        osc.start(t);
        osc.stop(t + 0.3);
    },

    _playUpgradeFanfare(t, dest) {
        const notes = [440, 554.37, 659.25, 880];
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, t + i * 0.08);

            gain.gain.setValueAtTime(0.3, t + i * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.35);

            osc.connect(gain);
            gain.connect(dest);
            osc.start(t + i * 0.08);
            osc.stop(t + i * 0.08 + 0.35);
        });
    },

    _playVictoryFanfare(t, dest) {
        const melody = [
            { f: 523.25, time: 0, dur: 0.15 },
            { f: 659.25, time: 0.15, dur: 0.15 },
            { f: 783.99, time: 0.30, dur: 0.15 },
            { f: 1046.5, time: 0.45, dur: 0.5 }
        ];

        melody.forEach(item => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(item.f, t + item.time);

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(item.f * 2.5, t + item.time);

            gain.gain.setValueAtTime(0.3, t + item.time);
            gain.gain.exponentialRampToValueAtTime(0.001, t + item.time + item.dur);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(dest);

            osc.start(t + item.time);
            osc.stop(t + item.time + item.dur);
        });
    },

    _playDefeatSound(t, dest) {
        const notes = [
            { f: 392.00, time: 0, dur: 0.3 },
            { f: 369.99, time: 0.25, dur: 0.3 },
            { f: 349.23, time: 0.50, dur: 0.3 },
            { f: 311.13, time: 0.75, dur: 0.6 }
        ];

        notes.forEach(item => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(item.f, t + item.time);

            gain.gain.setValueAtTime(0.35, t + item.time);
            gain.gain.exponentialRampToValueAtTime(0.001, t + item.time + item.dur);

            osc.connect(gain);
            gain.connect(dest);

            osc.start(t + item.time);
            osc.stop(t + item.time + item.dur);
        });
    },

    _playCountdownBeep(t, dest) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, t);

        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

        osc.connect(gain);
        gain.connect(dest);
        osc.start(t);
        osc.stop(t + 0.1);
    },

    _playWarHorn(t, dest) {
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = 'sawtooth';
        osc2.type = 'sawtooth';
        osc1.frequency.setValueAtTime(220, t);
        osc2.frequency.setValueAtTime(330, t);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, t);
        filter.frequency.exponentialRampToValueAtTime(1400, t + 0.2);
        filter.frequency.exponentialRampToValueAtTime(400, t + 0.7);

        gain.gain.setValueAtTime(0.35, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(dest);

        osc1.start(t);
        osc2.start(t);
        osc1.stop(t + 0.7);
        osc2.stop(t + 0.7);
    },

    _playEmotePop(t, dest) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(350, t);
        osc.frequency.exponentialRampToValueAtTime(900, t + 0.1);

        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

        osc.connect(gain);
        gain.connect(dest);
        osc.start(t);
        osc.stop(t + 0.1);
    },

    _playEvoActivate(t, dest) {
        const notes = [440, 554, 659, 880, 1108, 1318];
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, t + i * 0.04);

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(freq * 1.5, t + i * 0.04);

            gain.gain.setValueAtTime(0.2, t + i * 0.04);
            gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.04 + 0.25);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(dest);

            osc.start(t + i * 0.04);
        });
    }
};

// Auto-initialize immediately and unlock AudioContext on ANY early gesture/interaction
const unlockAudio = () => {
    if (!SoundManager.ctx) SoundManager.init();
    SoundManager.resume();
};

['click', 'touchstart', 'touchend', 'mousedown', 'pointerdown', 'pointermove', 'mousemove', 'keydown', 'wheel', 'scroll', 'focus'].forEach(evt => {
    window.addEventListener(evt, unlockAudio, { passive: true });
    document.addEventListener(evt, unlockAudio, { passive: true });
});

// Immediate initialization attempts on load/ready
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            SoundManager.init();
            SoundManager.resume();
        });
    } else {
        SoundManager.init();
        SoundManager.resume();
    }
}
if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
        SoundManager.init();
        SoundManager.resume();
    });
}
