// ──────────────────────────────────────────────────────────────────────────────
// MusicEngine — generative ambient drone using Web Audio API
// No external dependencies, no audio files required.
// ──────────────────────────────────────────────────────────────────────────────

export class MusicEngine {
  constructor() {
    this._ac       = null;
    this._master   = null;
    this._nodes    = [];   // { osc, lfo, env } per voice
    this._reverb   = null;
    this._playing  = false;
    this._volume   = 0.55; // 0–1 user-facing
  }

  get playing() { return this._playing; }

  async start() {
    if (this._playing) return;

    this._ac = new AudioContext();
    if (this._ac.state === 'suspended') await this._ac.resume();

    // Master gain (controls volume; starts at 0 for fade-in)
    this._master = this._ac.createGain();
    this._master.gain.value = 0;
    this._master.connect(this._ac.destination);

    // ── Reverb via feedback delay network ────────────────────────────────────
    // Two crossed delay lines with mild feedback simulate a room reverb.
    const delayA = this._ac.createDelay(3.0);
    const delayB = this._ac.createDelay(3.0);
    delayA.delayTime.value = 0.71;
    delayB.delayTime.value = 0.59;

    const fbA = this._ac.createGain(); fbA.gain.value = 0.30;
    const fbB = this._ac.createGain(); fbB.gain.value = 0.28;
    const wet = this._ac.createGain(); wet.gain.value = 0.45;

    delayA.connect(fbA); fbA.connect(delayB);
    delayB.connect(fbB); fbB.connect(delayA);
    delayA.connect(wet); delayB.connect(wet);
    wet.connect(this._ac.destination);

    this._reverbIn = delayA; // voices feed into this

    // ── Harmonic series voices ────────────────────────────────────────────────
    // Base: A2 (110 Hz) — calming drone
    const BASE = 110;

    // Voices: [ratio, type, envGain, lfoFreq, lfoDepth(cents)]
    const voices = [
      [1.000, 'sine',     0.28, 0.025, 2.5],  // root — full sine, barely moving
      [1.500, 'sine',     0.18, 0.038, 3.0],  // perfect fifth
      [2.000, 'triangle', 0.10, 0.051, 4.0],  // octave
      [2.667, 'sine',     0.07, 0.064, 3.5],  // minor 7th harmonic
      [3.000, 'triangle', 0.05, 0.079, 5.0],  // twelfth
      [0.500, 'sine',     0.12, 0.018, 2.0],  // sub-octave — deep rumble
    ];

    for (const [ratio, type, envGainVal, lfoFreq, lfoDepth] of voices) {
      const freq = BASE * ratio;

      const osc = this._ac.createOscillator();
      osc.type = type;
      osc.frequency.value = freq;

      // Slow pitch-wobble LFO
      const lfo = this._ac.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = lfoFreq;
      const lfoGain = this._ac.createGain();
      lfoGain.gain.value = lfoDepth;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.detune);
      lfo.start();

      // Low-pass filter softens harsh harmonics
      const filter = this._ac.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = Math.min(800 / ratio, 1200);
      filter.Q.value = 0.7;

      // Per-voice gain
      const env = this._ac.createGain();
      env.gain.value = envGainVal;

      osc.connect(filter);
      filter.connect(env);
      env.connect(this._master);
      env.connect(this._reverbIn);   // send to reverb too
      osc.start();

      this._nodes.push({ osc, lfo, env });
    }

    // ── Slow amplitude swell (LFO on master) ─────────────────────────────────
    const swellLFO = this._ac.createOscillator();
    swellLFO.type = 'sine';
    swellLFO.frequency.value = 0.012; // one swell every ~83 s

    const swellDepth = this._ac.createGain();
    swellDepth.gain.value = 0.015;  // subtle ±1.5% volume breathe

    swellLFO.connect(swellDepth);
    swellDepth.connect(this._master.gain);
    swellLFO.start();
    this._nodes.push({ osc: swellLFO, lfo: null, env: null });

    // ── Fade in over 4 s ─────────────────────────────────────────────────────
    const targetGain = this._volume * 0.14;
    this._master.gain.setTargetAtTime(targetGain, this._ac.currentTime, 1.5);

    this._playing = true;
  }

  stop() {
    if (!this._playing || !this._master) return;
    // Fade out over 1 s, then close context
    this._master.gain.setTargetAtTime(0, this._ac.currentTime, 0.4);
    setTimeout(() => {
      try {
        this._nodes.forEach(({ osc, lfo }) => {
          try { osc.stop(); } catch (_) {}
          try { if (lfo) lfo.stop(); } catch (_) {}
        });
        this._ac.close();
      } catch (_) {}
      this._ac = null;
      this._master = null;
      this._nodes = [];
      this._playing = false;
    }, 1800);
  }

  setVolume(v) {
    this._volume = Math.max(0, Math.min(1, v));
    if (this._playing && this._master && this._ac) {
      this._master.gain.setTargetAtTime(
        this._volume * 0.14,
        this._ac.currentTime,
        0.15
      );
    }
  }
}
