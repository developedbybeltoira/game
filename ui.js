// ══════════════════════════════════════════════════
//  ui.js — Home Screen, Shop, HUD, Kill Feed
// ══════════════════════════════════════════════════

// ──────────────────────────────────────────────────
// Screen management
// ──────────────────────────────────────────────────
function showScreen(id) {
  ['homeScreen', 'shopScreen', 'settingsScreen', 'gameContainer'].forEach(s => {
    document.getElementById(s)?.classList.add('hidden');
  });
  document.getElementById(id)?.classList.remove('hidden');
}

function openShop() {
  renderShop('shopGrid');
  showScreen('shopScreen');
}
function closeShop() { showScreen('homeScreen'); }

function openSettings() {
  showScreen('settingsScreen');
}
function closeSettings() { showScreen('homeScreen'); }

function openInGameShop() {
  renderShop('igsGrid', true);
  document.getElementById('inGameShop')?.classList.remove('hidden');
  document.getElementById('pauseMenu')?.classList.add('hidden');
}
function closeInGameShop() {
  document.getElementById('inGameShop')?.classList.add('hidden');
}

function openUpgrade() {
  // For now, show XP progress panel
  alert(`Level ${window.currentPlayer.level} — ${window.currentPlayer.xp} XP\nEarn XP by getting kills!`);
}

// ──────────────────────────────────────────────────
// Render weapon shop cards
// ──────────────────────────────────────────────────
function renderShop(containerId, compact = false) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const coins = window.currentPlayer.coins;
  document.getElementById('shopCoins').textContent = coins;

  container.innerHTML = '';

  Object.values(WEAPONS).forEach(w => {
    const owned = window.currentPlayer.ownedWeapons.includes(w.id);
    const equipped = window.currentPlayer.equippedWeapon === w.id;
    const canAfford = coins >= w.price;

    const card = document.createElement('div');
    card.className = `shop-card${owned ? ' owned' : ''}${equipped ? ' equipped' : ''}`;

    card.innerHTML = `
      <div class="weapon-icon-wrap">
        <svg class="weapon-svg" viewBox="0 0 44 30" xmlns="http://www.w3.org/2000/svg">
          ${w.svgPath}
        </svg>
      </div>
      <div class="weapon-card-name" style="color:${w.color}">${w.name}</div>
      ${compact ? '' : `
      <div class="weapon-card-stats">
        <div class="weapon-stat-row"><span>DMG</span><div class="weapon-stat-bar"><div class="weapon-stat-fill" style="width:${w.dmgStat*10}%;background:${w.color}"></div></div></div>
        <div class="weapon-stat-row"><span>SPD</span><div class="weapon-stat-bar"><div class="weapon-stat-fill" style="width:${w.speedStat*10}%;background:${w.color}"></div></div></div>
        <div class="weapon-stat-row"><span>RNG</span><div class="weapon-stat-bar"><div class="weapon-stat-fill" style="width:${w.rangeStat*10}%;background:${w.color}"></div></div></div>
        <div class="weapon-stat-row"><span>ACC</span><div class="weapon-stat-bar"><div class="weapon-stat-fill" style="width:${w.accStat*10}%;background:${w.color}"></div></div></div>
      </div>`}
      <div class="shop-card-price">
        ${equipped ? '<span style="color:#f0c040;font-size:0.7rem">★ EQUIPPED</span>' :
          owned ? '<span style="color:#00ff88;font-size:0.7rem">✓ OWNED</span>' :
          `<svg viewBox="0 0 24 24" width="14" height="14"><circle cx="12" cy="12" r="10" fill="#f0c040"/></svg> ${w.price}`}
      </div>
      <div class="shop-card-btns">
        ${!owned && w.price > 0 ? `<button class="shop-buy-btn" onclick="buyWeapon('${w.id}')" ${canAfford ? '' : 'disabled style="opacity:0.4"'}>BUY</button>` : ''}
        ${owned && !equipped ? `<button class="shop-equip-btn" onclick="equipFromShop('${w.id}')">EQUIP</button>` : ''}
        ${w.price === 0 && !equipped ? `<button class="shop-equip-btn" onclick="equipFromShop('${w.id}')">EQUIP</button>` : ''}
      </div>
    `;
    container.appendChild(card);
  });
}

