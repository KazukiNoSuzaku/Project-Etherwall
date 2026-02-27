// ──────────────────────────────────────────────────────────────────────────────
// Calming palette generator
// ──────────────────────────────────────────────────────────────────────────────

function hslToRgb(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return { r: Math.round(f(0) * 255), g: Math.round(f(8) * 255), b: Math.round(f(4) * 255) };
}

// Calming hue zones: teals, blues, purples, lavenders, soft rose, mint
const CALM_HUES = [170, 185, 200, 215, 230, 245, 260, 275, 290, 310, 330, 155, 190];

function generateCalmPalette() {
  const base = CALM_HUES[Math.floor(Math.random() * CALM_HUES.length)] + rand(-15, 15);
  const offsets = [0, 22, -18, 40];
  return offsets.map(off => {
    const hue = ((base + off) % 360 + 360) % 360;
    const sat = rand(28, 52);   // muted — not vivid
    const lit = rand(55, 74);   // bright enough to glow, never harsh
    return hslToRgb(hue, sat, lit);
  });
}

// Deep-copy a palette (so target doesn't share refs with current)
function clonePalette(p) { return p.map(c => ({ ...c })); }

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────
function rand(min, max)     { return min + Math.random() * (max - min); }
function lerp(a, b, t)      { return a + (b - a) * t; }
function dist2(ax,ay,bx,by) { const dx=ax-bx,dy=ay-by; return dx*dx+dy*dy; }

// ──────────────────────────────────────────────────────────────────────────────
// Star
// ──────────────────────────────────────────────────────────────────────────────
class Star {
  constructor(w, h) { this.init(w, h); }

  init(w, h) {
    this.x     = rand(0, w);
    this.y     = rand(0, h);
    this.r     = rand(0.4, 1.8);
    this.phase = rand(0, Math.PI * 2);
    this.freq  = rand(0.3, 1.4);
  }

