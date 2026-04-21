// characters.js — GTA-quality human soldiers + anime characters
window._enemies = [];
window._bystanders = [];
window._playerMesh = null;
window._gunMesh = null;
window._pickups = [];
window._pickupMeshes = [];

window._PS = {
  health: 100, maxHealth: 100, armor: 0,
  onGround: true, crouching: false,
  velocity: { x: 0, y: 0, z: 0 },
  speed: 8, lastDash: 0,
};

// ── REALISTIC HUMAN BUILDER ───────────────────────────────────────────
// Using multiple detailed body segments (not blocks — tapered cylinders + subdivided boxes)
function buildRealisticHuman({ skinTone = 0xd4935a, outfit = null, isEnemy = false, isAnime = false, gender = 'male' } = {}) {
  const group = new THREE.Group();
  outfit = outfit || (isEnemy
    ? { shirt: 0x661111, pants: 0x331111, boots: 0x221111, vest: 0x4a0a0a, helmet: 0x3a0808 }
    : { shirt: 0x1a3a6a, pants: 0x1a2a4a, boots: 0x151515, vest: 0x112211, helmet: 0x1e2e10 });

  const skin    = new THREE.MeshLambertMaterial({ color: skinTone });
  const shirtM  = new THREE.MeshLambertMaterial({ color: outfit.shirt });
  const pantsM  = new THREE.MeshLambertMaterial({ color: outfit.pants });
  const bootsM  = new THREE.MeshLambertMaterial({ color: outfit.boots });
  const vestM   = new THREE.MeshLambertMaterial({ color: outfit.vest });
  const helmM   = new THREE.MeshLambertMaterial({ color: outfit.helmet });
  const blackM  = new THREE.MeshLambertMaterial({ color: 0x0a0a0a });
  const metalM  = new THREE.MeshLambertMaterial({ color: 0x5a6070 });

  // ── TORSO (tapered for natural shoulders) ──
  const torsoGeo = new THREE.CylinderGeometry(0.23, 0.2, 0.58, 8);
  const torso = new THREE.Mesh(torsoGeo, shirtM);
  torso.position.y = 0.92; torso.castShadow = true; group.add(torso);

  // Tactical vest over shirt
  const vest = new THREE.Mesh(new THREE.CylinderGeometry(0.245, 0.21, 0.56, 8), vestM);
  vest.position.y = 0.93; group.add(vest);

  // Chest detail — ammo pouches
  [-0.14, 0.14].forEach(x => {
    const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.08), blackM);
    pouch.position.set(x, 0.88, 0.18); group.add(pouch);
  });

  // Shoulder straps
  for (let s = 0; s < 2; s++) {
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, 0.06), vestM);
    strap.position.set(s === 0 ? -0.2 : 0.2, 1.08, 0.05);
    strap.rotation.z = s === 0 ? -0.2 : 0.2;
    group.add(strap);
  }

  // ── HEAD (realistic proportions) ──
  const headGeo = isAnime
    ? new THREE.SphereGeometry(0.155, 12, 10)      // slightly larger for anime
    : new THREE.SphereGeometry(0.14,  12, 10);
  const headMesh = new THREE.Mesh(headGeo, skin);
  headMesh.position.y = 1.52;
  headMesh.scale.set(1, 1.15, 1.05); // slightly elongated vertically
  headMesh.castShadow = true;
  group.add(headMesh);

  // Neck
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.08, 0.12, 7), skin);
  neck.position.y = 1.32; group.add(neck);

  // ── HELMET ──
  const helmGeo = new THREE.SphereGeometry(0.165, 10, 8);
  const helm = new THREE.Mesh(helmGeo, helmM);
  helm.position.y = 1.56; helm.scale.set(1, 0.85, 1.05);
  group.add(helm);

  // Helmet brim
  const brim = new THREE.Mesh(new THREE.TorusGeometry(0.165, 0.025, 4, 16), helmM);
  brim.position.set(0, 1.48, 0); brim.rotation.x = Math.PI/2;
  group.add(brim);

  // Goggles / visor
  if (isEnemy) {
    const gogMat = new THREE.MeshBasicMaterial({ color: 0xff1100, transparent: true, opacity: 0.7 });
    const gog = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.04), gogMat);
    gog.position.set(0, 1.52, 0.145); group.add(gog);
  } else {
    const gogMat = new THREE.MeshBasicMaterial({ color: 0x334455, transparent: true, opacity: 0.6 });
    const gog = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.055, 0.04), gogMat);
    gog.position.set(0, 1.52, 0.14); group.add(gog);
  }

  // ── ANIME EXTRAS ──
  if (isAnime) {
    // Spiky hair sticking out of helmet sides
    const HAIR_COLS = [0xff44ff, 0x00eeff, 0xffee00, 0xff4444, 0x8844ff, 0x00ff88];
    const hcol = HAIR_COLS[Math.floor(Math.random() * HAIR_COLS.length)];
    const hairM = new THREE.MeshLambertMaterial({ color: hcol });
    [[-0.12, 1.58, 0.06], [0.12, 1.58, 0.06],
     [-0.14, 1.65, 0], [0.14, 1.65, 0],
     [0, 1.72, -0.06]].forEach(([hx, hy, hz]) => {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.22, 4), hairM);
      spike.position.set(hx, hy, hz);
      spike.rotation.z = hx < 0 ? -0.5 : (hx > 0 ? 0.5 : 0);
      spike.rotation.x = -0.2;
      group.add(spike);
    });
    // Anime large eyes glow
    const EYES = [0xff22aa, 0x00ccff, 0xaaff00, 0xff8800, 0x8822ff];
    const eyeM = new THREE.MeshBasicMaterial({ color: EYES[Math.floor(Math.random() * EYES.length)] });
    [-0.07, 0.07].forEach(ex => {
      const eye = new THREE.Mesh(new THREE.CircleGeometry(0.04, 8), eyeM);
      eye.position.set(ex, 1.52, 0.145); group.add(eye);
      // Shine dot
      const shine = new THREE.Mesh(new THREE.CircleGeometry(0.015, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      shine.position.set(ex + 0.015, 1.535, 0.146); group.add(shine);
    });
  }

  // ── ARMS (tapered — shoulder wider than wrist) ──
  ['armL', 'armR'].forEach((name, side) => {
    const sx = side === 0 ? -1 : 1;
    // Upper arm (shoulder pad)
    const spMat = new THREE.MeshLambertMaterial({ color: outfit.vest });
    const sp = new THREE.Mesh(new THREE.SphereGeometry(0.1, 7, 5), spMat);
    sp.position.set(sx * 0.3, 1.08, 0); group.add(sp);

    // Upper arm
    const ua = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.065, 0.3, 7), shirtM);
    ua.position.set(sx * 0.3, 0.9, 0);
    ua.name = name + '_upper'; ua.castShadow = true; group.add(ua);

    // Elbow joint
    const ej = new THREE.Mesh(new THREE.SphereGeometry(0.068, 6, 5), shirtM);
    ej.position.set(sx * 0.31, 0.73, 0); group.add(ej);

    // Forearm
    const fa = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.055, 0.28, 7), skin);
    fa.position.set(sx * 0.32, 0.58, 0);
    fa.name = name + '_lower'; fa.castShadow = true; group.add(fa);

    // Glove
    const gl = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.12), blackM);
    gl.position.set(sx * 0.32, 0.43, 0); group.add(gl);
  });

  // ── HIPS ──
  const hips = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.12, 8), pantsM);
  hips.position.y = 0.56; group.add(hips);

  // Belt
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.03, 4, 16), blackM);
  belt.position.y = 0.6; belt.rotation.x = Math.PI / 2; group.add(belt);
  // Belt buckle
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.02), metalM);
  buckle.position.set(0, 0.6, 0.21); group.add(buckle);

  // ── LEGS (tapered cylinders) ──
  ['legL', 'legR'].forEach((name, side) => {
    const lx = side === 0 ? -1 : 1;
    // Thigh
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.34, 7), pantsM);
    thigh.position.set(lx * 0.1, 0.38, 0);
    thigh.name = name + '_thigh'; thigh.castShadow = true; group.add(thigh);

    // Knee pad
    const kp = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.12), blackM);
    kp.position.set(lx * 0.1, 0.2, 0.04); group.add(kp);

    // Shin
    const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.07, 0.32, 7), pantsM);
    shin.position.set(lx * 0.1, 0.03, 0);
    shin.name = name + '_shin'; shin.castShadow = true; group.add(shin);

    // Boot (detailed)
    const bootBody = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.28), bootsM);
    bootBody.position.set(lx * 0.1, -0.16, 0.05); bootBody.castShadow = true; group.add(bootBody);
    const bootSole = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.04, 0.3), blackM);
    bootSole.position.set(lx * 0.1, -0.22, 0.05); group.add(bootSole);
    const bootToe = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 0.1), bootsM);
    bootToe.position.set(lx * 0.1, -0.16, 0.175); group.add(bootToe);
  });

  // Radio on back
  const radio = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.16, 0.05), blackM);
  radio.position.set(0.18, 0.98, -0.2); group.add(radio);
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.18, 4), metalM);
  ant.position.set(0.18, 1.15, -0.2); group.add(ant);

  return group;
}

