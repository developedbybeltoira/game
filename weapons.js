// weapons.js — Weapon defs, gun models, firing system
window.WEAPONS = {
  pistol:  { id:'pistol',  name:'GLOCK 17',  cat:'pistol', dmg:30, rate:320, range:45, ammo:15, res:60,  reload:1100, recoil:2.5, spread:.04, auto:false, price:0,    ds:3,ss:9,rs:4,as:7, sfx:'shoot_pistol', col:'#aaaaaa' },
  usp:     { id:'usp',     name:'USP-S',     cat:'pistol', dmg:40, rate:400, range:55, ammo:12, res:48,  reload:1300, recoil:3,   spread:.03, auto:false, price:400,  ds:5,ss:8,rs:5,as:8, sfx:'shoot_pistol', col:'#888888' },
  deagle:  { id:'deagle',  name:'DESERT EAGLE', cat:'pistol', dmg:75, rate:700, range:60, ammo:7, res:28, reload:1500, recoil:8,   spread:.02, auto:false, price:700,  ds:8,ss:5,rs:6,as:8, sfx:'shoot_pistol', col:'#996633' },
  smg:     { id:'smg',     name:'MP5 SMG',   cat:'rifle',  dmg:20, rate:100, range:40, ammo:30, res:120, reload:1400, recoil:3,   spread:.06, auto:true,  price:400,  ds:4,ss:8,rs:4,as:6, sfx:'shoot_rifle', col:'#00c8ff' },
  assault: { id:'assault', name:'M4A1',      cat:'rifle',  dmg:35, rate:110, range:85, ammo:30, res:90,  reload:1800, recoil:4,   spread:.03, auto:true,  price:700,  ds:7,ss:6,rs:8,as:7, sfx:'shoot_rifle', col:'#00ff88' },
  ak47:    { id:'ak47',    name:'AK-47',     cat:'rifle',  dmg:45, rate:130, range:80, ammo:30, res:90,  reload:1900, recoil:6,   spread:.04, auto:true,  price:800,  ds:8,ss:5,rs:7,as:6, sfx:'shoot_rifle', col:'#cc8040' },
  sniper:  { id:'sniper',  name:'AWM',       cat:'rifle',  dmg:100,rate:1600,range:220,ammo:5,  res:20,  reload:2800, recoil:14,  spread:.001,auto:false, price:1200, ds:10,ss:2,rs:10,as:10,sfx:'shoot_sniper',col:'#ff3c5f' },
  shotgun: { id:'shotgun', name:'SPAS-12',   cat:'heavy',  dmg:80, rate:750, range:22, ammo:8,  res:32,  reload:2200, recoil:11,  spread:.14, auto:false, price:600,  ds:9,ss:4,rs:2,as:4,  sfx:'shoot_shotgun',col:'#f0c040' },
  rpg:     { id:'rpg',     name:'RPG-7',     cat:'heavy',  dmg:220,rate:2500,range:140,ammo:1,  res:4,   reload:3200, recoil:22,  spread:.02, auto:false, price:1800, ds:10,ss:1,rs:8,as:5, sfx:'explosion',   col:'#ff8040' },
  minigun: { id:'minigun', name:'MINIGUN',   cat:'heavy',  dmg:25, rate:70,  range:65, ammo:200,res:400, reload:4000, recoil:5,   spread:.09, auto:true,  price:2500, ds:8,ss:5,rs:5,as:5,  sfx:'shoot_rifle', col:'#ff6020' },
  grenade_launcher:{ id:'grenade_launcher',name:'M79',cat:'heavy',dmg:180,rate:1200,range:80,ammo:1,res:6,reload:2000,recoil:10,spread:.04,auto:false,price:1400,ds:10,ss:3,rs:6,as:5,sfx:'explosion',col:'#88aa44' },
};

window.WS = {
  current: null, ammo: 0, reserve: 0,
  isReloading: false, lastFired: 0, isFiring: false, _interval: null,
};

function equipWeapon(id) {
  const w = window.WEAPONS[id]; if (!w) return;
  window.WS.current = w; window.WS.ammo = w.ammo; window.WS.reserve = w.res;
  window.WS.isReloading = false;
  window.currentPlayer.equippedWeapon = id;
  updateAmmoHUD();
}

function startFiring() {
  const w = window.WS.current; if (!w) return;
  window.WS.isFiring = true;
  window._isShooting = true;
  if (w.auto) {
    window.WS._interval = setInterval(() => { if (window.gameRunning && !window.gamePaused) doShot(); }, w.rate);
  } else { doShot(); }
}

function stopFiring() {
  window.WS.isFiring = false; window._isShooting = false;
  if (window.WS._interval) { clearInterval(window.WS._interval); window.WS._interval = null; }
}

