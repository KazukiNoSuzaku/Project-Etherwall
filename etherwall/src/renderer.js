import './index.css';
import { AnimationEngine } from './animations.js';
import { MusicEngine }     from './music.js';

const api = window.etherwall;

// ── DOM refs ──────────────────────────────────────────────────────────────────
const canvas      = document.getElementById('canvas');
const overlay     = document.getElementById('settings-overlay');
const fxRow       = document.getElementById('fx-row');
const sliders     = {
  orbCount:   document.getElementById('orb-count'),
  animSpeed:  document.getElementById('anim-speed'),
  orbOpacity: document.getElementById('orb-opacity'),
  musicVol:   document.getElementById('music-vol'),
};
const vals = {
  orbCount:   document.getElementById('orb-count-val'),
  animSpeed:  document.getElementById('anim-speed-val'),
  orbOpacity: document.getElementById('orb-opacity-val'),
  musicVol:   document.getElementById('music-vol-val'),
};
const modePills     = document.querySelectorAll('.mode-pill');
const fxToggles     = document.querySelectorAll('.fx-toggle');
const btnMusic      = document.getElementById('btn-music');
const btnQuit       = document.getElementById('btn-quit');
const btnFullscreen = document.getElementById('btn-fullscreen');

// ── Engines ───────────────────────────────────────────────────────────────────
const engine = new AnimationEngine(canvas);
const music  = new MusicEngine();

function resizeCanvas() { engine.resize(window.innerWidth, window.innerHeight); }
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  const s = await api.getSettings();
  engine.applySettings(s);
  syncUI(s);
  engine.start();

  // Auto-start music (autoplay policy is disabled in main.js)
  await music.start();
  if (music.playing) {
    btnMusic.textContent = '■ Off';
    btnMusic.classList.add('active');
  }
}
init();

// ── Sync UI ───────────────────────────────────────────────────────────────────
function syncUI(s) {
  sliders.orbCount.value   = s.orbCount;
  sliders.animSpeed.value  = s.animationSpeed;
  sliders.orbOpacity.value = s.orbOpacity;
  vals.orbCount.textContent   = s.orbCount;
  vals.animSpeed.textContent  = `${Number(s.animationSpeed).toFixed(1)}×`;
  vals.orbOpacity.textContent = `${Math.round(s.orbOpacity * 100)}%`;
  fxToggles.forEach(b => b.classList.toggle('active', engine.fx[b.dataset.fx] !== false));
  // Show FX row only in orbs mode
  fxRow.style.display = engine.mode === 0 ? '' : 'none';
}

// ── Mode pills ────────────────────────────────────────────────────────────────
modePills.forEach(pill => {
  pill.addEventListener('click', () => {
    const m = Number(pill.dataset.mode);
    modePills.forEach(p => p.classList.toggle('active', p === pill));
    engine.setMode(m);
    fxRow.style.display = m === 0 ? '' : 'none';
  });
});

// ── Sliders ───────────────────────────────────────────────────────────────────
let debounceTimer = null;
function scheduleSave(patch) {
  engine.applySettings(patch);
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    const s = await api.saveSettings(patch);
    syncUI(s);
  }, 120);
}

sliders.orbCount.addEventListener('input', e => {
  const v = Number(e.target.value);
  vals.orbCount.textContent = v;
  scheduleSave({ orbCount: v });
});
sliders.animSpeed.addEventListener('input', e => {
  const v = Number(e.target.value);
  vals.animSpeed.textContent = `${v.toFixed(1)}×`;
  scheduleSave({ animationSpeed: v });
});
sliders.orbOpacity.addEventListener('input', e => {
  const v = Number(e.target.value);
  vals.orbOpacity.textContent = `${Math.round(v * 100)}%`;
  scheduleSave({ orbOpacity: v });
});

// ── FX toggles ────────────────────────────────────────────────────────────────
fxToggles.forEach(btn => {
  btn.addEventListener('click', () => {
    const key = btn.dataset.fx;
    engine.fx[key] = !engine.fx[key];
    btn.classList.toggle('active', engine.fx[key]);
  });
});

// ── Music ─────────────────────────────────────────────────────────────────────
btnMusic.addEventListener('click', async () => {
  if (music.playing) {
    music.stop();
    btnMusic.textContent = '▶ On';
    btnMusic.classList.remove('active');
  } else {
    await music.start();
    btnMusic.textContent = '■ Off';
    btnMusic.classList.add('active');
  }
});

sliders.musicVol.addEventListener('input', e => {
  const v = Number(e.target.value);
  vals.musicVol.textContent = `${Math.round(v * 100)}%`;
  music.setVolume(v);
});

// ── Control buttons ───────────────────────────────────────────────────────────
btnQuit.addEventListener('click',       () => api.quitApp());
btnFullscreen.addEventListener('click', () => api.toggleFullscreen());

// ── Cursor auto-hide (visible on move, hidden after 3 s idle) ────────────────
let cursorTimer = null;
document.addEventListener('mousemove', () => {
  document.body.classList.remove('cursor-idle');
  clearTimeout(cursorTimer);
  cursorTimer = setTimeout(() => document.body.classList.add('cursor-idle'), 3000);
});

// ── Settings reveal (top-right corner) ───────────────────────────────────────
const REVEAL_ZONE = 150;
let hideTimer = null;

document.addEventListener('mousemove', e => {
  const nearCorner = e.clientX > window.innerWidth - REVEAL_ZONE && e.clientY < REVEAL_ZONE;
  if (nearCorner) {
    clearTimeout(hideTimer);
    overlay.classList.remove('hidden');
    overlay.classList.add('visible');
  } else if (!overlay.matches(':hover')) {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      overlay.classList.remove('visible');
      overlay.classList.add('hidden');
    }, 1200);
  }
});
overlay.addEventListener('mouseenter', () => clearTimeout(hideTimer));
overlay.addEventListener('mouseleave', () => {
  hideTimer = setTimeout(() => {
    overlay.classList.remove('visible');
    overlay.classList.add('hidden');
  }, 800);
});

// ── Escape ────────────────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (overlay.classList.contains('visible')) {
      overlay.classList.remove('visible');
      overlay.classList.add('hidden');
    } else {
      api.quitApp();
    }
  }
});