// ── PLAYER ────────────────────────────────────────────────────────────
function createPlayer(scene) {
  const outfit = { shirt: 0x1a3a6a, pants: 0x1a2a4a, boots: 0x151515, vest: 0x223314, helmet: 0x1e2e10 };
  const mesh = buildRealisticHuman({ skinTone: 0xc8854a, outfit, isEnemy: false });
  mesh.position.set(0, 0, 0);
  mesh.name = 'PLAYER';
  scene.add(mesh);
  window._playerMesh = mesh;
  // Gun
  attachGunToPlayer(window.currentPlayer.equippedWeapon || 'assault');
  // Name tag
  createNameTag3D(mesh, window.currentPlayer.name, false, false);
  return mesh;
}

function attachGunToPlayer(weaponId) {
  if (!window._playerMesh) return;
  const old = window._playerMesh.getObjectByName('PLAYERGUN');
  if (old) window._playerMesh.remove(old);
  const gun = buildGunMesh(weaponId);
  gun.name = 'PLAYERGUN';
  // Position in right hand
  gun.position.set(0.32, 0.62, -0.15);
  gun.rotation.set(0, 0, 0);
  window._playerMesh.add(gun);
  window._gunMesh = gun;
}

// ── ENEMIES ───────────────────────────────────────────────────────────
const SKINS = [0xd4935a, 0xc87840, 0xa05828, 0xe8b070, 0x8a5030, 0xddb080];
const AGENT_NAMES = ['GHOST','VIPER','ZEUS','REAPER','PHANTOM','NOVA','RYUU','SAKURA','BLADE','STORM','ZERO','KIRA'];

