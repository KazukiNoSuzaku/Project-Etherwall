// ──────────────────────────────────────────────────────────────────────────────
// MusicEngine — generative ambient drone, Web Audio API
// Reverb: ConvolverNode with synthetic impulse response (no feedback cycles)
// ──────────────────────────────────────────────────────────────────────────────

export class MusicEngine {
  constructor() {
    this._ac      = null;
    this._master  = null;
    this._nodes   = [];
    this._playing = false;
    this._volume  = 0.6;
  }

  get playing() { return this._playing; }

  // White-noise exponential-decay impulse response — gives a smooth
  // room reverb without any feedback-loop cycles in the audio graph.
  _buildIR(duration = 3.0, decay = 2.5) {
    const ac  = this._ac;
    const len = Math.ceil(ac.sampleRate * duration);
    const buf = ac.createBuffer(2, len, ac.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    const conv = ac.createConvolver();
    conv.buffer = buf;
    return conv;
  }

  async start() {
    if (this._playing) return;
    try {
      this._ac = new AudioContext({ latencyHint: 'playback' });

      // Force the context running — needed in some Chromium builds
      if (this._ac.state !== 'running') {
        await this._ac.resume();
      }

      const ac = this._ac;

      // ── Output chain ────────────────────────────────────────────────────────
      // compressor → destination  (prevents clipping)
      const comp = ac.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.knee.value      = 12;
      comp.ratio.value     = 6;
      comp.attack.value    = 0.005;
      comp.release.value   = 0.3;
      comp.connect(ac.destination);

      // Master gain (fades in from 0)
      this._master = ac.createGain();
      this._master.gain.value = 0;
      this._master.connect(comp);

      // ── Reverb ──────────────────────────────────────────────────────────────
      const reverb    = this._buildIR(3.0, 2.5);
      const reverbWet = ac.createGain();
      reverbWet.gain.value = 0.50;
      reverb.connect(reverbWet);
      reverbWet.connect(comp);          // reverb goes to comp, not master

      const reverbSend = ac.createGain();
      reverbSend.gain.value = 0.45;
      reverbSend.connect(reverb);       // voices → reverbSend → reverb

      // ── Voices: A2 harmonic drone (110 Hz base) ───────────────────────────
      // [freq-ratio, osc-type, dry-gain, lfo-Hz, lfo-depth-cents]
      const voices = [
        [0.50, 'sine',     0.55, 0.018, 2],   // sub-octave — deep bass
        [1.00, 'sine',     0.70, 0.025, 2],   // root
        [1.50, 'sine',     0.45, 0.040, 3],   // perfect 5th
        [2.00, 'triangle', 0.30, 0.055, 3],   // octave
        [2.67, 'sine',     0.18, 0.068, 4],   // natural 7th
        [3.00, 'triangle', 0.12, 0.082, 4],   // twelfth
      ];

      const BASE = 110;
      for (const [ratio, type, gain, lfoHz, lfoCents] of voices) {
        const osc = ac.createOscillator();
        osc.type            = type;
        osc.frequency.value = BASE * ratio;

        // Pitch wobble LFO
        const lfo     = ac.createOscillator();
        lfo.type            = 'sine';
        lfo.frequency.value = lfoHz;
        const lfoGain = ac.createGain();
        lfoGain.gain.value  = lfoCents;
        lfo.connect(lfoGain);
        lfoGain.connect(osc.detune);
        lfo.start();

        // Gentle low-pass
        const filt = ac.createBiquadFilter();
        filt.type            = 'lowpass';
        filt.frequency.value = Math.min(1400 / ratio, 2200);
        filt.Q.value         = 0.6;

        const vGain = ac.createGain();
        vGain.gain.value = gain;

        osc.connect(filt);
        filt.connect(vGain);
        vGain.connect(this._master);  // dry
        vGain.connect(reverbSend);    // wet send

        osc.start();
        this._nodes.push({ osc, lfo });
      }

      // ── Slow breathing swell on a separate mod gain ────────────────────────
      // (Keep swell separate from master so setTargetAtTime isn't disrupted)
      const modGain = ac.createGain();
      modGain.gain.value = 1;
      this._master.disconnect(comp);
      this._master.connect(modGain);
      modGain.connect(comp);

      const swellOsc  = ac.createOscillator();
      swellOsc.type            = 'sine';
      swellOsc.frequency.value = 0.011; // ~91 s cycle
      const swellDepth = ac.createGain();
      swellDepth.gain.value = 0.06;     // ±6 % volume breathe
      swellOsc.connect(swellDepth);
      swellDepth.connect(modGain.gain);
      swellOsc.start();
      this._nodes.push({ osc: swellOsc, lfo: null });

      // ── Fade in ─────────────────────────────────────────────────────────────
      const target = this._volume * 0.55;
      this._master.gain.setTargetAtTime(target, ac.currentTime, 1.8);

      this._playing = true;
    } catch (err) {
      console.error('[MusicEngine] start() failed:', err);
      this._playing = false;
    }
  }

  stop() {
    if (!this._playing || !this._master) return;
    this._master.gain.setTargetAtTime(0, this._ac.currentTime, 0.5);
    setTimeout(() => {
      try {
        this._nodes.forEach(({ osc, lfo }) => {
          try { osc.stop(); }       catch (_) {}
          try { if (lfo) lfo.stop(); } catch (_) {}
        });
        this._ac.close();
      } catch (_) {}
      this._ac      = null;
      this._master  = null;
      this._nodes   = [];
      this._playing = false;
    }, 2000);
  }

  setVolume(v) {
    this._volume = Math.max(0, Math.min(1, v));
    if (this._playing && this._master && this._ac) {
      this._master.gain.setTargetAtTime(
        this._volume * 0.55,
        this._ac.currentTime,
        0.15
      );
    }
  }
}
