// ui.js — HUD, shop, kill feed, screens, timer, minimap, game over
// ─────────────────────────────────────────────────────────────────────
// SCREEN MANAGEMENT
// ─────────────────────────────────────────────────────────────────────
function openShop()    { renderShop('shopGrid'); document.getElementById('shopScreen').classList.remove('hidden'); }
function closeShop()   { document.getElementById('shopScreen').classList.add('hidden'); }
function openSettings(){ document.getElementById('settingsScreen').classList.remove('hidden'); }
function closeSettings(){ document.getElementById('settingsScreen').classList.add('hidden'); }
function openUpgrade() { renderUpgrade(); document.getElementById('upgradeScreen').classList.remove('hidden'); }
function closeUpgrade(){ document.getElementById('upgradeScreen').classList.add('hidden'); }
function openInGameShop(){ renderShop('igsGrid',true); document.getElementById('inGameShop').classList.remove('hidden'); }
function closeInGameShop(){ document.getElementById('inGameShop').classList.add('hidden'); }

function openMultiMenu(){
  document.getElementById('multiMenu').classList.remove('hidden');
  updateOnlineCount();
}
function closeMultiMenu(){ document.getElementById('multiMenu').classList.add('hidden'); }

function pauseGame()  { window.gamePaused=true;  document.getElementById('pauseMenu').classList.remove('hidden'); }
function resumeGame() { window.gamePaused=false; document.getElementById('pauseMenu').classList.add('hidden'); }

function exitToMenu() {
  window.gameRunning=false;
  clearInterval(window._timerInterval);
  leaveMP?.();
  stopCityAmbience?.();
  document.querySelectorAll('.name-tag').forEach(e=>e.remove());
  ['gameContainer','pauseMenu','gameOver','inGameShop'].forEach(id=>document.getElementById(id)?.classList.add('hidden'));
  document.getElementById('homeScreen').classList.remove('hidden');
  savePlayerData();
}

function playAgain() {
  document.getElementById('gameOver').classList.add('hidden');
  startGame(window._currentMode||'agents');
}

// ─────────────────────────────────────────────────────────────────────
// LIVES + HUD
// ─────────────────────────────────────────────────────────────────────
function updateHUD() {
  const ps=window._PS;
  const hb=document.getElementById('healthBar');
  const hv=document.getElementById('healthVal');
  const ab=document.getElementById('armorBar');
  const av=document.getElementById('armorVal');
  const kb=document.getElementById('killCount');
  if(hb){ hb.style.width=(ps.health/ps.maxHealth*100)+'%'; }
  if(hv) hv.textContent=Math.ceil(ps.health);
  if(ab){ ab.style.width=(ps.armor/100*100)+'%'; }
  if(av) av.textContent=Math.ceil(ps.armor);
  if(kb) kb.textContent=window.currentPlayer.kills||0;
}
function updateGearHUD(){
  const gc=document.getElementById('grenCount'); if(gc) gc.textContent=window.currentPlayer.grenades||0;
  const mc=document.getElementById('medCount');  if(mc) mc.textContent=window.currentPlayer.medkits||0;
}

// ─────────────────────────────────────────────────────────────────────
// TIMER
// ─────────────────────────────────────────────────────────────────────
function startTimer(secs){
  let t=secs; clearInterval(window._timerInterval);
  window._timerInterval=setInterval(()=>{
    t=Math.max(0,t-1);
    const el=document.getElementById('hudTimer');
    if(el) el.textContent=`${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`;
    if(t<=0){ clearInterval(window._timerInterval); triggerGameOver(); }
  },1000);
}