function spawnEnemies(scene, count = 5) {
  for (let i = 0; i < count; i++) {
    const isAnime = i % 3 === 2; // every 3rd is anime
    const skin = SKINS[i % SKINS.length];
    const outfit = {
      shirt: isAnime ? [0x441166, 0x113366, 0x661100][i % 3] : 0x661111,
      pants: isAnime ? 0x221133 : 0x331111,
      boots: 0x110a0a, vest: isAnime ? 0x220a44 : 0x4a0a0a, helmet: isAnime ? 0x2a0a44 : 0x3a0808,
    };
    const mesh = buildRealisticHuman({ skinTone: skin, outfit, isEnemy: true, isAnime });
    const angle = (i / count) * Math.PI * 2;
    const r = 18 + Math.random() * 30;
    mesh.position.set(Math.cos(angle) * r, 0, Math.sin(angle) * r);
    mesh.name = 'ENEMY_' + i;
    mesh.castShadow = true;
    scene.add(mesh);

    const wKey = ['smg','assault','pistol','shotgun','ak47'][i % 5];
    const gun = buildGunMesh(wKey);
    gun.name = 'EGUN'; gun.position.set(0.32, 0.62, -0.15);
    mesh.add(gun);

    const name = AGENT_NAMES[i % AGENT_NAMES.length];
    createNameTag3D(mesh, name, true, isAnime);

    window._enemies.push({
      mesh, name, isAnime,
      health: 70 + i * 8, maxHealth: 70 + i * 8,
      weapon: wKey, lastShot: 0, dead: false,
      state: 'patrol',
      patrolTarget: randPoint(),
      walkPhase: Math.random() * Math.PI * 2,
    });
  }
}

