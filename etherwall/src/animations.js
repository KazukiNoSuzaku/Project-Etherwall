// ──────────────────────────────────────────────────────────────────────────────
// Calming palette generator  (shared by all modes)
// ──────────────────────────────────────────────────────────────────────────────
function hslToRgb(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return { r: Math.round(f(0) * 255), g: Math.round(f(8) * 255), b: Math.round(f(4) * 255) };
}

const CALM_HUES = [170, 185, 200, 215, 230, 245, 260, 275, 290, 310, 330, 155, 190];

function generateCalmPalette() {
  const base = CALM_HUES[Math.floor(Math.random() * CALM_HUES.length)] + rand(-15, 15);
  return [0, 22, -18, 40].map(off => {
    const hue = ((base + off) % 360 + 360) % 360;
    return hslToRgb(hue, rand(28, 52), rand(55, 74));
  });
}

function clonePalette(p) { return p.map(c => ({ ...c })); }
function rand(min, max)     { return min + Math.random() * (max - min); }
function lerp(a, b, t)      { return a + (b - a) * t; }
function dist2(ax,ay,bx,by) { const dx=ax-bx,dy=ay-by; return dx*dx+dy*dy; }

// ──────────────────────────────────────────────────────────────────────────────
// ── SHARED EFFECTS ────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────

class Star {
  constructor(w, h) { this.init(w, h); }
  init(w, h) {
    this.x = rand(0, w); this.y = rand(0, h);
    this.r = rand(0.4, 1.8);
    this.phase = rand(0, Math.PI * 2); this.freq = rand(0.3, 1.4);
  }
  draw(ctx, dt) {
    this.phase += dt * this.freq;
    const a = 0.18 + 0.42 * (0.5 + 0.5 * Math.sin(this.phase));
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.fill();
  }
}

class ShootingStar {
  constructor(w, h) { this.reset(w, h); this.active = false; }
  reset(w, h) {
    this.w = w; this.h = h;
    this.x = rand(-w * 0.2, w * 1.2); this.y = rand(-h * 0.2, h * 0.4);
    const ang = rand(Math.PI * 0.05, Math.PI * 0.35), spd = rand(600, 1400);
    this.vx = Math.cos(ang) * spd; this.vy = Math.sin(ang) * spd;
    this.life = 1.0; this.decay = rand(0.6, 1.2); this.len = rand(80, 220);
    this.active = true;
  }
  update(dt, sm) {
    if (!this.active) return;
    this.x += this.vx * dt * sm; this.y += this.vy * dt * sm;
    this.life -= dt * this.decay * sm;
    if (this.life <= 0) this.active = false;
  }
  draw(ctx) {
    if (!this.active) return;
    const spd = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    const nx = -this.vx / spd, ny = -this.vy / spd;
    const tx = this.x + nx * this.len, ty = this.y + ny * this.len;
    const g = ctx.createLinearGradient(this.x, this.y, tx, ty);
    g.addColorStop(0, `rgba(220,235,255,${this.life * 0.85})`);
    g.addColorStop(1, 'rgba(220,235,255,0)');
    ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(tx, ty);
    ctx.strokeStyle = g; ctx.lineWidth = this.life * 2.5; ctx.stroke();
  }
}