  draw(ctx, dt) {
    this.phase += dt * this.freq;
    const a = 0.20 + 0.45 * (0.5 + 0.5 * Math.sin(this.phase));
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.fill();
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// ShootingStar
// ──────────────────────────────────────────────────────────────────────────────
class ShootingStar {
  constructor(w, h) { this.reset(w, h); this.active = false; }

  reset(w, h) {
    this.w    = w; this.h = h;
    this.x    = rand(-w * 0.2, w * 1.2);
    this.y    = rand(-h * 0.2, h * 0.4);
    const ang = rand(Math.PI * 0.05, Math.PI * 0.35);
    const spd = rand(600, 1400);
    this.vx   = Math.cos(ang) * spd;
    this.vy   = Math.sin(ang) * spd;
    this.life = 1.0;
    this.decay = rand(0.6, 1.2);
    this.len  = rand(80, 220);
    this.active = true;
  }

  update(dt, speedMult) {
    if (!this.active) return;
    this.x    += this.vx * dt * speedMult;
    this.y    += this.vy * dt * speedMult;
    this.life -= dt * this.decay * speedMult;
    if (this.life <= 0) this.active = false;
  }

  draw(ctx) {
    if (!this.active) return;
    const spd = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    const nx = -this.vx / spd, ny = -this.vy / spd;
    const tx = this.x + nx * this.len, ty = this.y + ny * this.len;
    const grad = ctx.createLinearGradient(this.x, this.y, tx, ty);
    grad.addColorStop(0, `rgba(220,235,255,${this.life * 0.85})`);
    grad.addColorStop(1, 'rgba(220,235,255,0)');
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(tx, ty);
    ctx.strokeStyle = grad;
    ctx.lineWidth   = this.life * 2.5;
    ctx.stroke();
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// PulseRing
// ──────────────────────────────────────────────────────────────────────────────
class PulseRing {
  constructor(x, y, colorRef, maxR) {
    this.x = x; this.y = y; this.colorRef = colorRef;
    this.r = 0; this.maxR = maxR; this.life = 1.0; this.done = false;
  }

  update(dt, speedMult) {
    this.r    += dt * speedMult * 160;
    this.life  = 1 - this.r / this.maxR;
    if (this.r >= this.maxR) this.done = true;
  }

  draw(ctx) {
    const { r: cr, g: cg, b: cb } = this.colorRef;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${Math.round(cr)},${Math.round(cg)},${Math.round(cb)},${this.life * 0.40})`;
    ctx.lineWidth   = this.life * 3.5;
    ctx.stroke();
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// AuroraWave
// ──────────────────────────────────────────────────────────────────────────────
class AuroraWave {
  constructor(colorRef) {
    this.color  = colorRef;   // shared mutable reference — auto-updates with palette
    this.t      = rand(0, Math.PI * 2);
    this.speed  = rand(0.06, 0.14);
    this.amp    = rand(30, 90);
    this.freq   = rand(0.002, 0.007);
    this.yBase  = rand(0.50, 0.88);
    this.height = rand(60, 130);
  }

  update(dt, speedMult) { this.t += dt * this.speed * speedMult; }

  draw(ctx, w, h) {
    const { r: cr, g: cg, b: cb } = this.color;
    const yBase = this.yBase * h;
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 5) {
      const y = yBase
        + Math.sin(x * this.freq + this.t) * this.amp
        + Math.sin(x * this.freq * 1.7 + this.t * 1.3) * this.amp * 0.4;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, yBase - this.height, 0, h);
    grad.addColorStop(0,   `rgba(${Math.round(cr)},${Math.round(cg)},${Math.round(cb)},0)`);
    grad.addColorStop(0.4, `rgba(${Math.round(cr)},${Math.round(cg)},${Math.round(cb)},0.06)`);
    grad.addColorStop(1,   `rgba(${Math.round(cr)},${Math.round(cg)},${Math.round(cb)},0)`);
    ctx.fillStyle = grad;
    ctx.fill();
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// FloatingOrb
// ──────────────────────────────────────────────────────────────────────────────
export class FloatingOrb {
  constructor(w, h, colorRef) {
    this.w = w; this.h = h;
    this.color       = colorRef;  // shared mutable reference
    this.radius      = rand(60, 180);
    this.x           = rand(0, w);
    this.y           = rand(0, h);
    this.tx          = rand(0, w);
    this.ty          = rand(0, h);
    this.speed       = rand(0.0003, 0.0008);
    this.phase       = rand(0, Math.PI * 2);
    this.opacityPhase= rand(0, Math.PI * 2);
    this.breatheAmp  = rand(0.08, 0.18);
    this.breatheFreq = rand(0.4, 0.9);
    this.pulseTimer  = rand(2, 6);
  }

  update(dt, speedMult) {
    const t = dt * speedMult;
    this.x = lerp(this.x, this.tx, this.speed * t * 60);
    this.y = lerp(this.y, this.ty, this.speed * t * 60);
    const dx = this.tx - this.x, dy = this.ty - this.y;
    if (dx * dx + dy * dy < 400) {
      this.tx = rand(this.radius, this.w - this.radius);
      this.ty = rand(this.radius, this.h - this.radius);
    }
    this.phase        += dt * this.breatheFreq * speedMult;
    this.opacityPhase += dt * 0.5 * speedMult;
    this.pulseTimer   -= dt * speedMult;
  }

  shouldPulse() {
    if (this.pulseTimer <= 0) { this.pulseTimer = rand(3, 8); return true; }
    return false;
  }

  draw(ctx, globalOpacity) {
    const scale   = 1 + Math.sin(this.phase) * this.breatheAmp;
    const r       = this.radius * scale;
    const opacity = globalOpacity * (0.55 + 0.45 * Math.sin(this.opacityPhase));
    const cr = Math.round(this.color.r);
    const cg = Math.round(this.color.g);
    const cb = Math.round(this.color.b);
    const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, r);
    grad.addColorStop(0,   `rgba(${cr},${cg},${cb},${opacity})`);
    grad.addColorStop(0.5, `rgba(${cr},${cg},${cb},${opacity * 0.4})`);
    grad.addColorStop(1,   `rgba(${cr},${cg},${cb},0)`);
    ctx.beginPath();
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// AnimationEngine
// ──────────────────────────────────────────────────────────────────────────────
export class AnimationEngine {
  constructor(canvas) {
    this.canvas   = canvas;
    this.ctx      = canvas.getContext('2d');
    this.orbs     = [];
    this.stars    = [];
    this.auroras  = [];
    this.pulses   = [];
    this.shooters = [];
    this._shooterTimer = rand(2, 6);

    // Live palette (mutated in place each frame for smooth transitions)
    this._palette       = generateCalmPalette();
    this._targetPalette = clonePalette(generateCalmPalette());
    this._colorTimer    = 30;      // seconds until next target change

    this.settings = { animationSpeed: 1.0, orbCount: 12, orbOpacity: 0.80 };
    this.fx       = { stars: true, aurora: true, shooting: true, lines: true };
    this._last    = null;
    this._raf     = null;
    this._running = false;
  }

  applySettings(s) {
    const needRebuild = s.orbCount !== undefined && s.orbCount !== this.settings.orbCount;
    this.settings = { ...this.settings, ...s };
    if (needRebuild) this._buildScene();
  }

  // Lerp the live palette toward the target each frame
  _stepPalette(dt, speedMult) {
    this._colorTimer -= dt * speedMult;
    if (this._colorTimer <= 0) {
      // Pick a fresh calming target; transition will carry us there over ~8–10s
      const next = generateCalmPalette();
      for (let i = 0; i < this._targetPalette.length; i++) {
        Object.assign(this._targetPalette[i], next[i]);
      }
      this._colorTimer = 30;
    }

    // Smooth exponential approach — ~90 % of the way in ~8 s
    const t = 1 - Math.exp(-dt * 0.38 * speedMult);
    for (let i = 0; i < this._palette.length; i++) {
      const cur = this._palette[i], tgt = this._targetPalette[i];
      cur.r += (tgt.r - cur.r) * t;
      cur.g += (tgt.g - cur.g) * t;
      cur.b += (tgt.b - cur.b) * t;
    }
  }

  _buildScene() {
    const { orbCount } = this.settings;
    const w = this.canvas.width, h = this.canvas.height;

    // Orbs — each references one of the 4 live palette entries (by value index)
    this.orbs = Array.from({ length: orbCount }, (_, i) =>
      new FloatingOrb(w, h, this._palette[i % this._palette.length])
    );

    // Starfield
    this.stars = Array.from({ length: 220 }, () => new Star(w, h));

    // Aurora waves — each references a live palette entry
    this.auroras = Array.from({ length: 4 }, (_, i) =>
      new AuroraWave(this._palette[i % this._palette.length])
    );

    // Ephemeral effects
    this.pulses   = [];
    this.shooters = Array.from({ length: 3 }, () => {
      const s = new ShootingStar(w, h); s.active = false; return s;
    });
    this._shooterTimer = rand(3, 8);
  }

  resize(w, h) {
    this.canvas.width  = w;
    this.canvas.height = h;
    this.orbs.forEach(o => { o.w = w; o.h = h; });
    this.stars.forEach(s => s.init(w, h));
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
    const { ctx, canvas } = this;
    const { animationSpeed, orbOpacity } = this.settings;
    const w = canvas.width, h = canvas.height;

    // ── Advance palette ───────────────────────────────────────────────────────
    this._stepPalette(dt, animationSpeed);

    // ── Background ────────────────────────────────────────────────────────────
    ctx.fillStyle = 'rgba(8, 8, 18, 0.22)';
    ctx.fillRect(0, 0, w, h);

    // ── Aurora waves ──────────────────────────────────────────────────────────
    if (this.fx.aurora) {
      ctx.globalCompositeOperation = 'screen';
      for (const a of this.auroras) {
        a.update(dt, animationSpeed);
        a.draw(ctx, w, h);
      }
    }

    // ── Stars ─────────────────────────────────────────────────────────────────
    if (this.fx.stars) {
      ctx.globalCompositeOperation = 'source-over';
      for (const s of this.stars) s.draw(ctx, dt * animationSpeed);
    }

    // ── Shooting stars ────────────────────────────────────────────────────────
    if (this.fx.shooting) {
      this._shooterTimer -= dt * animationSpeed;
      if (this._shooterTimer <= 0) {
        const idle = this.shooters.find(s => !s.active);
        if (idle) idle.reset(w, h);
        this._shooterTimer = rand(4, 12);
      }
      for (const ss of this.shooters) {
        ss.update(dt, animationSpeed);
        ss.draw(ctx);
      }
    }

    // ── Pulse rings ───────────────────────────────────────────────────────────
    ctx.globalCompositeOperation = 'screen';
    this.pulses = this.pulses.filter(p => !p.done);
    for (const p of this.pulses) {
      p.update(dt, animationSpeed);
      p.draw(ctx);
    }

    // ── Orbs ──────────────────────────────────────────────────────────────────
    ctx.globalCompositeOperation = 'screen';
    for (const orb of this.orbs) {
      orb.update(dt, animationSpeed);
      orb.draw(ctx, orbOpacity);
      if (orb.shouldPulse()) {
        this.pulses.push(new PulseRing(orb.x, orb.y, orb.color, orb.radius * rand(1.8, 3.2)));
      }
    }

    // ── Constellation lines ───────────────────────────────────────────────────
    if (this.fx.lines) {
      ctx.globalCompositeOperation = 'source-over';
      const MAX_LINK_D2 = 280 * 280;
      for (let i = 0; i < this.orbs.length; i++) {
        for (let j = i + 1; j < this.orbs.length; j++) {
          const oi = this.orbs[i], oj = this.orbs[j];
          const d2 = dist2(oi.x, oi.y, oj.x, oj.y);
          if (d2 < MAX_LINK_D2) {
            const alpha = (1 - d2 / MAX_LINK_D2) * 0.18 * orbOpacity;
            const cr = Math.round(oi.color.r);
            const cg = Math.round(oi.color.g);
            const cb = Math.round(oi.color.b);
            ctx.beginPath();
            ctx.moveTo(oi.x, oi.y);
            ctx.lineTo(oj.x, oj.y);
            ctx.strokeStyle = `rgba(${cr},${cg},${cb},${alpha})`;
            ctx.lineWidth   = 1;
            ctx.stroke();
          }
        }
      }
    }

    ctx.globalCompositeOperation = 'source-over';
  }
}