// ── BYSTANDERS ────────────────────────────────────────────────────────
function spawnBystanders(scene, count = 10) {
  for (let i = 0; i < count; i++) {
    const skin = SKINS[Math.floor(Math.random() * SKINS.length)];
    const outfitCols = [0x224488, 0x882244, 0x228844, 0x886622, 0x664488];
    const col = outfitCols[Math.floor(Math.random() * outfitCols.length)];
    const outfit = { shirt: col, pants: col - 0x111111, boots: 0x111111, vest: 0, helmet: 0 };
    const mesh = buildRealisticHuman({ skinTone: skin, outfit });
    // No helmet for bystanders — override
    mesh.children.forEach(c => { if (c.geometry instanceof THREE.SphereGeometry && c.material.color.getHex() !== skin) c.visible = false; });
    mesh.position.set((Math.random() - 0.5) * 70, 0, (Math.random() - 0.5) * 70);
    mesh.name = 'BYS_' + i;
    scene.add(mesh);
    window._bystanders.push({
      mesh, walkTarget: randPoint(),
      walkPhase: Math.random() * Math.PI * 2,
      speed: 1.1 + Math.random() * 1.4,
      isPanicking: false,
    });
  }
}

// ── PICKUPS ───────────────────────────────────────────────────────────
function spawnPickups(scene) {
  const TYPES = ['grenade','medkit','armor','ammo'];
  for (let i = 0; i < 16; i++) {
    const type = TYPES[i % TYPES.length];
    const g = buildPickup(type);
    g.position.set((Math.random() - 0.5) * 60, 0.45, (Math.random() - 0.5) * 60);
    g.name = 'PU_' + i;
    scene.add(g);
    window._pickups.push({ mesh: g, type, active: true, bobOff: Math.random() * Math.PI * 2 });
    window._pickupMeshes.push(g);
  }
}

function buildPickup(type) {
  const g = new THREE.Group();
  const COLS = { grenade: 0x448822, medkit: 0xff2244, armor: 0x2255cc, ammo: 0xffaa00 };
  const col = COLS[type];
  const mat = new THREE.MeshLambertMaterial({ color: col });
  const gMat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.3, side: THREE.BackSide });

  if (type === 'grenade') {
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), mat); g.add(body);
    const pin  = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.12, 4), new THREE.MeshLambertMaterial({ color: 0xaaaaaa }));
    pin.position.y = 0.17; g.add(pin);
    const lever = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.025, 0.025), new THREE.MeshLambertMaterial({ color: 0x888888 }));
    lever.position.set(0.1, 0.12, 0); g.add(lever);
  } else if (type === 'medkit') {
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.16, 0.25), mat); g.add(box);
    const ch = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.05), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    ch.position.y = 0.085; g.add(ch);
    const cv = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.14), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    cv.position.y = 0.085; g.add(cv);
  } else if (type === 'armor') {
    const vest = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.22, 8), mat); g.add(vest);
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.02, 4, 10), new THREE.MeshLambertMaterial({ color: 0x888888 }));
    strap.rotation.x = Math.PI/2; strap.position.y = 0.12; g.add(strap);
  } else {
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.14), mat); g.add(box);
    for (let i = 0; i < 3; i++) {
      const bullet = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.1, 5), new THREE.MeshLambertMaterial({ color: 0xddaa44 }));
      bullet.position.set(-0.06 + i * 0.06, 0.1, 0); g.add(bullet);
    }
  }
  // Glow sphere
  const gs = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), gMat); g.add(gs);
  // Point light
  const pl = new THREE.PointLight(col, 0.5, 3);
  g.add(pl);
  return g;
}

