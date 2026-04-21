// ══════════════════════════════════════════════════
//  weapons.js — Weapon Definitions & Combat System
// ══════════════════════════════════════════════════

window.WEAPONS = {
  pistol: {
    id: 'pistol', name: 'G17 PISTOL',
    damage: 25, fireRate: 300, range: 40,
    ammo: 15, maxAmmo: 15, reserve: 60,
    reloadTime: 1200,
    recoil: 2, spread: 0.04,
    automatic: false, price: 0,
    dmgStat: 3, speedStat: 9, rangeStat: 4, accStat: 7,
    color: '#aaaaaa',
    svgPath: `<rect x="5" y="14" width="28" height="10" rx="2" fill="#888"/>
              <rect x="25" y="10" width="12" height="6" rx="1" fill="#777"/>
              <rect x="8" y="20" width="6" height="6" rx="1" fill="#666"/>`,
  },
  smg: {
    id: 'smg', name: 'MP5 SMG',
    damage: 18, fireRate: 100, range: 35,
    ammo: 30, maxAmmo: 30, reserve: 120,
    reloadTime: 1400,
    recoil: 3, spread: 0.06,
    automatic: true, price: 300,
    dmgStat: 4, speedStat: 8, rangeStat: 4, accStat: 6,
    color: '#00c8ff',
    svgPath: `<rect x="2" y="13" width="36" height="8" rx="1" fill="#555"/>
              <rect x="20" y="9" width="16" height="5" rx="1" fill="#666"/>
              <rect x="14" y="20" width="5" height="8" rx="1" fill="#444"/>
              <rect x="2" y="15" width="10" height="2" fill="#333"/>`,
  },
  assault: {
    id: 'assault', name: 'M4A1 RIFLE',
    damage: 35, fireRate: 120, range: 80,
    ammo: 30, maxAmmo: 30, reserve: 90,
    reloadTime: 1800,
    recoil: 4, spread: 0.03,
    automatic: true, price: 600,
    dmgStat: 7, speedStat: 6, rangeStat: 7, accStat: 7,
    color: '#00ff88',
    svgPath: `<rect x="2" y="14" width="38" height="7" rx="1" fill="#444"/>
              <rect x="22" y="10" width="16" height="5" rx="1" fill="#555"/>
              <rect x="16" y="20" width="6" height="9" rx="1" fill="#333"/>
              <rect x="28" y="10" width="12" height="2" fill="#666"/>
              <rect x="2" y="15" width="14" height="2" fill="#333"/>`,
  },
  sniper: {
    id: 'sniper', name: 'AWP SNIPER',
    damage: 95, fireRate: 1500, range: 200,
    ammo: 5, maxAmmo: 5, reserve: 20,
    reloadTime: 2800,
    recoil: 12, spread: 0.001,
    automatic: false, price: 900,
    dmgStat: 10, speedStat: 2, rangeStat: 10, accStat: 10,
    color: '#ff3c5f',
    svgPath: `<rect x="1" y="15" width="42" height="6" rx="1" fill="#3a3a4a"/>
              <rect x="26" y="11" width="14" height="4" rx="1" fill="#4a4a5a"/>
              <rect x="18" y="20" width="5" height="9" rx="1" fill="#2a2a3a"/>
              <circle cx="34" cy="13" r="3" fill="#333" stroke="#00c8ff" stroke-width="1"/>
              <rect x="1" y="16" width="18" height="2" fill="#222"/>`,
  },
  shotgun: {
    id: 'shotgun', name: 'SPAS-12',
    damage: 70, fireRate: 700, range: 25,
    ammo: 8, maxAmmo: 8, reserve: 32,
    reloadTime: 2200,
    recoil: 10, spread: 0.12,
    automatic: false, price: 500,
    dmgStat: 9, speedStat: 4, rangeStat: 2, accStat: 4,
    color: '#f0c040',
    svgPath: `<rect x="2" y="13" width="34" height="10" rx="1" fill="#5a3a20"/>
              <rect x="22" y="10" width="12" height="4" rx="1" fill="#6a4a30"/>
              <rect x="12" y="22" width="12" height="2" fill="#8b6040"/>
              <rect x="34" y="14" width="4" height="6" rx="1" fill="#444"/>`,
  },
  rocket: {
    id: 'rocket', name: 'RPG-7',
    damage: 200, fireRate: 2000, range: 120,
    ammo: 1, maxAmmo: 1, reserve: 4,
    reloadTime: 3000,
    recoil: 20, spread: 0.02,
    automatic: false, price: 1500,
    dmgStat: 10, speedStat: 1, rangeStat: 8, accStat: 5,
    color: '#ff8040',
    svgPath: `<rect x="2" y="16" width="30" height="5" rx="10" fill="#5a5a2a"/>
              <rect x="28" y="14" width="12" height="9" rx="1" fill="#4a4a1a"/>
              <polygon points="2,16 2,21 -4,18.5" fill="#888"/>`,
  },
};

