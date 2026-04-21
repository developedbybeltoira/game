// ══════════════════════════════════════════════════
//  characters.js — Players, Robots, Bystanders
// ══════════════════════════════════════════════════

window._enemies = [];
window._bystanders = [];
window._playerMesh = null;
window._playerState = {
  health: 100,
  maxHealth: 100,
  position: { x: 0, y: 0, z: 0 },
  velocity: { x: 0, y: 0, z: 0 },
  onGround: true,
  crouching: false,
  dashing: false,
  lastDash: 0,
  speed: 8,
};

const ROBOT_COLORS   = [0xff6020, 0x20aaff, 0xffcc00, 0xdd20ff];
const BYSTANDER_SKINS = [0xf5cba7, 0xd4a574, 0xb5651d, 0xe8c07d, 0x8b4513];
const OUTFIT_COLORS  = [0x2244aa, 0xaa2222, 0x22aa44, 0x888888, 0xddbb00, 0x664422];

// ──────────────────────────────────────────────────
// Build a humanoid mesh (capsule-style from primitives)
// ──────────────────────────────────────────────────
function buildHumanoid({ skinColor = 0xf5cba7, outfitColor = 0x2244aa, isRobot = false, scale = 1 } = {}) {
  const group = new THREE.Group();

  const metal = isRobot ? 0x99aacc : null;
  const bodyCol  = isRobot ? metal : outfitColor;
  const headCol  = isRobot ? metal : skinColor;
  const armCol   = isRobot ? metal : skinColor;
  const legCol   = isRobot ? (metal - 0x111111) : (outfitColor - 0x111111);
  const eyeCol   = isRobot ? 0xff4400 : 0x222222;

  // Torso
  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.65, 0.28),
    new THREE.MeshLambertMaterial({ color: bodyCol })
  );
  torso.position.y = 0.9;
  torso.castShadow = true;
  group.add(torso);

  // Head
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.34, 0.34, 0.34),
    new THREE.MeshLambertMaterial({ color: headCol })
  );
  head.position.y = 1.45;
  head.castShadow = true;
  group.add(head);

  // Eyes
  const eyeGeo = new THREE.BoxGeometry(0.07, 0.05, 0.02);
  const eyeMat = new THREE.MeshBasicMaterial({ color: eyeCol });
  [-0.08, 0.08].forEach(x => {
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(x, 1.47, 0.17);
    group.add(eye);
  });

  // Arms
  [{ x: -0.33, name: 'armL' }, { x: 0.33, name: 'armR' }].forEach(({ x, name }) => {
    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.55, 0.16),
      new THREE.MeshLambertMaterial({ color: armCol })
    );
    arm.position.set(x, 0.85, 0);
    arm.castShadow = true;
    arm.name = name;
    group.add(arm);
  });

  // Legs
  [{ x: -0.14, name: 'legL' }, { x: 0.14, name: 'legR' }].forEach(({ x, name }) => {
    const leg = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.55, 0.2),
      new THREE.MeshLambertMaterial({ color: legCol })
    );
    leg.position.set(x, 0.28, 0);
    leg.castShadow = true;
    leg.name = name;
    group.add(leg);
  });

  // Feet
  [{ x: -0.14 }, { x: 0.14 }].forEach(({ x }) => {
    const foot = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.1, 0.3),
      new THREE.MeshLambertMaterial({ color: 0x222222 })
    );
    foot.position.set(x, 0.05, 0.05);
    foot.castShadow = true;
    group.add(foot);
  });

  // Robot extras
  if (isRobot) {
    // Antenna
    const ant = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 0.25),
      new THREE.MeshBasicMaterial({ color: 0xff4400 })
    );
    ant.position.set(0, 1.75, 0);
    group.add(ant);

    const antTip = new THREE.Mesh(
      new THREE.SphereGeometry(0.04),
      new THREE.MeshBasicMaterial({ color: 0xff6600 })
    );
    antTip.position.set(0, 1.88, 0);
    group.add(antTip);
  }

  group.scale.setScalar(scale);
  return group;
}