class PulseRing {
  constructor(x, y, colorRef, maxR) {
    this.x = x; this.y = y; this.colorRef = colorRef;
    this.r = 0; this.maxR = maxR; this.life = 1.0; this.done = false;
  }
  update(dt, sm) {
    this.r += dt * sm * 160;
    this.life = 1 - this.r / this.maxR;
    if (this.r >= this.maxR) this.done = true;
  }
  draw(ctx) {
    const { r: cr, g: cg, b: cb } = this.colorRef;
    ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${Math.round(cr)},${Math.round(cg)},${Math.round(cb)},${this.life * 0.40})`;
    ctx.lineWidth = this.life * 3.5; ctx.stroke();
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// ── MODE 0: ORBS ──────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────

class AuroraWave {
  constructor(colorRef) {
    this.color = colorRef;
    this.t = rand(0, Math.PI * 2); this.speed = rand(0.06, 0.14);
    this.amp = rand(30, 90); this.freq = rand(0.002, 0.007);
    this.yBase = rand(0.50, 0.88); this.height = rand(60, 130);
  }
  update(dt, sm) { this.t += dt * this.speed * sm; }
  draw(ctx, w, h) {
    const { r: cr, g: cg, b: cb } = this.color;
    const yBase = this.yBase * h;
    ctx.beginPath(); ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 5) {
      ctx.lineTo(x, yBase
        + Math.sin(x * this.freq + this.t) * this.amp
        + Math.sin(x * this.freq * 1.7 + this.t * 1.3) * this.amp * 0.4);
    }
    ctx.lineTo(w, h); ctx.closePath();
    const grad = ctx.createLinearGradient(0, yBase - this.height, 0, h);
    grad.addColorStop(0,   `rgba(${Math.round(cr)},${Math.round(cg)},${Math.round(cb)},0)`);
    grad.addColorStop(0.4, `rgba(${Math.round(cr)},${Math.round(cg)},${Math.round(cb)},0.06)`);
    grad.addColorStop(1,   `rgba(${Math.round(cr)},${Math.round(cg)},${Math.round(cb)},0)`);
    ctx.fillStyle = grad; ctx.fill();
  }
}

export class FloatingOrb {
  constructor(w, h, colorRef) {
    this.w = w; this.h = h; this.color = colorRef;
    this.radius = rand(60, 180);
    this.x = rand(0, w); this.y = rand(0, h);
    this.tx = rand(0, w); this.ty = rand(0, h);
    this.speed = rand(0.0003, 0.0008);
    this.phase = rand(0, Math.PI * 2); this.opacityPhase = rand(0, Math.PI * 2);
    this.breatheAmp = rand(0.08, 0.18); this.breatheFreq = rand(0.4, 0.9);
    this.pulseTimer = rand(2, 6);
  }
  update(dt, sm) {
    const t = dt * sm;
    this.x = lerp(this.x, this.tx, this.speed * t * 60);
    this.y = lerp(this.y, this.ty, this.speed * t * 60);
    const dx = this.tx - this.x, dy = this.ty - this.y;
    if (dx * dx + dy * dy < 400) {
      this.tx = rand(this.radius, this.w - this.radius);
      this.ty = rand(this.radius, this.h - this.radius);
    }
    this.phase        += dt * this.breatheFreq * sm;
    this.opacityPhase += dt * 0.5 * sm;
    this.pulseTimer   -= dt * sm;
  }
  shouldPulse() {
    if (this.pulseTimer <= 0) { this.pulseTimer = rand(3, 8); return true; }
    return false;
  }
  draw(ctx, globalOpacity) {
    const scale   = 1 + Math.sin(this.phase) * this.breatheAmp;
    const r       = this.radius * scale;
    const opacity = globalOpacity * (0.55 + 0.45 * Math.sin(this.opacityPhase));
    const cr = Math.round(this.color.r), cg = Math.round(this.color.g), cb = Math.round(this.color.b);
    const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, r);
    grad.addColorStop(0,   `rgba(${cr},${cg},${cb},${opacity})`);
    grad.addColorStop(0.5, `rgba(${cr},${cg},${cb},${opacity * 0.4})`);
    grad.addColorStop(1,   `rgba(${cr},${cg},${cb},0)`);
    ctx.beginPath(); ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
    ctx.fillStyle = grad; ctx.fill();
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// ── MODE 1: SMOKE ─────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────

class SmokeParticle {
  constructor(w, h, colorRef) { this.reset(w, h, colorRef); }

  reset(w, h, colorRef) {
    this.w = w; this.h = h; this.color = colorRef;
    this.x = rand(w * 0.05, w * 0.95);
    this.y = h + rand(0, 40);
    this.vx = rand(-18, 18);
    this.vy = rand(-70, -35);
    this.r = rand(18, 45);
    this.maxR = rand(90, 240);
    this.baseOpacity = rand(0.06, 0.16);
    this.age = 0;
    this.maxAge = rand(5, 12);
    this.turbFreq  = rand(0.5, 1.8);
    this.turbAmp   = rand(12, 28);
    this.turbPhase = rand(0, Math.PI * 2);
    this.dead = false;
  }

  update(dt, sm) {
    if (this.dead) return;
    const t = dt * sm;
    this.age += t;
    if (this.age >= this.maxAge) { this.dead = true; return; }
    this.turbPhase += t * this.turbFreq;
    this.x += (this.vx + Math.sin(this.turbPhase) * this.turbAmp) * t;
    this.y += this.vy * t;
    // Slow down vertical speed as it rises
    this.vy = lerp(this.vy, -10, t * 0.08);
    this.r = lerp(this.r, this.maxR, t * 0.28);
  }

  draw(ctx) {
    if (this.dead) return;
    const lifeRatio = this.age / this.maxAge;
    const fadeIn  = Math.min(lifeRatio * 5, 1);      // 0→1 over first 20% of life
    const fadeOut = Math.max(1 - (lifeRatio - 0.5) * 2, 0); // 1→0 over last 50%
    const opacity = this.baseOpacity * fadeIn * fadeOut;
    const { r: cr, g: cg, b: cb } = this.color;
    const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.r);
    grad.addColorStop(0,   `rgba(${Math.round(cr)},${Math.round(cg)},${Math.round(cb)},${opacity})`);
    grad.addColorStop(0.55,`rgba(${Math.round(cr)},${Math.round(cg)},${Math.round(cb)},${opacity * 0.35})`);
    grad.addColorStop(1,   `rgba(${Math.round(cr)},${Math.round(cg)},${Math.round(cb)},0)`);
    ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fillStyle = grad; ctx.fill();
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// ── MODE 2: RIPPLE ────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────

class ImpactRipple {
  constructor(x, y, colorRef) {
    this.x = x; this.y = y; this.colorRef = colorRef;
    this.rings = [
      { r: 0, delay: 0 },
      { r: 0, delay: 0.5 },
      { r: 0, delay: 1.0 },
    ];
    this.maxR = rand(200, 420);
    this.speed = rand(80, 150);
    this.life  = 1.0;
    this.done  = false;
  }

  update(dt, sm) {
    this.life  -= dt * sm * 0.28;
    if (this.life <= 0) { this.done = true; return; }
    for (const ring of this.rings) {
      if (ring.delay > 0) { ring.delay -= dt * sm; continue; }
      ring.r += dt * sm * this.speed;
    }
  }

  draw(ctx) {
    const { r: cr, g: cg, b: cb } = this.colorRef;
    for (const ring of this.rings) {
      if (ring.delay > 0 || ring.r <= 0) continue;
      const alpha = this.life * Math.max(0, 1 - ring.r / this.maxR) * 0.55;
      ctx.beginPath();
      ctx.arc(this.x, this.y, ring.r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${Math.round(cr)},${Math.round(cg)},${Math.round(cb)},${alpha})`;
      ctx.lineWidth = this.life * 2.5;
      ctx.stroke();
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// AnimationEngine
// ──────────────────────────────────────────────────────────────────────────────
export class AnimationEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');