// Current weapon state
window.weaponState = {
  current: null,
  ammo: 0,
  reserve: 0,
  isReloading: false,
  lastFired: 0,
  isFiring: false,
  fireInterval: null,
};

// ──────────────────────────────────────────────────
// Equip a weapon
// ──────────────────────────────────────────────────
function equipWeapon(weaponId) {
  const w = WEAPONS[weaponId];
  if (!w) return;
  weaponState.current = w;
  weaponState.ammo = w.maxAmmo;
  weaponState.reserve = w.reserve;
  weaponState.isReloading = false;
  window.currentPlayer.equippedWeapon = weaponId;
  updateAmmoHUD();
}

// ──────────────────────────────────────────────────
// Fire weapon
// ──────────────────────────────────────────────────
function fireWeapon(scene, camera, players) {
  const ws = weaponState;
  const w = ws.current;
  if (!w || ws.isReloading) return false;

  const now = Date.now();
  if (now - ws.lastFired < w.fireRate) return false;
  if (ws.ammo <= 0) { reloadWeapon(); return false; }

  ws.lastFired = now;
  ws.ammo--;
  updateAmmoHUD();
  playSFX('shoot');

  // Crosshair feedback
  const ch = document.getElementById('crosshair');
  if (ch) {
    ch.classList.add('firing');
    setTimeout(() => ch.classList.remove('firing'), 80);
  }

  // Show muzzle flash
  showMuzzleFlash();

  // Recoil to crosshair (spread-based visual)
  if (scene && camera) {
    castBullet(scene, camera, w, players);
  }

  if (ws.ammo <= 0 && ws.reserve > 0) {
    setTimeout(() => reloadWeapon(), 300);
  }
  return true;
}

function reloadWeapon() {
  const ws = weaponState;
  const w = ws.current;
  if (!w || ws.isReloading || ws.ammo === w.maxAmmo || ws.reserve <= 0) return;

  ws.isReloading = true;
  showReloadIndicator(w.reloadTime);

  setTimeout(() => {
    const needed = w.maxAmmo - ws.ammo;
    const give = Math.min(needed, ws.reserve);
    ws.ammo += give;
    ws.reserve -= give;
    ws.isReloading = false;
    updateAmmoHUD();
  }, w.reloadTime);
}

function startShooting() {
  const w = weaponState.current;
  if (!w) return;
  weaponState.isFiring = true;
  if (w.automatic) {
    weaponState.fireInterval = setInterval(() => {
      if (window.gameRunning) fireWeapon(window._scene, window._camera, window._enemies);
    }, w.fireRate);
  } else {
    if (window.gameRunning) fireWeapon(window._scene, window._camera, window._enemies);
  }
}

function stopShooting() {
  weaponState.isFiring = false;
  if (weaponState.fireInterval) {
    clearInterval(weaponState.fireInterval);
    weaponState.fireInterval = null;
  }
}

// ──────────────────────────────────────────────────
// Bullet Raycast (Three.js)
// ──────────────────────────────────────────────────
function castBullet(scene, camera, weapon, enemies) {
  if (!THREE || !scene || !camera) return;

  // Apply spread
  const spread = weapon.spread * (window.isAiming ? 0.3 : 1.0);
  const direction = new THREE.Vector3(
    (Math.random() - 0.5) * spread,
    (Math.random() - 0.5) * spread,
    -1
  ).normalize();
  direction.applyQuaternion(camera.quaternion);

  const raycaster = new THREE.Raycaster(camera.position.clone(), direction, 0.1, weapon.range);
  const targets = (enemies || []).map(e => e.mesh).filter(Boolean);
  const walls = window._wallMeshes || [];
  const allTargets = [...targets, ...walls];

  if (allTargets.length === 0) return;

  const hits = raycaster.intersectObjects(allTargets, true);
  if (hits.length > 0) {
    const hit = hits[0];
    showBulletImpact(hit.point, scene);

    // Check if hit an enemy
    const hitEnemy = (enemies || []).find(e => {
      if (!e.mesh) return false;
      const box = new THREE.Box3().setFromObject(e.mesh);
      return box.containsPoint(hit.point);
    });
    if (hitEnemy) {
      damageEnemy(hitEnemy, weapon.damage);
      showHitMarker();
    }
  }

  // Bullet trail
  showBulletTrail(camera.position.clone(), hits.length > 0 ? hits[0].point : camera.position.clone().addScaledVector(direction, weapon.range), scene);
}