// ──────────────────────────────────────────────────
// Create Player character
// ──────────────────────────────────────────────────
function createPlayer(scene) {
  const mesh = buildHumanoid({
    skinColor: 0xf5cba7,
    outfitColor: 0x1a3a6a,
  });
  mesh.position.set(0, 0, 0);
  mesh.name = 'PLAYER';
  scene.add(mesh);
  window._playerMesh = mesh;

  // Name tag
  createNameTag(mesh, window.currentPlayer.name, false, false);
  return mesh;
}

// ──────────────────────────────────────────────────
// Create Robots
// ──────────────────────────────────────────────────
function spawnRobots(scene, count = 5) {
  for (let i = 0; i < count; i++) {
    const mesh = buildHumanoid({ isRobot: true });
    const angle = (i / count) * Math.PI * 2;
    const radius = 25 + Math.random() * 30;
    mesh.position.set(
      Math.cos(angle) * radius,
      0,
      Math.sin(angle) * radius
    );
    mesh.name = `ROBOT_${i}`;
    scene.add(mesh);

    const robotName = `BOT-${String(i + 1).padStart(2, '0')}`;
    createNameTag(mesh, robotName, false, true);

    const robot = {
      mesh,
      name: robotName,
      health: 80,
      maxHealth: 80,
      state: 'patrol',
      patrolTarget: new THREE.Vector3(
        (Math.random() - 0.5) * 60,
        0,
        (Math.random() - 0.5) * 60
      ),
      lastShot: 0,
      dead: false,
      walkPhase: Math.random() * Math.PI * 2,
    };
    window._enemies.push(robot);
  }
}

// ──────────────────────────────────────────────────
// Spawn Bystander NPCs (realistic pedestrians)
// ──────────────────────────────────────────────────
function spawnBystanders(scene, count = 12) {
  for (let i = 0; i < count; i++) {
    const skin = BYSTANDER_SKINS[Math.floor(Math.random() * BYSTANDER_SKINS.length)];
    const outfit = OUTFIT_COLORS[Math.floor(Math.random() * OUTFIT_COLORS.length)];
    const mesh = buildHumanoid({ skinColor: skin, outfitColor: outfit });

    const x = (Math.random() - 0.5) * 80;
    const z = (Math.random() - 0.5) * 80;
    mesh.position.set(x, 0, z);
    mesh.name = `BYSTANDER_${i}`;
    scene.add(mesh);

    window._bystanders.push({
      mesh,
      walkTarget: new THREE.Vector3(
        (Math.random() - 0.5) * 80, 0,
        (Math.random() - 0.5) * 80
      ),
      walkPhase: Math.random() * Math.PI * 2,
      panicTimer: 0,
      isPanicking: false,
      speed: 1 + Math.random() * 1.5,
    });
  }
}

// ──────────────────────────────────────────────────
// Name Tags (DOM overlay)
// ──────────────────────────────────────────────────
function createNameTag(mesh, name, isEnemy = false, isRobot = false) {
  const tag = document.createElement('div');
  tag.className = 'player-name-tag' + (isEnemy ? ' enemy' : '') + (isRobot ? ' robot' : '');
  tag.textContent = name.toUpperCase();
  tag.id = 'tag_' + mesh.name;
  document.getElementById('gameContainer')?.appendChild(tag);
  mesh._nameTag = tag;
}

function updateNameTags(camera, renderer) {
  if (!camera || !renderer) return;
  const canvas = renderer.domElement;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const allChars = [
    ...(window._enemies || []),
    ...(window._bystanders || []),
  ];
  if (window._playerMesh) {
    allChars.push({ mesh: window._playerMesh, name: window.currentPlayer.name });
  }

  allChars.forEach(char => {
    const mesh = char.mesh;
    if (!mesh || !mesh._nameTag) return;
    const pos = new THREE.Vector3();
    pos.setFromMatrixPosition(mesh.matrixWorld);
    pos.y += 2; // above head

    const projected = pos.clone().project(camera);
    if (projected.z > 1) {
      mesh._nameTag.style.display = 'none';
      return;
    }
    const sx = (projected.x * 0.5 + 0.5) * w;
    const sy = (-projected.y * 0.5 + 0.5) * h;

    if (sx < 0 || sx > w || sy < 0 || sy > h) {
      mesh._nameTag.style.display = 'none';
    } else {
      mesh._nameTag.style.display = 'block';
      mesh._nameTag.style.left = sx + 'px';
      mesh._nameTag.style.top = sy + 'px';
    }
  });
}