// ── PICKUP UPDATE ─────────────────────────────────────────────────────
function updatePickups(dt) {
  const t = Date.now() * 0.001;
  window._pickups.forEach(p => {
    if (!p.active) return;
    p.mesh.position.y = 0.45 + Math.sin(t * 2.2 + p.bobOff) * 0.07;
    p.mesh.rotation.y += dt * 1.5;
    if (window._playerMesh && p.mesh.position.distanceTo(window._playerMesh.position) < 1.4) {
      collectPickup(p);
    }
  });
}

function collectPickup(p) {
  if (!p.active) return;
  p.active = false; p.mesh.visible = false;
  playSFX('pickup');
  const ps = window._PS; const cp = window.currentPlayer;
  if (p.type === 'grenade') { cp.grenades = Math.min(5, (cp.grenades || 0) + 2); showPickupMsg('+ 2 GRENADES', '#ffcc00'); }
  else if (p.type === 'medkit') {
    ps.health = Math.min(ps.maxHealth, ps.health + 40);
    updateHUD();
    const hf = document.getElementById('healFlash'); if (hf) { hf.classList.remove('flash'); void hf.offsetWidth; hf.classList.add('flash'); }
    showPickupMsg('+ 40 HP', '#00ff88');
  } else if (p.type === 'armor') {
    ps.armor = Math.min(100, ps.armor + 50); updateHUD(); showPickupMsg('+ 50 ARMOR', '#4488ff');
  } else if (p.type === 'ammo') {
    if (window.WS?.current) window.WS.reserve = Math.min(window.WS.current.res * 2, window.WS.reserve + window.WS.current.ammo * 2);
    updateAmmoHUD(); showPickupMsg('+ AMMO', '#ff9940');
  }
  updateGearHUD();
  setTimeout(() => { p.active = true; p.mesh.visible = true; p.mesh.position.set((Math.random()-0.5)*60, 0.45, (Math.random()-0.5)*60); }, 18000);
}

function showPickupMsg(text, color) {
  const el = document.getElementById('pickupNotif'); if (!el) return;
  el.textContent = text; el.style.color = color; el.classList.remove('hidden');
  clearTimeout(window._puT); window._puT = setTimeout(() => el.classList.add('hidden'), 2200);
}

// ── ENEMY AI ──────────────────────────────────────────────────────────
function updateEnemyAI(enemy, dt) {
  if (enemy.dead) return;
  const mesh = enemy.mesh, pm = window._playerMesh; if (!mesh || !pm) return;
  enemy.walkPhase = (enemy.walkPhase || 0) + dt * 3.5;
  const dist = mesh.position.distanceTo(pm.position);

  if (dist < 3) enemy.state = 'melee';
  else if (dist < 8) enemy.state = 'attack';
  else if (dist < 25) enemy.state = 'chase';
  else if (dist < 45) enemy.state = 'approach';
  else enemy.state = 'patrol';

  let moveDir = new THREE.Vector3();

  if (enemy.state === 'patrol') {
    if (mesh.position.distanceTo(enemy.patrolTarget) < 2) enemy.patrolTarget = randPoint();
    moveDir.subVectors(enemy.patrolTarget, mesh.position).normalize();
    mesh.position.addScaledVector(moveDir, 2.5 * dt);
  } else if (enemy.state === 'approach' || enemy.state === 'chase') {
    moveDir.subVectors(pm.position, mesh.position).normalize();
    mesh.position.addScaledVector(moveDir, (enemy.state === 'chase' ? 5.5 : 3.5) * dt);
  } else if (enemy.state === 'attack' || enemy.state === 'melee') {
    const toP = new THREE.Vector3().subVectors(pm.position, mesh.position);
    // Strafe
    const strafe = new THREE.Vector3(-toP.z, 0, toP.x).normalize();
    mesh.position.addScaledVector(strafe, Math.sin(enemy.walkPhase * 0.5) * 2.8 * dt);
    if (dist < 5) mesh.position.addScaledVector(toP.normalize(), -2 * dt);
    // Shoot
    const now = Date.now();
    if (now - enemy.lastShot > (enemy.isAnime ? 550 : 850)) {
      enemy.lastShot = now; enemyShootPlayer(12 + Math.floor(Math.random() * 10));
    }
    moveDir.copy(toP.normalize());
  }

  if (moveDir.length() > 0.01) mesh.rotation.y = Math.atan2(moveDir.x, moveDir.z);
  animateHuman(mesh, enemy.walkPhase, enemy.state === 'patrol' ? 0.7 : 1.2);
  if (mesh.position.y < 0) mesh.position.y = 0;
}