// ─────────────────────────────────────────────────────────────────────
// GAME OVER — 2-lives system
// ─────────────────────────────────────────────────────────────────────
function triggerGameOver() {
  if(!window.gameRunning) return;
  window._lives = (window._lives||2) - 1;
  updateLivesDisplay();

  if (window._lives > 0) {
    // Respawn!
    window._PS.health = window._PS.maxHealth;
    window._PS.armor  = 0;
    if(window._playerMesh) { window._playerMesh.position.set(Math.random()*10-5, 0, Math.random()*10-5); }
    // Flash red + message
    const dv=document.getElementById('damageVignette');
    if(dv){ dv.classList.remove('flash'); void dv.offsetWidth; dv.classList.add('flash'); }
    showFloaty('RESPAWNING... ' + window._lives + ' LIFE LEFT', '#ff4444');
    updateHUD();
    return;
  }

  // Real game over
  window.gameRunning=false;
  clearInterval(window._timerInterval);
  leaveMP?.();

  const elapsed=Math.floor(window._gameTime||0);
  const kills=window.currentPlayer.kills||0;
  const xp=kills*60; const coins=kills*30;
  document.getElementById('goKills').textContent=kills;
  document.getElementById('goTime').textContent=`${Math.floor(elapsed/60)}:${String(elapsed%60).padStart(2,'0')}`;
  document.getElementById('goXP').textContent=`+${xp}`;
  document.getElementById('goCoins').textContent=`+${coins}`;

  const isWin=window._enemies?.length===0;
  const goT=document.getElementById('goTitle');
  goT.textContent=isWin?'VICTORY':'YOU DIED';
  goT.style.color=isWin?'#00ff88':'#ff3c5f';

  addXP(xp); addCoins(coins); savePlayerData();

  // Show dead-on-floor animation then overlay
  setTimeout(()=>document.getElementById('gameOver').classList.remove('hidden'), 1200);
}

function updateLivesDisplay(){
  const el=document.getElementById('livesRow');
  if(!el) return;
  const lives=window._lives||0;
  el.innerHTML=Array.from({length:2},(_,i)=>
    `<span style="color:${i<lives?'#ff4444':'#333'};font-size:1.1rem">&#9632;</span>`
  ).join('');
}

// ─────────────────────────────────────────────────────────────────────
// KILL FEED
// ─────────────────────────────────────────────────────────────────────
function addKillFeed(killer, victim, weapon) {
  const feed=document.getElementById('killFeed'); if(!feed) return;
  const e=document.createElement('div');
  e.className='kf-entry';
  e.innerHTML=`<span class="kf-k">${killer.toUpperCase()}</span><span class="kf-w"> [${weapon}] </span><span class="kf-v">${victim.toUpperCase()}</span>`;
  feed.appendChild(e);
  setTimeout(()=>e.remove(),3200);
  while(feed.children.length>5) feed.removeChild(feed.firstChild);
}

// ─────────────────────────────────────────────────────────────────────
// FLOATING TEXT
// ─────────────────────────────────────────────────────────────────────
function showFloaty(txt, col='#fff') {
  const el=document.createElement('div');
  el.style.cssText=`position:fixed;top:${28+Math.random()*20}%;left:50%;transform:translateX(-50%);
    font-family:'Orbitron',sans-serif;font-size:.95rem;font-weight:700;letter-spacing:.1em;
    color:${col};text-shadow:0 2px 8px rgba(0,0,0,.8);pointer-events:none;z-index:90;
    animation:fadeInUp .3s ease,fadeOut .4s ease 1.4s forwards`;
  el.textContent=txt;
  document.body.appendChild(el);
  setTimeout(()=>el.remove(),2000);
}

// ─────────────────────────────────────────────────────────────────────
// SHOP
// ─────────────────────────────────────────────────────────────────────
let _shopFilter='all';
function filterShop(cat, btn){
  _shopFilter=cat;
  document.querySelectorAll('.stab').forEach(b=>b.classList.remove('active'));
  btn?.classList.add('active');
  renderShop(document.getElementById('igsGrid')?.closest('.igs-box') ? 'igsGrid' : 'shopGrid', false);
}