// ──────────────────────────────────────────────────
// Robot AI Update
// ──────────────────────────────────────────────────
function updateRobotAI(robot, dt) {
  if (robot.dead) return;
  const mesh = robot.mesh;
  const player = window._playerMesh;
  if (!mesh || !player) return;

  const distToPlayer = mesh.position.distanceTo(player.position);
  robot.walkPhase = (robot.walkPhase || 0) + dt * 4;

  // State machine
  if (distToPlayer < 5) {
    robot.state = 'attack';
  } else if (distToPlayer < 30) {
    robot.state = 'chase';
  } else {
    robot.state = 'patrol';
  }

  let moveDir = new THREE.Vector3();

  if (robot.state === 'patrol') {
    if (mesh.position.distanceTo(robot.patrolTarget) < 2) {
      robot.patrolTarget.set(
        (Math.random() - 0.5) * 60, 0,
        (Math.random() - 0.5) * 60
      );
    }
    moveDir.subVectors(robot.patrolTarget, mesh.position).normalize();
    mesh.position.addScaledVector(moveDir, 2.5 * dt);
  } else if (robot.state === 'chase') {
    moveDir.subVectors(player.position, mesh.position).normalize();
    mesh.position.addScaledVector(moveDir, 4 * dt);
  } else if (robot.state === 'attack') {
    // Strafe
    const strafe = new THREE.Vector3(-moveDir.z, 0, moveDir.x);
    mesh.position.addScaledVector(strafe, Math.sin(robot.walkPhase * 0.5) * 2 * dt);

    // Shoot at player
    const now = Date.now();
    if (now - robot.lastShot > 1200) {
      robot.lastShot = now;
      robotShootPlayer(20);
    }
  }

  // Face movement direction
  if (moveDir.length() > 0.01) {
    const targetAngle = Math.atan2(moveDir.x, moveDir.z);
    mesh.rotation.y = targetAngle;
  } else {
    // Face player
    const dir = new THREE.Vector3().subVectors(player.position, mesh.position);
    mesh.rotation.y = Math.atan2(dir.x, dir.z);
  }

  // Walk animation (arm/leg swing)
  animateWalk(mesh, robot.walkPhase, robot.state !== 'attack' ? 1 : 0.3);

  // Keep on ground
  mesh.position.y = 0;
}

// ──────────────────────────────────────────────────
// Bystander Update
// ──────────────────────────────────────────────────
function updateBystander(b, dt) {
  const mesh = b.mesh;
  if (!mesh) return;
  b.walkPhase = (b.walkPhase || 0) + dt * 3;

  // Panic if player is shooting nearby
  if (window._isShooting) {
    const dist = mesh.position.distanceTo(window._playerMesh?.position || new THREE.Vector3());
    if (dist < 20) b.isPanicking = true;
  }

  const speed = b.isPanicking ? b.speed * 3 : b.speed;

  if (mesh.position.distanceTo(b.walkTarget) < 2) {
    b.walkTarget.set(
      (Math.random() - 0.5) * 80, 0,
      (Math.random() - 0.5) * 80
    );
    if (b.isPanicking) {
      b.isPanicking = Math.random() > 0.3;
    }
  }

  const dir = new THREE.Vector3().subVectors(b.walkTarget, mesh.position).normalize();
  mesh.position.addScaledVector(dir, speed * dt);
  mesh.position.y = 0;
  mesh.rotation.y = Math.atan2(dir.x, dir.z);
  animateWalk(mesh, b.walkPhase, 1);
}

// ──────────────────────────────────────────────────
// Walk Animation
// ──────────────────────────────────────────────────
function animateWalk(mesh, phase, intensity = 1) {
  const armL = mesh.getObjectByName('armL');
  const armR = mesh.getObjectByName('armR');
  const legL = mesh.getObjectByName('legL');
  const legR = mesh.getObjectByName('legR');

  const swing = Math.sin(phase) * 0.4 * intensity;
  if (armL) armL.rotation.x = swing;
  if (armR) armR.rotation.x = -swing;
  if (legL) legL.rotation.x = -swing;
  if (legR) legR.rotation.x = swing;

  // Body bob
  mesh.position.y = Math.abs(Math.sin(phase * 2)) * 0.03 * intensity;
}

