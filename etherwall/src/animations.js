// ──────────────────────────────────────────────────────────────────────────────
// Color themes
// ──────────────────────────────────────────────────────────────────────────────
export const THEMES = [
  // 0 — Midnight
  [
    { r: 100, g:  80, b: 255 },
    { r:  60, g: 140, b: 255 },
    { r: 180, g:  60, b: 255 },
    { r:  40, g: 200, b: 220 },
  ],
  // 1 — Ocean
  [
    { r:   0, g: 180, b: 220 },
    { r:   0, g: 230, b: 200 },
    { r:  20, g: 100, b: 200 },
    { r:  60, g: 220, b: 255 },
  ],
  // 2 — Sunset
  [
    { r: 255, g:  80, b:  60 },
    { r: 255, g: 160, b:  40 },
    { r: 200, g:  40, b: 120 },
    { r: 255, g: 200, b:  60 },
  ],
  // 3 — Forest
  [
    { r:  40, g: 200, b:  80 },
    { r:  80, g: 255, b: 120 },
    { r:  20, g: 160, b: 100 },
    { r: 160, g: 220, b:  60 },
  ],
];

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────
function rand(min, max)     { return min + Math.random() * (max - min); }
function lerp(a, b, t)      { return a + (b - a) * t; }
function dist2(ax,ay,bx,by) { const dx=ax-bx,dy=ay-by; return dx*dx+dy*dy; }

// ──────────────────────────────────────────────────────────────────────────────
// Star (background starfield)
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
    const a = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(this.phase));
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
    this.w     = w;
    this.h     = h;
    this.x     = rand(-w * 0.2, w * 1.2);
    this.y     = rand(-h * 0.2, h * 0.4);
    const angle = rand(Math.PI * 0.05, Math.PI * 0.35);
    const speed = rand(600, 1400);
    this.vx    = Math.cos(angle) * speed;
    this.vy    = Math.sin(angle) * speed;
    this.life  = 1.0;
    this.decay = rand(0.6, 1.2);
    this.len   = rand(80, 220);
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
    const tx = this.x + nx * this.len;
    const ty = this.y + ny * this.len;
    const grad = ctx.createLinearGradient(this.x, this.y, tx, ty);
    grad.addColorStop(0, `rgba(255,255,255,${this.life * 0.9})`);
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(tx, ty);
    ctx.strokeStyle = grad;
    ctx.lineWidth   = this.life * 2.5;
    ctx.stroke();
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// PulseRing  (expands from an orb centre)
// ──────────────────────────────────────────────────────────────────────────────
class PulseRing {
  constructor(x, y, color, maxR) {
    this.x = x; this.y = y; this.color = color;
    this.r    = 0;
    this.maxR = maxR;
    this.life = 1.0;
    this.done = false;
  }

  update(dt, speedMult) {
    this.r    += dt * speedMult * 160;
    this.life  = 1 - this.r / this.maxR;
    if (this.r >= this.maxR) this.done = true;
  }

  draw(ctx) {
    const { r: cr, g: cg, b: cb } = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${cr},${cg},${cb},${this.life * 0.45})`;
    ctx.lineWidth   = this.life * 3.5;
    ctx.stroke();
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// AuroraWave  (flowing sine bands across the lower screen)
// ──────────────────────────────────────────────────────────────────────────────
class AuroraWave {
  constructor(theme) {
    this.t     = rand(0, Math.PI * 2);
    this.speed = rand(0.08, 0.18);
    this.amp   = rand(30, 90);
    this.freq  = rand(0.003, 0.008);
    this.yBase = rand(0.55, 0.90);   // fraction of screen height
    this.height = rand(60, 130);
    this.colorIdx = Math.floor(rand(0, theme.length));
    this.theme = theme;
  }

  update(dt, speedMult) {
    this.t += dt * this.speed * speedMult;
  }

  draw(ctx, w, h) {
    const { r: cr, g: cg, b: cb } = this.theme[this.colorIdx];
    const yBase = this.yBase * h;
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 4) {
      const y = yBase + Math.sin(x * this.freq + this.t) * this.amp
                      + Math.sin(x * this.freq * 1.7 + this.t * 1.3) * this.amp * 0.4;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, yBase - this.height, 0, h);
    grad.addColorStop(0,   `rgba(${cr},${cg},${cb},0)`);
    grad.addColorStop(0.4, `rgba(${cr},${cg},${cb},0.07)`);
    grad.addColorStop(1,   `rgba(${cr},${cg},${cb},0)`);
    ctx.fillStyle = grad;
    ctx.fill();
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// FloatingOrb
// ──────────────────────────────────────────────────────────────────────────────
export class FloatingOrb {
  constructor(w, h, color) {
    this.w = w; this.h = h; this.color = color;
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
    // pulse
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
    if (this.pulseTimer <= 0) {
      this.pulseTimer = rand(3, 8);
      return true;
    }
    return false;
  }

  draw(ctx, globalOpacity) {
    const scale   = 1 + Math.sin(this.phase) * this.breatheAmp;
    const r       = this.radius * scale;
    const opacity = globalOpacity * (0.55 + 0.45 * Math.sin(this.opacityPhase));
    const { r: cr, g: cg, b: cb } = this.color;
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
    this.settings = { animationSpeed: 1.0, orbCount: 12, orbOpacity: 0.80, colorTheme: 0 };
    // per-effect on/off flags
    this.fx = { stars: true, aurora: true, shooting: true, lines: true };
    this._last    = null;
    this._raf     = null;
    this._running = false;
  }

  applySettings(s) {
    const needRebuild = s.orbCount !== this.settings.orbCount
                     || s.colorTheme !== this.settings.colorTheme;
    this.settings = { ...this.settings, ...s };
    if (needRebuild) this._buildScene();
  }

  _buildScene() {
    const { orbCount, colorTheme } = this.settings;
    const palette = THEMES[colorTheme] || THEMES[0];
    const w = this.canvas.width, h = this.canvas.height;

    // Orbs
    this.orbs = Array.from({ length: orbCount }, (_, i) =>
      new FloatingOrb(w, h, palette[i % palette.length])
    );

    // Stars — fixed count independent of orbs
    this.stars = Array.from({ length: 220 }, () => new Star(w, h));

    // Aurora waves — 3–4 layered bands
    this.auroras = Array.from({ length: 4 }, () => new AuroraWave(palette));

    // Clear ephemeral effects
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
            const alpha = (1 - d2 / MAX_LINK_D2) * 0.20 * orbOpacity;
            const { r: cr, g: cg, b: cb } = oi.color;
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