function renderShop(containerId, compact=false){
  const cont=document.getElementById(containerId); if(!cont) return;
  const sc=document.getElementById('shopCoins'); if(sc) sc.textContent=window.currentPlayer.coins||0;
  cont.innerHTML='';
  Object.values(WEAPONS).filter(w=>_shopFilter==='all'||w.cat===_shopFilter).forEach(w=>{
    const owned=window.currentPlayer.ownedWeapons?.includes(w.id);
    const equipped=window.currentPlayer.equippedWeapon===w.id;
    const canAfford=(window.currentPlayer.coins||0)>=w.price;
    const card=document.createElement('div');
    card.className=`shop-card${owned?' owned':''}${equipped?' equipped':''}`;
    card.innerHTML=`
      <div class="card-img">${buildGunSVG(w)}</div>
      <div class="card-name" style="color:${w.col}">${w.name}</div>
      ${!compact?`
      <div class="card-stat-row"><span>DMG</span><div class="stat-bar"><div class="stat-fill" style="width:${w.ds*10}%;background:${w.col}"></div></div></div>
      <div class="card-stat-row"><span>RNG</span><div class="stat-bar"><div class="stat-fill" style="width:${w.rs*10}%;background:${w.col}"></div></div></div>
      <div class="card-stat-row"><span>ACC</span><div class="stat-bar"><div class="stat-fill" style="width:${w.as*10}%;background:${w.col}"></div></div></div>`:''}
      <div class="card-price">${equipped?'<span style="color:#f0c040;font-size:.65rem">EQUIPPED</span>':owned?'<span style="color:#00ff88;font-size:.65rem">OWNED</span>':`<svg viewBox="0 0 18 18" width="13" height="13"><circle cx="9" cy="9" r="8" fill="#f0c040"/></svg> ${w.price}`}</div>
      <div class="card-btns">
        ${!owned&&w.price>0?`<button class="buy-btn" onclick="buyWeapon('${w.id}')" ${canAfford?'':'disabled'}>BUY</button>`:''}
        ${owned&&!equipped?`<button class="equip-btn" onclick="equipFromShop('${w.id}')">EQUIP</button>`:''}
        ${w.price===0&&!equipped?`<button class="equip-btn" onclick="equipFromShop('${w.id}')">EQUIP</button>`:''}
      </div>`;
    cont.appendChild(card);
  });
  // Gear items
  if (!compact) {
    [
      { id:'grenade_item', name:'FRAG GRENADE', price:150, icon:'grenade' },
      { id:'medkit_item',  name:'MEDKIT',       price:120, icon:'medkit'  },
    ].forEach(g=>{
      const card=document.createElement('div');
      card.className='shop-card';
      card.innerHTML=`
        <div class="card-img" style="font-size:2rem;text-align:center">${g.icon==='grenade'?'<svg viewBox="0 0 44 44" width="44" height="44"><circle cx="22" cy="26" r="14" fill="#448822"/><rect x="19" y="8" width="6" height="10" fill="#888"/><rect x="16" y="10" width="12" height="4" rx="2" fill="#aaa"/></svg>':'<svg viewBox="0 0 44 44" width="44" height="44"><rect x="8" y="14" width="28" height="22" rx="3" fill="#dd2244"/><rect x="17" y="20" width="10" height="4" rx="1" fill="#fff"/><rect x="20" y="17" width="4" height="10" rx="1" fill="#fff"/></svg>'}</div>
        <div class="card-name">${g.name}</div>
        <div class="card-price"><svg viewBox="0 0 18 18" width="13" height="13"><circle cx="9" cy="9" r="8" fill="#f0c040"/></svg> ${g.price}</div>
        <div class="card-btns"><button class="buy-btn" onclick="buyGear('${g.id}',${g.price},'${g.icon}')">BUY x1</button></div>`;
      cont.appendChild(card);
    });
  }
}

function buildGunSVG(w) {
  const col = w.col||'#888';
  if (w.cat==='pistol') return `<svg viewBox="0 0 60 36" width="80" height="48"><rect x="4" y="10" width="36" height="10" rx="2" fill="${col}"/><rect x="30" y="6" width="18" height="7" rx="1" fill="#444"/><rect x="6" y="20" width="8" height="10" rx="2" fill="#333"/><rect x="40" y="11" width="12" height="4" rx="1" fill="#555"/></svg>`;
  if (w.id==='sniper') return `<svg viewBox="0 0 80 30" width="100" height="38"><rect x="2" y="10" width="60" height="7" rx="1" fill="${col}"/><rect x="36" y="6" width="22" height="5" rx="1" fill="#222"/><rect x="22" y="17" width="7" height="10" rx="1" fill="#333"/><rect x="62" y="11" width="14" height="3" rx="1" fill="#444"/><circle cx="50" cy="8.5" r="4" fill="#222" stroke="${col}" stroke-width="1.5"/></svg>`;
  if (w.cat==='heavy') return `<svg viewBox="0 0 70 30" width="90" height="38"><ellipse cx="30" cy="14" rx="28" ry="7" fill="${col}"/><rect x="40" y="8" width="20" height="12" rx="2" fill="#333"/><rect x="20" y="20" width="10" height="7" rx="1" fill="#444"/></svg>`;
  return `<svg viewBox="0 0 80 30" width="100" height="38"><rect x="2" y="9" width="56" height="9" rx="1" fill="${col}"/><rect x="38" y="5" width="22" height="6" rx="1" fill="#222"/><rect x="22" y="18" width="8" height="10" rx="1" fill="#333"/><rect x="2" y="10" width="16" height="3" fill="#222"/><rect x="56" y="10" width="16" height="4" rx="1" fill="#444"/></svg>`;
}