// ── BYSTANDER ─────────────────────────────────────────────────────────
function updateBystander(b, dt) {
  b.walkPhase = (b.walkPhase || 0) + dt * 3;
  if (window._isShooting && window._playerMesh) {
    if (b.mesh.position.distanceTo(window._playerMesh.position) < 20) b.isPanicking = true;
  }
  const spd = b.isPanicking ? b.speed * 3 : b.speed;
  if (b.mesh.position.distanceTo(b.walkTarget) < 2) {
    b.walkTarget = randPoint(); if (b.isPanicking && Math.random() > 0.3) b.isPanicking = false;
  }
  const dir = new THREE.Vector3().subVectors(b.walkTarget, b.mesh.position).normalize();
  b.mesh.position.addScaledVector(dir, spd * dt);
  b.mesh.position.y = 0;
  b.mesh.rotation.y = Math.atan2(dir.x, dir.z);
  animateHuman(b.mesh, b.walkPhase, b.isPanicking ? 1.5 : 0.8);
}

// ── ANIMATION ─────────────────────────────────────────────────────────
function animateHuman(mesh, phase, intensity = 1) {
  const uL = mesh.getObjectByName('armL_upper');
  const uR = mesh.getObjectByName('armR_upper');
  const fL = mesh.getObjectByName('armL_lower');
  const fR = mesh.getObjectByName('armR_lower');
  const tL = mesh.getObjectByName('legL_thigh');
  const tR = mesh.getObjectByName('legR_thigh');
  const sL = mesh.getObjectByName('legL_shin');
  const sR = mesh.getObjectByName('legR_shin');
  const s = Math.sin(phase) * 0.35 * intensity;
  if (uL) uL.rotation.x = s;
  if (uR) uR.rotation.x = -s;
  if (fL) fL.rotation.x = s * 0.5;
  if (fR) fR.rotation.x = -s * 0.5;
  if (tL) tL.rotation.x = -s;
  if (tR) tR.rotation.x = s;
  if (sL) sL.rotation.x = Math.max(0, s * 0.6);
  if (sR) sR.rotation.x = Math.max(0, -s * 0.6);
}

// ── PLAYER MOVEMENT ───────────────────────────────────────────────────
window._keys = { w:false, a:false, s:false, d:false };
window._joy  = { x:0, y:0 };
let _stepT   = 0;

function updatePlayerMovement(dt, camera) {
  const ps = window._PS; const mesh = window._playerMesh; if (!mesh) return;
  const baseSpd = ps.speed + (window.currentPlayer.upgrades?.speed || 0) * 0.8;
  const spd = ps.crouching ? baseSpd * 0.4 : (window._isAiming ? baseSpd * 0.55 : baseSpd);
  const move = new THREE.Vector3();
  if (window._keys.w) move.z -= 1;
  if (window._keys.s) move.z += 1;
  if (window._keys.a) move.x -= 1;
  if (window._keys.d) move.x += 1;
  move.x += window._joy.x; move.z -= window._joy.y;
  if (move.length() > 1) move.normalize();

  if (move.length() > 0.05) {
    if (camera) move.applyEuler(new THREE.Euler(0, camera.rotation.y, 0));
    const newPos = mesh.position.clone().addScaledVector(move, spd * dt);
    if (!checkWallCollision(newPos)) mesh.position.copy(newPos);
    mesh.rotation.y = Math.atan2(move.x, move.z);
    _stepT += dt;
    if (_stepT > 0.3) { _stepT = 0; playSFX('footstep'); }
    animateHuman(mesh, Date.now() * 0.006, 1);
  }

  mesh.scale.y = ps.crouching ? 0.72 : 1.0;

  // Jump / gravity
  if (!ps.onGround) {
    ps.velocity.y -= 22 * dt;
    mesh.position.y += ps.velocity.y * dt;
    if (mesh.position.y <= 0) { mesh.position.y = 0; ps.velocity.y = 0; ps.onGround = true; }
  }
}