// ──────────────────────────────────────────────────
// Robot shoots player
// ──────────────────────────────────────────────────
function robotShootPlayer(damage) {
  window._playerState.health = Math.max(0, window._playerState.health - damage);
  updateHUD();
  const overlay = document.getElementById('damageOverlay');
  if (overlay) {
    overlay.classList.remove('flash');
    void overlay.offsetWidth;
    overlay.classList.add('flash');
  }
  if (window._playerState.health <= 0) {
    triggerGameOver();
  }
}

// ──────────────────────────────────────────────────
// Player movement
// ──────────────────────────────────────────────────
window._moveKeys = { w: false, a: false, s: false, d: false };
window._joystickDelta = { x: 0, y: 0 };

function updatePlayerMovement(dt, camera) {
  const ps = window._playerState;
  const speed = ps.crouching ? ps.speed * 0.45 : (window.isAiming ? ps.speed * 0.6 : ps.speed);
  const move = new THREE.Vector3();

  // Keyboard
  if (window._moveKeys.w) move.z -= 1;
  if (window._moveKeys.s) move.z += 1;
  if (window._moveKeys.a) move.x -= 1;
  if (window._moveKeys.d) move.x += 1;

  // Joystick (mobile)
  move.x += window._joystickDelta.x;
  move.z -= window._joystickDelta.y;

  if (move.length() > 0) {
    move.normalize();
    if (camera) {
      move.applyEuler(new THREE.Euler(0, camera.rotation.y, 0));
    }
    const playerMesh = window._playerMesh;
    if (playerMesh) {
      playerMesh.position.addScaledVector(move, speed * dt);
      playerMesh.position.y = ps.crouching ? -0.3 : 0;
      // Face movement
      playerMesh.rotation.y = Math.atan2(move.x, move.z);

      // Walk anim
      if (move.length() > 0.01) {
        const phase = Date.now() * 0.006;
        animateWalk(playerMesh, phase, 1);
      }
    }
    // Camera follows player
    if (camera && playerMesh) {
      const camOffset = new THREE.Vector3(0, 1.6, 0.2);
      camera.position.copy(playerMesh.position).add(camOffset);
    }
  }

  // Gravity / jump
  if (!ps.onGround) {
    ps.velocity.y -= 20 * dt;
    if (window._playerMesh) {
      window._playerMesh.position.y += ps.velocity.y * dt;
      if (window._playerMesh.position.y <= 0) {
        window._playerMesh.position.y = ps.crouching ? -0.3 : 0;
        ps.velocity.y = 0;
        ps.onGround = true;
      }
    }
  }
}

function startAction(action) {
  if (action === 'jump' && window._playerState.onGround) {
    window._playerState.onGround = false;
    window._playerState.velocity.y = 8;
    document.getElementById('jumpBtn')?.classList.add('active');
  }
  if (action === 'crouch') {
    window._playerState.crouching = true;
    document.getElementById('crouchBtn')?.classList.add('active');
  }
  if (action === 'dash') {
    performDash();
    document.getElementById('dashBtn')?.classList.add('active');
  }
}

function endAction(action) {
  if (action === 'crouch') {
    window._playerState.crouching = false;
    document.getElementById('crouchBtn')?.classList.remove('active');
  }
  document.getElementById('jumpBtn')?.classList.remove('active');
  document.getElementById('dashBtn')?.classList.remove('active');
}

function performDash() {
  const now = Date.now();
  if (now - window._playerState.lastDash < 1500) return;
  window._playerState.lastDash = now;
  const cam = window._camera;
  if (!cam || !window._playerMesh) return;
  const dir = new THREE.Vector3();
  cam.getWorldDirection(dir);
  dir.y = 0; dir.normalize();
  window._playerMesh.position.addScaledVector(dir, 6);
}