function buyWeapon(id){
  const w=WEAPONS[id]; if(!w) return;
  if(window.currentPlayer.ownedWeapons?.includes(id)){ showFloaty('Already owned','#ff8040'); return; }
  if(!spendCoins(w.price)){ showFloaty('Not enough coins','#ff3c5f'); return; }
  window.currentPlayer.ownedWeapons=window.currentPlayer.ownedWeapons||[];
  window.currentPlayer.ownedWeapons.push(id);
  showFloaty(w.name+' purchased!','#00ff88');
  savePlayerData(); renderShop('shopGrid');
}

function equipFromShop(id){
  if(!window.currentPlayer.ownedWeapons?.includes(id)&&WEAPONS[id]?.price>0) return;
  equipWeapon(id); window.currentPlayer.equippedWeapon=id;
  // Update gun mesh on player
  if(window._playerMesh){
    const old=window._playerMesh.getObjectByName('PLAYERGUN');
    if(old) window._playerMesh.remove(old);
    const gun=buildGunMesh(id); gun.name='PLAYERGUN';
    gun.position.set(.31,.64,-.18); window._playerMesh.add(gun);
  }
  savePlayerData(); renderShop('shopGrid'); showFloaty(WEAPONS[id].name+' equipped','#00c8ff');
}

function buyGear(id, price, type){
  if(!spendCoins(price)){ showFloaty('Not enough coins','#ff3c5f'); return; }
  if(type==='grenade') window.currentPlayer.grenades=(window.currentPlayer.grenades||0)+1;
  if(type==='medkit')  window.currentPlayer.medkits=(window.currentPlayer.medkits||0)+1;
  updateGearHUD(); savePlayerData(); showFloaty('+1 '+type.toUpperCase(),'#00ff88');
}

// ─────────────────────────────────────────────────────────────────────
// UPGRADE SCREEN
// ─────────────────────────────────────────────────────────────────────
function renderUpgrade(){
  const body=document.getElementById('upgradeBody'); if(!body) return;
  const upgrades=[
    {key:'speed',  name:'SPEED',     icon:'S', desc:'Move faster', maxLv:5, costPer:300},
    {key:'health', name:'MAX HEALTH',icon:'H', desc:'+20 max HP',   maxLv:5, costPer:400},
    {key:'armor',  name:'ARMOR',     icon:'A', desc:'+10 armor',    maxLv:5, costPer:350},
    {key:'damage', name:'DAMAGE',    icon:'D', desc:'+10% weapon dmg',maxLv:5,costPer:500},
  ];
  body.innerHTML='';
  upgrades.forEach(u=>{
    const lv=(window.currentPlayer.upgrades?.[u.key]||0);
    const cost=u.costPer*(lv+1);
    const div=document.createElement('div'); div.className='upg-card';
    div.innerHTML=`<div class="upg-icon" style="background:rgba(0,200,255,.15);border-radius:50%;width:44px;height:44px;display:flex;align-items:center;justify-content:center;margin:0 auto;font-family:'Orbitron',sans-serif;font-weight:900;color:#0cf">${u.icon}</div>
      <div class="upg-name">${u.name}</div>
      <div class="upg-lv">LV ${lv} / ${u.maxLv}</div>
      <div style="font-family:'Share Tech Mono',monospace;font-size:.6rem;color:rgba(160,200,240,.5);margin:.2rem 0">${u.desc}</div>
      <div style="display:flex;align-items:center;gap:.3rem;justify-content:center;margin:.2rem 0;font-family:'Share Tech Mono',monospace;font-size:.7rem;color:#f0c040">
        <svg viewBox="0 0 18 18" width="12" height="12"><circle cx="9" cy="9" r="8" fill="#f0c040"/></svg>${cost}
      </div>
      ${lv<u.maxLv?`<button class="upg-btn" onclick="doUpgrade('${u.key}',${cost})">UPGRADE</button>`:`<div style="color:#00ff88;font-family:'Orbitron',sans-serif;font-size:.6rem">MAX LEVEL</div>`}`;
    body.appendChild(div);
  });
}