function doShot() {
  const ws = window.WS; const w = ws.current;
  if (!w || ws.isReloading) return;
  const now = Date.now();
  if (now - ws.lastFired < w.rate) return;
  if (ws.ammo <= 0) { doReload(); return; }
  ws.lastFired = now; ws.ammo--;
  updateAmmoHUD(); playSFX(w.sfx || 'shoot_rifle');
  showMuzzleFlash();
  const ch = document.getElementById('crosshair');
  if (ch) { ch.classList.add('firing'); setTimeout(() => ch.classList.remove('firing'), 90); }
  castBullet(w);
  if (window._mpChannel) window._mpChannel.send({ type:'broadcast', event:'player_shoot', payload:{ id: window.currentPlayer.id }});
  if (ws.ammo <= 0 && ws.reserve > 0) setTimeout(doReload, 300);
}

function doReload() {
  const ws = window.WS; const w = ws.current;
  if (!w || ws.isReloading || ws.ammo === w.ammo || ws.reserve <= 0) return;
  ws.isReloading = true;
  const wn = document.getElementById('wepName');
  if (wn) { wn.textContent = 'RELOADING...'; wn.style.color = '#f0c040'; }
  playSFX('reload');
  setTimeout(() => {
    const need = w.ammo - ws.ammo;
    const give = Math.min(need, ws.reserve);
    ws.ammo += give; ws.reserve -= give;
    ws.isReloading = false;
    updateAmmoHUD();
    if (wn) { wn.textContent = w.name; wn.style.color = ''; }
  }, w.reload);
}

function castBullet(w) {
  const scene = window._scene; const cam = window._camera;
  if (!THREE || !scene || !cam) return;
  const spread = w.spread * (window._isAiming ? 0.25 : 1.0);
  const dir = new THREE.Vector3(
    (Math.random() - .5) * spread, (Math.random() - .5) * spread, -1
  ).normalize().applyQuaternion(cam.quaternion);
  const ray = new THREE.Raycaster(cam.position.clone(), dir, 0.1, w.range);
  const targets = [...(window._enemies || []).map(e => e.mesh).filter(Boolean),
                   ...(window._wallMeshes || []), ...(window._pickupMeshes || [])];
  if (!targets.length) return;
  const hits = ray.intersectObjects(targets, true);
  if (hits.length) {
    const hit = hits[0];
    spawnImpact(hit.point);
    // Check enemy hit
    const hitEnemy = (window._enemies || []).find(e => {
      if (!e.mesh) return false;
      const b = new THREE.Box3().setFromObject(e.mesh);
      return b.containsPoint(hit.point);
    });
    if (hitEnemy) { damageEnemy(hitEnemy, w.dmg); showHitMarker(); return; }
    // Check pickup hit (ignore)
    spawnBulletTrail(cam.position.clone(), hit.point);
  } else {
    const far = cam.position.clone().addScaledVector(dir, w.range);
    spawnBulletTrail(cam.position.clone(), far);
  }
}

function showMuzzleFlash() {
  const f = document.createElement('div');
  f.style.cssText = 'position:fixed;top:50%;left:52%;width:22px;height:22px;border-radius:50%;background:radial-gradient(circle,rgba(255,230,80,.98),rgba(255,100,20,.45),transparent);transform:translate(-50%,-50%);pointer-events:none;z-index:25;animation:none';
  document.body.appendChild(f);
  setTimeout(() => f.remove(), 90);
}

function showHitMarker() {
  const h = document.createElement('div');
  h.style.cssText = 'position:fixed;top:50%;left:50%;width:16px;height:16px;border:2.5px solid rgba(255,60,95,.95);transform:translate(-50%,-50%) rotate(45deg);pointer-events:none;z-index:25';
  document.body.appendChild(h);
  requestAnimationFrame(() => { h.style.transition = 'all .22s ease'; h.style.opacity = '0'; h.style.transform = 'translate(-50%,-50%) rotate(45deg) scale(2)'; });
  setTimeout(() => h.remove(), 240);
}

function spawnImpact(pt) {
  if (!window._scene) return;
  const g = new THREE.SphereGeometry(.06, 4, 4);
  const m = new THREE.MeshBasicMaterial({ color: 0xffee44 });
  const mesh = new THREE.Mesh(g, m); mesh.position.copy(pt);
  window._scene.add(mesh);
  setTimeout(() => { window._scene.remove(mesh); g.dispose(); m.dispose(); }, 350);
}

function spawnBulletTrail(from, to) {
  if (!window._scene) return;
  const g = new THREE.BufferGeometry().setFromPoints([from, to]);
  const m = new THREE.LineBasicMaterial({ color: 0xffffaa, transparent: true, opacity: .45 });
  const line = new THREE.Line(g, m);
  window._scene.add(line);
  setTimeout(() => { window._scene.remove(line); g.dispose(); m.dispose(); }, 75);
}