function buyWeapon(id) {
  const w = WEAPONS[id];
  if (!w) return;
  if (window.currentPlayer.ownedWeapons.includes(id)) return;
  if (!spendCoins(w.price)) {
    showFloatingText('NOT ENOUGH COINS', '#ff3c5f');
    return;
  }
  window.currentPlayer.ownedWeapons.push(id);
  showFloatingText(`${w.name} PURCHASED!`, '#00ff88');
  savePlayerData();
  renderShop(document.getElementById('igsGrid') ? 'igsGrid' : 'shopGrid',
    !!document.getElementById('igsGrid')?.closest('.in-game-shop'));
  updateProfileUI();
}

function equipFromShop(id) {
  if (!window.currentPlayer.ownedWeapons.includes(id)) return;
  equipWeapon(id);
  window.currentPlayer.equippedWeapon = id;
  savePlayerData();
  const inGame = !!window.gameRunning;
  renderShop(inGame ? 'igsGrid' : 'shopGrid', inGame);
  showFloatingText(`${WEAPONS[id].name} EQUIPPED`, '#00c8ff');
}

// ──────────────────────────────────────────────────
// HUD updates
// ──────────────────────────────────────────────────
function updateHUD() {
  const ps = window._playerState;
  const pct = (ps.health / ps.maxHealth) * 100;
  const bar = document.getElementById('healthBar');
  const val = document.getElementById('healthVal');
  const kills = document.getElementById('killCount');

  if (bar) {
    bar.style.width = pct + '%';
    bar.style.background = pct > 50
      ? 'linear-gradient(90deg,#ff3c5f,#ff8040)'
      : pct > 25
        ? 'linear-gradient(90deg,#ff8040,#ffcc00)'
        : 'linear-gradient(90deg,#ff3c5f,#ff0000)';
  }
  if (val) val.textContent = Math.ceil(ps.health);
  if (kills) kills.textContent = window.currentPlayer.kills;
}

// ──────────────────────────────────────────────────
// Kill Feed
// ──────────────────────────────────────────────────
function addKillFeedEntry(killer, victim, weapon) {
  const feed = document.getElementById('killFeed');
  if (!feed) return;
  const entry = document.createElement('div');
  entry.className = 'kill-entry';
  entry.innerHTML = `
    <span class="killer">${killer.toUpperCase()}</span>
    <span class="weapon-tag"> [${weapon}] </span>
    <span class="victim">${victim.toUpperCase()}</span>
  `;
  feed.appendChild(entry);
  setTimeout(() => entry.remove(), 3000);
  // Max 5 entries
  while (feed.children.length > 5) feed.removeChild(feed.firstChild);
}

// ──────────────────────────────────────────────────
// Timer
// ──────────────────────────────────────────────────
window._gameTimer = 300; // 5 minutes
window._timerInterval = null;

function startTimer() {
  window._gameTimer = 300;
  clearInterval(window._timerInterval);
  window._timerInterval = setInterval(() => {
    window._gameTimer = Math.max(0, window._gameTimer - 1);
    const m = Math.floor(window._gameTimer / 60);
    const s = window._gameTimer % 60;
    const el = document.getElementById('hudTimer');
    if (el) el.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    if (window._gameTimer <= 0) {
      clearInterval(window._timerInterval);
      triggerGameOver();
    }
  }, 1000);
}

// ──────────────────────────────────────────────────
// Minimap
// ──────────────────────────────────────────────────
function drawMinimap() {
  const canvas = document.getElementById('minimap');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const SCALE = 0.9;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, W, H);

  const worldToMap = (wx, wz) => ({
    x: W/2 + wx * SCALE,
    y: H/2 + wz * SCALE,
  });

  // Draw buildings (rough rectangles)
  ctx.fillStyle = 'rgba(100,120,160,0.5)';
  (window._buildingBounds || []).forEach(b => {
    const p = worldToMap(b.x, b.z);
    ctx.fillRect(p.x - b.w*SCALE/2, p.y - b.d*SCALE/2, b.w*SCALE, b.d*SCALE);
  });

  // Enemies
  (window._enemies || []).forEach(e => {
    const p = worldToMap(e.mesh?.position.x || 0, e.mesh?.position.z || 0);
    ctx.fillStyle = '#ff6020';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  });

  // Remote players
  Object.values(window._mpPlayers || {}).forEach(mp => {
    const p = worldToMap(mp.mesh?.position.x || 0, mp.mesh?.position.z || 0);
    ctx.fillStyle = '#ff3c5f';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
  });

  // Player (center)
  ctx.fillStyle = '#00ff88';
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(W/2, H/2, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Player direction indicator
  const cam = window._camera;
  if (cam) {
    const angle = -cam.rotation.y;
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(W/2, H/2);
    ctx.lineTo(W/2 + Math.sin(angle) * 8, H/2 - Math.cos(angle) * 8);
    ctx.stroke();
  }

  // Vehicles
  (window._vehicles || []).forEach(v => {
    const p = worldToMap(v.mesh?.position.x || 0, v.mesh?.position.z || 0);
    ctx.fillStyle = '#f0c040';
    ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
  });
}