function doUpgrade(key, cost){
  if(!spendCoins(cost)){ showFloaty('Not enough coins','#ff3c5f'); return; }
  window.currentPlayer.upgrades=window.currentPlayer.upgrades||{};
  window.currentPlayer.upgrades[key]=(window.currentPlayer.upgrades[key]||0)+1;
  // Apply effects
  if(key==='health') window._PS.maxHealth=100+window.currentPlayer.upgrades.health*20;
  showFloaty(key.toUpperCase()+' upgraded!','#f0c040');
  savePlayerData(); renderUpgrade();
}

// ─────────────────────────────────────────────────────────────────────
// MINIMAP
// ─────────────────────────────────────────────────────────────────────
function drawMinimap(){
  const canvas=document.getElementById('minimap'); if(!canvas) return;
  const ctx=canvas.getContext('2d');
  const W=canvas.width, H=canvas.height, SC=0.85;
  ctx.clearRect(0,0,W,H);
  // Background
  ctx.fillStyle='rgba(0,0,0,.75)'; ctx.fillRect(0,0,W,H);
  // Buildings
  ctx.fillStyle='rgba(80,100,140,.55)';
  (window._buildingBoxes||[]).forEach(b=>{
    const bx=W/2+(b.minX+b.maxX)/2*SC, bz=H/2+(b.minZ+b.maxZ)/2*SC;
    const bw=(b.maxX-b.minX)*SC, bd=(b.maxZ-b.minZ)*SC;
    ctx.fillRect(bx-bw/2, bz-bd/2, bw, bd);
  });
  // Enemies
  (window._enemies||[]).forEach(e=>{
    if(e.dead||!e.mesh) return;
    const ex=W/2+e.mesh.position.x*SC, ez=H/2+e.mesh.position.z*SC;
    ctx.fillStyle='#ff4444'; ctx.beginPath(); ctx.arc(ex,ez,3,0,Math.PI*2); ctx.fill();
  });
  // Remote players
  Object.values(window._mpPlayers||{}).forEach(p=>{
    if(!p.mesh) return;
    const px=W/2+p.mesh.position.x*SC, pz=H/2+p.mesh.position.z*SC;
    ctx.fillStyle='#ff8040'; ctx.beginPath(); ctx.arc(px,pz,3.5,0,Math.PI*2); ctx.fill();
  });
  // Pickups
  (window._pickups||[]).filter(p=>p.active).forEach(p=>{
    const px=W/2+p.mesh.position.x*SC, pz=H/2+p.mesh.position.z*SC;
    ctx.fillStyle=p.type==='medkit'?'#00ff80':p.type==='grenade'?'#ffcc00':'#4488ff';
    ctx.beginPath(); ctx.arc(px,pz,2.5,0,Math.PI*2); ctx.fill();
  });
  // Vehicles
  (window._vehicles||[]).forEach(v=>{
    const vx=W/2+v.mesh.position.x*SC, vz=H/2+v.mesh.position.z*SC;
    ctx.fillStyle='#f0c040'; ctx.fillRect(vx-3,vz-2,6,4);
  });
  // Player
  const pm=window._playerMesh;
  if(pm){
    ctx.fillStyle='#00ff88'; ctx.strokeStyle='#fff'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.arc(W/2,H/2,4.5,0,Math.PI*2); ctx.fill(); ctx.stroke();
    // Direction arrow
    const ang=-window._camera?.rotation?.y||0;
    ctx.strokeStyle='#00ff88'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(W/2,H/2);
    ctx.lineTo(W/2+Math.sin(ang)*10, H/2-Math.cos(ang)*10); ctx.stroke();
  }
  // Border ring
  ctx.strokeStyle='rgba(0,200,255,.4)'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.arc(W/2,H/2,W/2-1,0,Math.PI*2); ctx.stroke();
}

// ─────────────────────────────────────────────────────────────────────
// SETTINGS
// ─────────────────────────────────────────────────────────────────────
function toggleMusic(on){ const a=document.getElementById('bgMusic'); if(a){ if(on)a.play().catch(()=>{}); else a.pause(); } }