// ──────────────────────────────────────────────────
// Visual Effects
// ──────────────────────────────────────────────────
function showMuzzleFlash() {
  const flash = document.createElement('div');
  flash.style.cssText = `
    position:fixed;top:50%;left:52%;
    width:20px;height:20px;
    border-radius:50%;
    background:radial-gradient(circle,rgba(255,220,100,0.95),rgba(255,100,20,0.4),transparent);
    transform:translate(-50%,-50%);
    pointer-events:none;z-index:25;
    animation:recoilAnim 0.12s ease forwards;
  `;
  document.body.appendChild(flash);
  setTimeout(() => flash.remove(), 120);
}

function showHitMarker() {
  const hm = document.createElement('div');
  hm.style.cssText = `
    position:fixed;top:50%;left:50%;
    width:16px;height:16px;
    border:2px solid rgba(255,60,95,0.9);
    transform:translate(-50%,-50%) rotate(45deg);
    pointer-events:none;z-index:25;
    animation:hitMarker 0.25s ease forwards;
  `;
  document.body.appendChild(hm);
  setTimeout(() => hm.remove(), 250);
}

function showReloadIndicator(duration) {
  const el = document.getElementById('weaponName');
  if (!el) return;
  el.textContent = 'RELOADING...';
  el.style.color = '#f0c040';
  setTimeout(() => {
    el.textContent = weaponState.current?.name || '';
    el.style.color = '';
  }, duration);
}

function showBulletImpact(point, scene) {
  if (!THREE || !scene) return;
  const geo = new THREE.SphereGeometry(0.05, 4, 4);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
  const impact = new THREE.Mesh(geo, mat);
  impact.position.copy(point);
  scene.add(impact);
  setTimeout(() => { scene.remove(impact); geo.dispose(); mat.dispose(); }, 500);
}

function showBulletTrail(from, to, scene) {
  if (!THREE || !scene) return;
  const points = [from, to];
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const mat = new THREE.LineBasicMaterial({ color: 0xffff88, transparent: true, opacity: 0.5 });
  const line = new THREE.Line(geo, mat);
  scene.add(line);
  setTimeout(() => { scene.remove(line); geo.dispose(); mat.dispose(); }, 80);
}

// ──────────────────────────────────────────────────
// Damage enemy
// ──────────────────────────────────────────────────
function damageEnemy(enemy, damage) {
  enemy.health = (enemy.health || 100) - damage;
  if (enemy.health <= 0) {
    killEnemy(enemy);
  } else {
    flashEnemyHit(enemy);
  }
}

function killEnemy(enemy) {
  if (enemy.dead) return;
  enemy.dead = true;
  if (window._scene && enemy.mesh) {
    window._scene.remove(enemy.mesh);
  }
  window.currentPlayer.kills++;
  addXP(50);
  addCoins(25);
  addKillFeedEntry(window.currentPlayer.name, enemy.name || 'ENEMY', weaponState.current?.name || 'PISTOL');
  updateHUD();
  // Remove from enemies array
  if (window._enemies) {
    window._enemies = window._enemies.filter(e => e !== enemy);
  }
}

function flashEnemyHit(enemy) {
  if (!enemy.mesh) return;
  enemy.mesh.traverse(child => {
    if (child.isMesh && child.material) {
      const orig = child.material.color?.getHex();
      child.material.color?.setHex(0xff4444);
      setTimeout(() => child.material.color?.setHex(orig || 0xffffff), 100);
    }
  });
}

// ──────────────────────────────────────────────────
// HUD Update
// ──────────────────────────────────────────────────
function updateAmmoHUD() {
  const ws = weaponState;
  const el1 = document.getElementById('ammoCount');
  const el2 = document.getElementById('ammoReserve');
  const el3 = document.getElementById('weaponName');
  if (el1) el1.textContent = ws.ammo;
  if (el2) el2.textContent = ws.reserve;
  if (el3 && ws.current) el3.textContent = ws.current.name;
}

// ──────────────────────────────────────────────────
// Aiming
// ──────────────────────────────────────────────────
window.isAiming = false;
function startAiming() {
  window.isAiming = true;
  document.getElementById('crosshair')?.classList.add('aiming');
  // FOV zoom handled in game.js
  if (window._camera) {
    window._camera._targetFOV = 40;
  }
}
function stopAiming() {
  window.isAiming = false;
  document.getElementById('crosshair')?.classList.remove('aiming');
  if (window._camera) {
    window._camera._targetFOV = 75;
  }
}