// Gun 3D model (detailed boxes for each weapon type)
function buildGunMesh(weaponId) {
  const group = new THREE.Group();
  const w = window.WEAPONS[weaponId] || window.WEAPONS.pistol;
  const col = parseInt(w.col.replace('#',''), 16);
  const dark = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const metal = new THREE.MeshLambertMaterial({ color: 0x333344 });
  const main = new THREE.MeshLambertMaterial({ color: col });
  const scope = new THREE.MeshLambertMaterial({ color: 0x222222 });

  if (w.cat === 'pistol') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(.08,.1,.22), main); body.position.set(0, 0, -.05); group.add(body);
    const barrel = new THREE.Mesh(new THREE.BoxGeometry(.04,.04,.18), metal); barrel.position.set(0,.04,-.2); group.add(barrel);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(.06,.18,.08), dark); handle.position.set(0,-.1,.02); group.add(handle);
    const trigger = new THREE.Mesh(new THREE.BoxGeometry(.015,.06,.015), metal); trigger.position.set(0,-.05,-.04); group.add(trigger);
  } else if (w.cat === 'rifle' || w.id === 'ak47' || w.id === 'assault' || w.id === 'smg') {
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(.07,.09,.44), metal); group.add(receiver);
    const barrel = new THREE.Mesh(new THREE.BoxGeometry(.035,.035,.28), dark); barrel.position.set(0,.025,-.36); group.add(barrel);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(.06,.1,.22), main); stock.position.set(0,-.01,.32); group.add(stock);
    const mag = new THREE.Mesh(new THREE.BoxGeometry(.055,.18,.07), dark); mag.position.set(0,-.14,0); group.add(mag);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(.055,.16,.07), dark); handle.position.set(0,-.12,.15); group.add(handle);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(.072,.02,.35), scope); rail.position.set(0,.07,.0); group.add(rail);
    // Suppressor for SMG
    if (w.id === 'smg') {
      const sup = new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,.12,8), dark); sup.rotation.z = Math.PI/2; sup.position.set(0,.025,-.52); group.add(sup);
    }
  } else if (w.id === 'sniper') {
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(.065,.085,.55), dark); group.add(receiver);
    const barrel = new THREE.Mesh(new THREE.BoxGeometry(.03,.03,.4), metal); barrel.position.set(0,.01,-.47); group.add(barrel);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(.055,.1,.28), main); stock.position.set(0,-.01,.41); group.add(stock);
    const scopeBody = new THREE.Mesh(new THREE.CylinderGeometry(.022,.022,.25,8), scope); scopeBody.rotation.z = Math.PI/2; scopeBody.position.set(0,.085,-.05); group.add(scopeBody);
    const mag = new THREE.Mesh(new THREE.BoxGeometry(.04,.1,.06), dark); mag.position.set(0,-.09,.05); group.add(mag);
    const bipod1 = new THREE.Mesh(new THREE.BoxGeometry(.005,.14,.005), metal); bipod1.position.set(-.04,.025,-.35); bipod1.rotation.z = .35; group.add(bipod1);
    const bipod2 = new THREE.Mesh(new THREE.BoxGeometry(.005,.14,.005), metal); bipod2.position.set(.04,.025,-.35); bipod2.rotation.z = -.35; group.add(bipod2);
  } else if (w.cat === 'heavy') {
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,.65,10), dark); tube.rotation.z = Math.PI/2; tube.position.set(0,0,-.1); group.add(tube);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(.06,.16,.07), main); handle.position.set(0,-.1,.15); group.add(handle);
    const body = new THREE.Mesh(new THREE.BoxGeometry(.1,.1,.25), metal); body.position.set(0,0,.2); group.add(body);
  }

  group.scale.setScalar(1);
  return group;
}

window._isAiming = false;
function startAiming() { window._isAiming = true; document.getElementById('crosshair')?.classList.add('aiming'); if (window._camera) window._camera._targetFOV = 38; }
function stopAiming() { window._isAiming = false; document.getElementById('crosshair')?.classList.remove('aiming'); if (window._camera) window._camera._targetFOV = 72; }

function updateAmmoHUD() {
  const ws = window.WS;
  const m = document.getElementById('ammoMag'); if (m) m.textContent = ws.ammo;
  const r = document.getElementById('ammoRes'); if (r) r.textContent = ws.reserve;
  const n = document.getElementById('wepName'); if (n && !ws.isReloading) { n.textContent = ws.current?.name || ''; n.style.color = ws.current?.col || ''; }
}