function checkWallCollision(pos) {
  const R = 0.45;
  for (const b of (window._buildingBoxes || [])) {
    if (pos.x > b.minX - R && pos.x < b.maxX + R && pos.z > b.minZ - R && pos.z < b.maxZ + R) return true;
  }
  return false;
}

function doJump() { if (window._PS.onGround) { window._PS.onGround = false; window._PS.velocity.y = 9; } }
function doDash() {
  const now = Date.now(); if (now - window._PS.lastDash < 1500) return;
  window._PS.lastDash = now;
  const cam = window._camera; if (!cam || !window._playerMesh) return;
  const dir = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(0, cam.rotation.y, 0));
  window._playerMesh.position.addScaledVector(dir, 5.5);
}
function startCrouch() { window._PS.crouching = true; }
function stopCrouch()  { window._PS.crouching = false; }

// ── COMBAT ────────────────────────────────────────────────────────────
function enemyShootPlayer(dmg) {
  const ps = window._PS;
  if (ps.armor > 0) { const ab = Math.min(ps.armor, dmg * 0.65); ps.armor -= ab; dmg -= ab; }
  ps.health = Math.max(0, ps.health - dmg);
  updateHUD(); playSFX('hit');
  const dv = document.getElementById('damageVignette');
  if (dv) { dv.classList.remove('flash'); void dv.offsetWidth; dv.classList.add('flash'); }
  if (ps.health <= 0) triggerGameOver();
}

function damageEnemy(enemy, dmg) {
  enemy.health -= dmg;
  flashEnemyHit(enemy.mesh);
  if (enemy.health <= 0) killEnemy(enemy);
}

function killEnemy(enemy) {
  if (enemy.dead) return; enemy.dead = true;
  if (enemy.mesh) {
    // Ragdoll fall
    enemy.mesh.rotation.x = Math.PI / 2;
    enemy.mesh.position.y = -0.18;
    setTimeout(() => window._scene?.remove(enemy.mesh), 5000);
  }
  window.currentPlayer.kills++;
  addXP(60); addCoins(30);
  addKillFeed(window.currentPlayer.name, enemy.name, window.WS?.current?.name || 'WEAPON');
  updateHUD();
  window._enemies = window._enemies.filter(e => e !== enemy);
}

function flashEnemyHit(mesh) {
  if (!mesh) return;
  mesh.traverse(c => {
    if (c.isMesh && c.material && !c.material._origHex) {
      c.material._origHex = c.material.color.getHex();
      c.material.color.setHex(0xff3333);
      setTimeout(() => { c.material.color.setHex(c.material._origHex); c.material._origHex = null; }, 80);
    }
  });
}

// ── NAME TAGS ─────────────────────────────────────────────────────────
function createNameTag3D(mesh, name, isEnemy, isAnime) {
  const tag = document.createElement('div');
  tag.className = 'name-tag' + (isAnime ? ' anime' : (isEnemy ? ' enemy' : ''));
  tag.textContent = name.toUpperCase();
  tag.id = 'nt_' + mesh.name;
  document.getElementById('gameContainer')?.appendChild(tag);
  mesh._nameTag = tag;
}

