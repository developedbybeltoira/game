// audio.js — Web Audio API sound engine
window._audio = {};
window._sfxOn = true;
let _actx = null;

function getACtx() {
  if (!_actx) _actx = new (window.AudioContext || window.webkitAudioContext)();
  if (_actx.state === 'suspended') _actx.resume();
  return _actx;
}

function playSFX(type) {
  if (!window._sfxOn) return;
  try {
    const ctx = getACtx();
    const g = ctx.createGain();
    g.connect(ctx.destination);
    const now = ctx.currentTime;

    if (type === 'shoot_pistol') {
      const b = ctx.createOscillator(); b.connect(g);
      b.type = 'sawtooth'; b.frequency.setValueAtTime(220, now);
      b.frequency.exponentialRampToValueAtTime(40, now + 0.12);
      g.gain.setValueAtTime(0.25, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      b.start(now); b.stop(now + 0.15);
    } else if (type === 'shoot_rifle') {
      const b = ctx.createOscillator(); const n = ctx.createOscillator();
      b.connect(g); n.connect(g);
      b.type = 'sawtooth'; b.frequency.setValueAtTime(300, now);
      b.frequency.exponentialRampToValueAtTime(50, now + 0.09);
      n.type = 'square'; n.frequency.setValueAtTime(180, now);
      n.frequency.exponentialRampToValueAtTime(30, now + 0.09);
      g.gain.setValueAtTime(0.18, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      b.start(now); b.stop(now + 0.12); n.start(now); n.stop(now + 0.12);
    } else if (type === 'shoot_sniper') {
      const b = ctx.createOscillator(); b.connect(g);
      b.type = 'sawtooth'; b.frequency.setValueAtTime(600, now);
      b.frequency.exponentialRampToValueAtTime(30, now + 0.4);
      g.gain.setValueAtTime(0.35, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      b.start(now); b.stop(now + 0.45);
    } else if (type === 'shoot_shotgun') {
      for (let i = 0; i < 4; i++) {
        const b = ctx.createOscillator(); const _g = ctx.createGain();
        b.connect(_g); _g.connect(ctx.destination);
        b.type = 'sawtooth';
        b.frequency.setValueAtTime(200 + Math.random() * 200, now + i * 0.01);
        b.frequency.exponentialRampToValueAtTime(30, now + 0.15);
        _g.gain.setValueAtTime(0.12, now + i * 0.01);
        _g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        b.start(now + i * 0.01); b.stop(now + 0.2);
      }
    } else if (type === 'grenade_throw') {
      const b = ctx.createOscillator(); b.connect(g);
      b.type = 'sine'; b.frequency.setValueAtTime(400, now);
      b.frequency.exponentialRampToValueAtTime(200, now + 0.1);
      g.gain.setValueAtTime(0.1, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      b.start(now); b.stop(now + 0.13);
    } else if (type === 'explosion') {
      const b = ctx.createOscillator(); b.connect(g);
      b.type = 'sawtooth'; b.frequency.setValueAtTime(80, now);
      b.frequency.exponentialRampToValueAtTime(20, now + 0.8);
      g.gain.setValueAtTime(0.5, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
      b.start(now); b.stop(now + 0.95);
    } else if (type === 'reload') {
      const b = ctx.createOscillator(); b.connect(g);
      b.type = 'square'; b.frequency.setValueAtTime(800, now);
      b.frequency.setValueAtTime(400, now + 0.05);
      g.gain.setValueAtTime(0.06, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      b.start(now); b.stop(now + 0.1);
    } else if (type === 'heal') {
      const b = ctx.createOscillator(); b.connect(g);
      b.type = 'sine';
      b.frequency.setValueAtTime(600, now); b.frequency.setValueAtTime(800, now + 0.1);
      b.frequency.setValueAtTime(1000, now + 0.2);
      g.gain.setValueAtTime(0.08, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      b.start(now); b.stop(now + 0.35);
    } else if (type === 'pickup') {
      const b = ctx.createOscillator(); b.connect(g);
      b.type = 'sine'; b.frequency.setValueAtTime(700, now);
      b.frequency.setValueAtTime(1100, now + 0.05);
      g.gain.setValueAtTime(0.1, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      b.start(now); b.stop(now + 0.2);
    } else if (type === 'footstep') {
      const b = ctx.createOscillator(); b.connect(g);
      b.type = 'sine'; b.frequency.setValueAtTime(60, now);
      g.gain.setValueAtTime(0.04, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      b.start(now); b.stop(now + 0.06);
    } else if (type === 'vehicle_start') {
      const b = ctx.createOscillator(); b.connect(g);
      b.type = 'sawtooth'; b.frequency.setValueAtTime(50, now);
      b.frequency.linearRampToValueAtTime(120, now + 0.5);
      g.gain.setValueAtTime(0.2, now); g.gain.setValueAtTime(0.15, now + 0.5);
      b.start(now); b.stop(now + 0.55);
    } else if (type === 'hit') {
      const b = ctx.createOscillator(); b.connect(g);
      b.type = 'square'; b.frequency.setValueAtTime(200, now);
      b.frequency.exponentialRampToValueAtTime(80, now + 0.06);
      g.gain.setValueAtTime(0.12, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      b.start(now); b.stop(now + 0.09);
    }
  } catch(e) {}
}

// Ambient city sound
function startCityAmbience() {
  try {
    const ctx = getACtx();
    const bufSize = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * 0.015;
    const src = ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass'; filt.frequency.value = 300;
    src.connect(filt); filt.connect(ctx.destination);
    src.start();
    window._ambience = src;
  } catch(e) {}
}

function stopCityAmbience() {
  try { window._ambience?.stop(); } catch(e) {}
  window._ambience = null;
}

function toggleMusic(on) {
  const a = document.getElementById('bgMusic');
  if (!a) return;
  if (on) { a.play().catch(() => {}); }
  else a.pause();
}

function uploadMusic(inp) {
  const f = inp.files[0]; if (!f) return;
  const url = URL.createObjectURL(f);
  const a = document.getElementById('bgMusic');
  if (a) { a.src = url; a.play().catch(() => {}); }
  const nm = document.getElementById('musicNameDisp');
  const row = document.getElementById('musicRow');
  if (nm) nm.textContent = f.name;
  if (row) row.classList.remove('hidden');
}

// Auto-start ambient loop music using oscillators
function startBGMusic() {
  try {
    const ctx = getACtx();
    const master = ctx.createGain(); master.gain.value = 0.07;
    master.connect(ctx.destination);
    // Deep pulse bass
    const bass = ctx.createOscillator();
    bass.type = 'sine'; bass.frequency.value = 55;
    const bassGain = ctx.createGain(); bassGain.gain.value = 0.8;
    bass.connect(bassGain); bassGain.connect(master);
    bass.start();
    // Pads
    [110, 165, 220].forEach((freq, i) => {
      const pad = ctx.createOscillator();
      pad.type = 'triangle'; pad.frequency.value = freq;
      const pg = ctx.createGain(); pg.gain.value = 0.15;
      pad.connect(pg); pg.connect(master);
      pad.start();
      // Slow LFO
      const lfo = ctx.createOscillator(); lfo.type = 'sine';
      lfo.frequency.value = 0.1 + i * 0.07;
      const lg = ctx.createGain(); lg.gain.value = 0.04;
      lfo.connect(lg); lg.connect(pg.gain); lfo.start();
    });
    window._bgMusicCtx = { ctx, master };
  } catch(e) {}
}

// Auto-load game.mp3 if it exists in same folder
window.addEventListener('DOMContentLoaded', () => {
  const audio = document.getElementById('bgMusic');
  if (audio) {
    audio.src = 'game.mp3';
    audio.volume = 0.35;
    // Will silently fail if file not found — user adds their own game.mp3
    audio.load();
  }
});

function startBGMusic() {
  const audio = document.getElementById('bgMusic');
  if (!audio) return;
  if (audio.src && audio.src !== window.location.href) {
    audio.play().catch(() => {});
  } else {
    startBGMusicOscillator();
  }
}

function startBGMusicOscillator() {
  try {
    const ctx = getACtx();
    if (window._bgMusicNodes) return;
    const master = ctx.createGain(); master.gain.value = 0.06; master.connect(ctx.destination);
    window._bgMusicNodes = [master];
    // Deep bass pulse
    const bass = ctx.createOscillator(); bass.type='sine'; bass.frequency.value=54;
    const bg2 = ctx.createGain(); bg2.gain.value=0.9; bass.connect(bg2); bg2.connect(master);
    bass.start(); window._bgMusicNodes.push(bass);
    // Slow pad
    [110,165].forEach(f => {
      const osc = ctx.createOscillator(); osc.type='triangle'; osc.frequency.value=f;
      const g2 = ctx.createGain(); g2.gain.value=0.18; osc.connect(g2); g2.connect(master);
      const lfo = ctx.createOscillator(); lfo.type='sine'; lfo.frequency.value=0.08;
      const lg = ctx.createGain(); lg.gain.value=0.05; lfo.connect(lg); lg.connect(g2.gain);
      osc.start(); lfo.start(); window._bgMusicNodes.push(osc, lfo);
    });
  } catch(e) {}
}