// ──────────────────────────────────────────────────
// Music / Settings
// ──────────────────────────────────────────────────
function toggleMusic(on) {
  const audio = document.getElementById('bgMusic');
  if (!audio) return;
  if (on) audio.play().catch(() => {});
  else audio.pause();
}

function toggleSFX(on) {
  window._sfxEnabled = on;
}

function uploadMusic(input) {
  const file = input.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  const audio = document.getElementById('bgMusic');
  if (audio) {
    audio.src = url;
    audio.play().catch(() => {});
  }
  const nameEl = document.getElementById('currentMusicName');
  if (nameEl) nameEl.textContent = file.name;
  document.getElementById('currentMusicRow').style.display = 'flex';
}

function playSFX(type) {
  if (!window._sfxEnabled && window._sfxEnabled !== undefined) return;
  const ctx = window._audioCtx || (window._audioCtx = new (window.AudioContext || window.webkitAudioContext)());
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  if (type === 'shoot') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
  } else if (type === 'footstep') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, ctx.currentTime);
    gain.gain.setValueAtTime(0.03, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.06);
  }
}

// ──────────────────────────────────────────────────
// Floating text (damage / loot popups)
// ──────────────────────────────────────────────────
function showFloatingText(text, color = '#ffffff') {
  const el = document.createElement('div');
  el.style.cssText = `
    position:fixed;
    top:${30 + Math.random() * 20}%;
    left:${40 + Math.random() * 20}%;
    transform:translateX(-50%);
    font-family:var(--font-head);font-size:1rem;font-weight:700;
    letter-spacing:0.1em;color:${color};
    text-shadow:0 2px 8px rgba(0,0,0,0.8);
    pointer-events:none;z-index:80;
    animation:fadeInUp 0.3s ease,killFade 1.5s ease 0.2s forwards;
  `;
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2000);
}

// ──────────────────────────────────────────────────
// Game Over
// ──────────────────────────────────────────────────
function triggerGameOver() {
  if (!window.gameRunning) return;
  window.gameRunning = false;
  clearInterval(window._timerInterval);

  const elapsed = 300 - window._gameTimer;
  const kills = window.currentPlayer.kills;
  const xpEarned = kills * 50;
  const coinsEarned = kills * 25;

  document.getElementById('goKills').textContent = kills;
  document.getElementById('goTime').textContent = `${Math.floor(elapsed/60)}:${String(elapsed%60).padStart(2,'0')}`;
  document.getElementById('goXP').textContent = `+${xpEarned}`;
  document.getElementById('goCoins').textContent = `+${coinsEarned}`;

  const isVictory = window._enemies.length === 0 || window._gameTimer === 0 && kills > 0;
  document.getElementById('goTitle').textContent = isVictory ? 'VICTORY' : 'ELIMINATED';
  document.getElementById('goTitle').style.color = isVictory ? '#00ff88' : '#ff3c5f';

  addXP(xpEarned);
  addCoins(coinsEarned);
  savePlayerData();
  leaveMultiplayer();

  setTimeout(() => {
    document.getElementById('gameOver')?.classList.remove('hidden');
  }, 600);
}

function playAgain() {
  document.getElementById('gameOver')?.classList.add('hidden');
  startGame(window._currentMode || 'solo');
}

function exitToMenu() {
  document.getElementById('gameOver')?.classList.add('hidden');
  document.getElementById('pauseMenu')?.classList.add('hidden');
  window.gameRunning = false;
  clearInterval(window._timerInterval);
  leaveMultiplayer();
  // Remove name tags
  document.querySelectorAll('.player-name-tag').forEach(el => el.remove());
  showScreen('homeScreen');
}

// ──────────────────────────────────────────────────
// Pause
// ──────────────────────────────────────────────────
function pauseGame() {
  window.gamePaused = true;
  document.getElementById('pauseMenu')?.classList.remove('hidden');
}

function resumeGame() {
  window.gamePaused = false;
  document.getElementById('pauseMenu')?.classList.add('hidden');
}