function updateAllNameTags(camera, renderer) {
  if (!camera || !renderer) return;
  const W = renderer.domElement.clientWidth, H = renderer.domElement.clientHeight;
  [...(window._enemies||[]), ...(window._bystanders||[]), { mesh: window._playerMesh, name: window.currentPlayer.name }].forEach(c => {
    const mesh = c.mesh; if (!mesh || !mesh._nameTag) return;
    const wp = new THREE.Vector3().setFromMatrixPosition(mesh.matrixWorld);
    wp.y += 2.2;
    const p = wp.clone().project(camera);
    if (p.z > 1) { mesh._nameTag.style.display = 'none'; return; }
    const sx = (p.x * 0.5 + 0.5) * W, sy = (-p.y * 0.5 + 0.5) * H;
    if (sx < 0 || sx > W || sy < 0 || sy > H) { mesh._nameTag.style.display = 'none'; return; }
    mesh._nameTag.style.display = 'block';
    mesh._nameTag.style.left = sx + 'px'; mesh._nameTag.style.top = sy + 'px';
  });
}

// ── GRENADES ──────────────────────────────────────────────────────────
function doGrenade() {
  if ((window.currentPlayer.grenades || 0) <= 0) { showPickupMsg('No grenades!', '#ff4444'); return; }
  window.currentPlayer.grenades--;
  updateGearHUD(); playSFX('grenade_throw');
  const cam = window._camera; if (!cam || !window._playerMesh) return;
  const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
  throwGrenade(cam.position.clone(), dir);
}

function throwGrenade(start, dir) {
  const scene = window._scene; if (!scene) return;
  const mat = new THREE.MeshLambertMaterial({ color: 0x448822 });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.12, 7, 5), mat);
  mesh.position.copy(start);
  scene.add(mesh);
  let v = dir.clone().multiplyScalar(16); v.y += 5;
  let t = 0;
  const tick = setInterval(() => {
    t += 0.016; v.y -= 20 * 0.016;
    mesh.position.addScaledVector(v, 0.016);
    mesh.rotation.x += 0.2;
    if (t > 2.5 || mesh.position.y < 0) {
      clearInterval(tick); explode(mesh.position.clone(), scene); scene.remove(mesh);
    }
  }, 16);
}

function explode(pos, scene) {
  playSFX('explosion');
  // Flash
  const fl = new THREE.PointLight(0xff6600, 10, 25); fl.position.copy(pos); scene.add(fl);
  setTimeout(() => scene.remove(fl), 200);
  // Shockwave ring
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2, 0.2, 6, 20), new THREE.MeshBasicMaterial({ color: 0xff8800, transparent: true, opacity: 0.8 }));
  ring.position.copy(pos); ring.rotation.x = Math.PI / 2; scene.add(ring);
  let rs = 1;
  const ex = setInterval(() => { rs += 0.4; ring.scale.setScalar(rs); ring.material.opacity -= 0.06; if (rs > 7) { clearInterval(ex); scene.remove(ring); } }, 16);
  // Damage
  (window._enemies || []).forEach(e => {
    if (e.dead || !e.mesh) return;
    const d = e.mesh.position.distanceTo(pos);
    if (d < 9) damageEnemy(e, Math.max(30, 220 - d * 20));
  });
  if (window._playerMesh) {
    const d = window._playerMesh.position.distanceTo(pos);
    if (d < 5) enemyShootPlayer(Math.max(10, 180 - d * 26));
  }
  // Damage vignette
  const dv = document.getElementById('damageVignette');
  if (dv) { dv.classList.remove('flash'); void dv.offsetWidth; dv.classList.add('flash'); }
}

function doHeal() {
  if ((window.currentPlayer.medkits || 0) <= 0) { showPickupMsg('No medkits!', '#ff4444'); return; }
  window.currentPlayer.medkits--;
  updateGearHUD();
  window._PS.health = Math.min(window._PS.maxHealth, window._PS.health + 55);
  updateHUD(); playSFX('heal');
  const hf = document.getElementById('healFlash'); if (hf) { hf.classList.remove('flash'); void hf.offsetWidth; hf.classList.add('flash'); }
}

function updateGearHUD() {
  const g = document.getElementById('grenCount'); if (g) g.textContent = window.currentPlayer.grenades || 0;
  const m = document.getElementById('medCount');  if (m) m.textContent = window.currentPlayer.medkits  || 0;
}

function randPoint() {
  return new THREE.Vector3((Math.random() - 0.5) * 80, 0, (Math.random() - 0.5) * 80);
}