    // Live calming palette
    this._palette       = generateCalmPalette();
    this._targetPalette = clonePalette(generateCalmPalette());
    this._colorTimer    = 30;

    this.settings = { animationSpeed: 1.0, orbCount: 12, orbOpacity: 0.80 };
    this.fx       = { stars: true, aurora: true, shooting: true, lines: true };
    this.mode     = 0;   // 0 = orbs, 1 = smoke, 2 = ripple

    // Mode 0 — orbs
    this._orbs     = [];
    this._stars    = [];
    this._auroras  = [];
    this._pulses   = [];
    this._shooters = [];
    this._shooterTimer = rand(2, 6);

    // Mode 1 — smoke
    this._smokeParticles = [];
    this._smokeEmitTimer = 0;
    this._MAX_SMOKE = 120;

    // Mode 2 — ripple
    this._ripples      = [];
    this._rippleTimer  = rand(2, 5);
    this._waveT        = 0;

    this._last    = null;
    this._raf     = null;
    this._running = false;
  }

  // ── public API ──────────────────────────────────────────────────────────────

  applySettings(s) {
    const needRebuild = s.orbCount !== undefined && s.orbCount !== this.settings.orbCount;
    this.settings = { ...this.settings, ...s };
    if (needRebuild) this._buildScene();
  }

  setMode(m) {
    this.mode = m;
    this._buildScene();
  }

  resize(w, h) {
    this.canvas.width  = w;
    this.canvas.height = h;
    this._orbs.forEach(o => { o.w = w; o.h = h; });
    this._stars.forEach(s => s.init(w, h));
  }

  start() {
    if (this._running) return;
    this._running = true;
    this._buildScene();
    this._loop();
  }

  stop() {
    this._running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
  }

  // ── scene builders ─────────────────────────────────────────────────────────

  _buildScene() {
    const w = this.canvas.width, h = this.canvas.height;
    if (this.mode === 0) this._buildOrbScene(w, h);
    else if (this.mode === 1) this._buildSmokeScene(w, h);
    else if (this.mode === 2) this._buildRippleScene(w, h);
  }

  _buildOrbScene(w, h) {
    const { orbCount } = this.settings;
    this._orbs    = Array.from({ length: orbCount }, (_, i) =>
      new FloatingOrb(w, h, this._palette[i % 4]));
    this._stars   = Array.from({ length: 220 }, () => new Star(w, h));
    this._auroras = Array.from({ length: 4 },   (_, i) => new AuroraWave(this._palette[i % 4]));
    this._pulses  = [];
    this._shooters = Array.from({ length: 3 }, () => { const s = new ShootingStar(w, h); s.active = false; return s; });
    this._shooterTimer = rand(3, 8);
  }

  _buildSmokeScene(w, h) {
    this._smokeParticles = [];
    this._smokeEmitTimer = 0;
    // Seed a few particles so screen isn't blank at launch
    for (let i = 0; i < 30; i++) {
      const p = new SmokeParticle(w, h, this._palette[i % 4]);
      p.y = rand(h * 0.3, h * 1.1);          // spread vertically at start
      p.age = rand(0, p.maxAge * 0.6);        // pre-age so some are mid-life
      this._smokeParticles.push(p);
    }
  }

  _buildRippleScene(w, h) {
    this._ripples     = [];
    this._rippleTimer = rand(1, 3);
    this._waveT       = 0;
    // Seed a couple of impact ripples so screen isn't blank
    for (let i = 0; i < 3; i++) {
      const r = new ImpactRipple(rand(0, w), rand(0, h), this._palette[i % 4]);
      r.life = rand(0.3, 0.9);
      this._ripples.push(r);
    }
  }

  // ── palette cycling ────────────────────────────────────────────────────────

  _stepPalette(dt, sm) {
    this._colorTimer -= dt * sm;
    if (this._colorTimer <= 0) {
      const next = generateCalmPalette();
      for (let i = 0; i < 4; i++) Object.assign(this._targetPalette[i], next[i]);
      this._colorTimer = 30;
    }
    const t = 1 - Math.exp(-dt * 0.38 * sm);
    for (let i = 0; i < 4; i++) {
      const c = this._palette[i], tgt = this._targetPalette[i];
      c.r += (tgt.r - c.r) * t;
      c.g += (tgt.g - c.g) * t;
      c.b += (tgt.b - c.b) * t;
    }
  }

  // ── loop ───────────────────────────────────────────────────────────────────

  _loop() {
    if (!this._running) return;
    this._raf = requestAnimationFrame(ts => {
      const dt = this._last ? Math.min((ts - this._last) / 1000, 0.1) : 0.016;
      this._last = ts;
      this._tick(dt);
      this._loop();
    });
  }

  _tick(dt) {
    const { animationSpeed: sm } = this.settings;
    this._stepPalette(dt, sm);
    if      (this.mode === 0) this._tickOrbs(dt, sm);
    else if (this.mode === 1) this._tickSmoke(dt, sm);
    else if (this.mode === 2) this._tickRipple(dt, sm);
  }

  // ── MODE 0 tick ────────────────────────────────────────────────────────────

  _tickOrbs(dt, sm) {
    const { ctx, canvas } = this;
    const { orbOpacity } = this.settings;
    const w = canvas.width, h = canvas.height;

    ctx.fillStyle = 'rgba(8, 8, 18, 0.22)';
    ctx.fillRect(0, 0, w, h);

    if (this.fx.aurora) {
      ctx.globalCompositeOperation = 'screen';
      for (const a of this._auroras) { a.update(dt, sm); a.draw(ctx, w, h); }
    }

    if (this.fx.stars) {
      ctx.globalCompositeOperation = 'source-over';
      for (const s of this._stars) s.draw(ctx, dt * sm);
    }

    if (this.fx.shooting) {
      this._shooterTimer -= dt * sm;
      if (this._shooterTimer <= 0) {
        const idle = this._shooters.find(s => !s.active);
        if (idle) idle.reset(w, h);
        this._shooterTimer = rand(4, 12);
      }
      for (const ss of this._shooters) { ss.update(dt, sm); ss.draw(ctx); }
    }

    ctx.globalCompositeOperation = 'screen';
    this._pulses = this._pulses.filter(p => !p.done);
    for (const p of this._pulses) { p.update(dt, sm); p.draw(ctx); }

    ctx.globalCompositeOperation = 'screen';
    for (const orb of this._orbs) {
      orb.update(dt, sm);
      orb.draw(ctx, orbOpacity);
      if (orb.shouldPulse()) {
        this._pulses.push(new PulseRing(orb.x, orb.y, orb.color, orb.radius * rand(1.8, 3.2)));
      }
    }

    if (this.fx.lines) {
      ctx.globalCompositeOperation = 'source-over';
      const MAX = 280 * 280;
      for (let i = 0; i < this._orbs.length; i++) {
        for (let j = i + 1; j < this._orbs.length; j++) {
          const oi = this._orbs[i], oj = this._orbs[j];
          const d2 = dist2(oi.x, oi.y, oj.x, oj.y);
          if (d2 < MAX) {
            const alpha = (1 - d2 / MAX) * 0.18 * orbOpacity;
            const cr = Math.round(oi.color.r), cg = Math.round(oi.color.g), cb = Math.round(oi.color.b);
            ctx.beginPath(); ctx.moveTo(oi.x, oi.y); ctx.lineTo(oj.x, oj.y);
            ctx.strokeStyle = `rgba(${cr},${cg},${cb},${alpha})`;
            ctx.lineWidth = 1; ctx.stroke();
          }
        }
      }
    }

    ctx.globalCompositeOperation = 'source-over';
  }

  // ── MODE 1 tick ────────────────────────────────────────────────────────────

  _tickSmoke(dt, sm) {
    const { ctx, canvas } = this;
    const { orbOpacity } = this.settings;
    const w = canvas.width, h = canvas.height;

    // Very slow background fade — lets smoke trails linger
    ctx.fillStyle = 'rgba(6, 6, 14, 0.10)';
    ctx.fillRect(0, 0, w, h);

    // Emit new particles
    this._smokeEmitTimer -= dt * sm;
    if (this._smokeEmitTimer <= 0 && this._smokeParticles.length < this._MAX_SMOKE) {
      const count = Math.floor(rand(1, 4));
      for (let i = 0; i < count; i++) {
        this._smokeParticles.push(
          new SmokeParticle(w, h, this._palette[Math.floor(rand(0, 4))])
        );
      }
      this._smokeEmitTimer = rand(0.08, 0.22);
    }

    // Remove dead particles
    this._smokeParticles = this._smokeParticles.filter(p => !p.dead);

    ctx.globalCompositeOperation = 'screen';
    for (const p of this._smokeParticles) {
      p.update(dt, sm);
      if (!p.dead) p.draw(ctx);
    }

    ctx.globalCompositeOperation = 'source-over';
  }

  // ── MODE 2 tick ────────────────────────────────────────────────────────────

  _tickRipple(dt, sm) {
    const { ctx, canvas } = this;
    const w = canvas.width, h = canvas.height;

    this._waveT += dt * sm;

    // Background — near-black with very slow fade
    ctx.fillStyle = 'rgba(5, 8, 16, 0.18)';
    ctx.fillRect(0, 0, w, h);

    // ── Interference wave grid ────────────────────────────────────────────────
    ctx.globalCompositeOperation = 'source-over';
    const SPACING = 10;
    const palette = this._palette;
    const t = this._waveT;

    for (let yi = 0; yi * SPACING <= h; yi++) {
      const y = yi * SPACING;
      const cIdx = yi % 4;
      const { r: cr, g: cg, b: cb } = palette[cIdx];

      // Wave displacement for this row — sum of 3 sine waves
      ctx.beginPath();
      for (let x = 0; x <= w; x += 4) {
        const disp =
          Math.sin(x * 0.010 + t * 0.70) * 18
        + Math.sin(x * 0.023 - t * 1.10 + y * 0.008) * 9
        + Math.sin(x * 0.005 + y * 0.015 + t * 0.45) * 22;

        // Brightness modulation creates the shimmering caustic look
        const bright = 0.5 + 0.5 * Math.sin(x * 0.018 + y * 0.012 - t * 0.8);
        const alpha  = 0.018 * bright;

        if (x === 0) ctx.moveTo(x, y + disp);
        else         ctx.lineTo(x, y + disp);

        // Change color per segment for an iridescent stripe effect
        if (x % 80 === 0 && x > 0) {
          ctx.strokeStyle = `rgba(${Math.round(cr)},${Math.round(cg)},${Math.round(cb)},${alpha})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(x, y + disp);
        }
      }
      ctx.strokeStyle = `rgba(${Math.round(cr)},${Math.round(cg)},${Math.round(cb)},0.016)`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // ── Impact ripples ─────────────────────────────────────────────────────────
    this._rippleTimer -= dt * sm;
    if (this._rippleTimer <= 0) {
      this._ripples.push(new ImpactRipple(rand(0, w), rand(0, h), this._palette[Math.floor(rand(0, 4))]));
      this._rippleTimer = rand(2.5, 6);
    }

    this._ripples = this._ripples.filter(r => !r.done);
    ctx.globalCompositeOperation = 'screen';
    for (const r of this._ripples) { r.update(dt, sm); r.draw(ctx); }

    ctx.globalCompositeOperation = 'source-over';
  }
}
