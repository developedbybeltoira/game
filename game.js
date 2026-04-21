// ══════════════════════════════════════════════════
//  game.js — Main Engine, City World, Game Loop
// ══════════════════════════════════════════════════

window.gameRunning = false;
window.gamePaused = false;
window._currentMode = 'solo';
window._scene = null;
window._camera = null;
window._renderer = null;
window._wallMeshes = [];
window._buildingBounds = [];
window._sfxEnabled = true;

// ──────────────────────────────────────────────────
// Boot sequence
// ──────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  await initAuth();
  playIntro();
  initHomeBg();
});

// ──────────────────────────────────────────────────
// CINEMATIC INTRO
// ──────────────────────────────────────────────────
function playIntro() {
  const canvas = document.getElementById('introCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  let t = 0;
  const buildings = Array.from({ length: 18 }, () => ({
    x: Math.random() * window.innerWidth,
    w: 40 + Math.random() * 80,
    h: 80 + Math.random() * 220,
    lit: Math.random() > 0.3,
  }));

  // Cars
  const cars = Array.from({ length: 8 }, () => ({
    x: Math.random() * window.innerWidth,
    y: window.innerHeight * 0.72 + Math.random() * 30,
    speed: 1.5 + Math.random() * 2,
    color: `hsl(${Math.random() * 360},60%,55%)`,
  }));

  const DURATION = 7000;
  const start = Date.now();
  const bar = document.getElementById('cinBar');

  function drawFrame() {
    const elapsed = Date.now() - start;
    const prog = Math.min(elapsed / DURATION, 1);
    if (bar) bar.style.width = (prog * 100) + '%';
    t += 0.016;

    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Sky gradient (sunset)
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, `hsl(${20 + Math.sin(t*0.1)*10},60%,${8 + prog*5}%)`);
    sky.addColorStop(0.4, `hsl(${30},70%,${12 + prog*8}%)`);
    sky.addColorStop(0.65, `hsl(${200},50%,${15}%)`);
    sky.addColorStop(1, '#050810');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // Sun/glow on horizon
    const sunX = W * 0.6, sunY = H * 0.55;
    const sunGlow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, H * 0.4);
    sunGlow.addColorStop(0, `rgba(255,160,60,${0.25 * (1 - prog * 0.3)})`);
    sunGlow.addColorStop(0.4, `rgba(255,80,20,0.08)`);
    sunGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = sunGlow;
    ctx.fillRect(0, 0, W, H);

    // Ground / road
    const road = ctx.createLinearGradient(0, H*0.65, 0, H);
    road.addColorStop(0, '#1a1a2a');
    road.addColorStop(1, '#0d0d16');
    ctx.fillStyle = road;
    ctx.fillRect(0, H * 0.65, W, H * 0.35);

    // Road lane markings
    ctx.strokeStyle = `rgba(255,220,80,${0.4})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([30, 20]);
    ctx.beginPath();
    ctx.moveTo(0, H * 0.74);
    ctx.lineTo(W, H * 0.74);
    ctx.stroke();
    ctx.setLineDash([]);

    // Buildings (silhouette)
    buildings.forEach((b, i) => {
      const baseY = H * 0.65;
      const bx = (b.x + t * (i % 3 === 0 ? 0.4 : 0)) % (W + b.w) - b.w;

      // Building shadow
      ctx.fillStyle = `rgba(0,0,0,0.4)`;
      ctx.fillRect(bx + 5, baseY - b.h + 5, b.w, b.h);

      // Building body
      const grad = ctx.createLinearGradient(bx, baseY - b.h, bx + b.w, baseY);
      grad.addColorStop(0, `hsl(220,20%,${10 + Math.random()*2}%)`);
      grad.addColorStop(1, `hsl(220,15%,8%)`);
      ctx.fillStyle = grad;
      ctx.fillRect(bx, baseY - b.h, b.w, b.h);

      // Windows
      if (b.lit) {
        const rows = Math.floor(b.h / 18);
        const cols = Math.floor(b.w / 14);
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const wx = bx + 4 + c * 14;
            const wy = baseY - b.h + 8 + r * 18;
            const on = Math.sin(i * 3.7 + r * 1.3 + c * 2.1 + t * 0.3) > 0.1;
            if (on) {
              ctx.fillStyle = `rgba(255,220,120,${0.5 + Math.sin(t + i) * 0.1})`;
              ctx.fillRect(wx, wy, 8, 10);
            }
          }
        }
      }

      // Billboard effect (some buildings)
      if (i % 4 === 0 && prog > 0.3) {
        ctx.fillStyle = `rgba(0,200,255,${(prog - 0.3) * 0.9})`;
        ctx.font = `bold ${Math.floor(b.w * 0.18)}px 'Orbitron', monospace`;
        ctx.fillText('REALM ACTIVE', bx + 4, baseY - b.h * 0.7);
      }
    });

    // Street lights
    for (let sl = 0; sl < 8; sl++) {
      const slx = (sl / 8) * W + 40;
      const sly = H * 0.65;
      ctx.strokeStyle = '#888';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(slx, sly);
      ctx.lineTo(slx, sly - 60);
      ctx.lineTo(slx + 15, sly - 60);
      ctx.stroke();
      // Glow
      const glow = ctx.createRadialGradient(slx + 15, sly - 55, 0, slx + 15, sly - 55, 25);
      glow.addColorStop(0, `rgba(255,230,150,${0.5 + prog * 0.3})`);
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.fillRect(slx - 10, sly - 80, 50, 50);
    }

    // Cars
    cars.forEach(car => {
      car.x = (car.x + car.speed) % (W + 80);
      ctx.fillStyle = car.color;
      ctx.fillRect(car.x, car.y, 36, 16);
      // Headlights
      ctx.fillStyle = 'rgba(255,255,200,0.9)';
      ctx.fillRect(car.x + 32, car.y + 3, 4, 4);
      ctx.fillRect(car.x + 32, car.y + 9, 4, 4);
      // Tail lights
      ctx.fillStyle = 'rgba(255,30,30,0.7)';
      ctx.fillRect(car.x, car.y + 3, 3, 4);
      ctx.fillRect(car.x, car.y + 9, 3, 4);
    });

    // Scanline overlay
    for (let sy = 0; sy < H; sy += 3) {
      ctx.fillStyle = 'rgba(0,0,0,0.04)';
      ctx.fillRect(0, sy, W, 1);
    }

    // Vignette
    const vig = ctx.createRadialGradient(W/2, H/2, H*0.3, W/2, H/2, H*0.8);
    vig.addColorStop(0, 'transparent');
    vig.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);

    if (prog < 1) {
      requestAnimationFrame(drawFrame);
    } else {
      skipIntro();
    }
  }
  drawFrame();
}

function skipIntro() {
  const cin = document.getElementById('cinematic');
  if (cin) {
    cin.style.transition = 'opacity 0.6s ease';
    cin.style.opacity = '0';
    setTimeout(() => {
      cin.classList.add('hidden');
      showScreen('homeScreen');
    }, 600);
  }
}

// ──────────────────────────────────────────────────
// Home Background (animated city particle scene)
// ──────────────────────────────────────────────────
function initHomeBg() {
  const canvas = document.getElementById('homeBgCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = Array.from({ length: 60 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: Math.random() * 2 + 0.5,
    vx: (Math.random() - 0.5) * 0.3,
    vy: -Math.random() * 0.5 - 0.2,
    life: Math.random(),
  }));

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background gradient
    const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bg.addColorStop(0, '#020510');
    bg.addColorStop(0.6, '#040c1a');
    bg.addColorStop(1, '#020510');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // City silhouette
    ctx.fillStyle = 'rgba(10,20,40,0.8)';
    const W = canvas.width, H = canvas.height;
    ctx.beginPath();
    ctx.moveTo(0, H * 0.7);
    for (let x = 0; x < W; x += 30) {
      const bh = 100 + Math.sin(x * 0.05) * 80 + Math.sin(x * 0.02) * 60;
      ctx.lineTo(x, H * 0.7 - bh);
      ctx.lineTo(x + 25, H * 0.7 - bh);
    }
    ctx.lineTo(W, H * 0.7);
    ctx.closePath();
    ctx.fill();

    // Particles
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.003;
      if (p.life <= 0 || p.y < 0) {
        p.x = Math.random() * W;
        p.y = H;
        p.life = 0.7 + Math.random() * 0.3;
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0,200,255,${p.life * 0.6})`;
      ctx.fill();
    });

    requestAnimationFrame(draw);
  }
  draw();

  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });
}

// ──────────────────────────────────────────────────
// START GAME
// ──────────────────────────────────────────────────
function startGame(mode) {
  window._currentMode = mode;
  window.currentPlayer.kills = 0;
  window._playerState.health = window._playerState.maxHealth;

  showScreen('gameContainer');
  document.getElementById('hudMode').textContent = mode.toUpperCase().replace('-', ' ');

  // Destroy previous scene
  if (window._renderer) {
    window._renderer.dispose();
    window._renderer = null;
    window._scene = null;
    window._camera = null;
  }
  window._enemies = [];
  window._bystanders = [];
  window._vehicles = [];
  window._wallMeshes = [];
  window._buildingBounds = [];
  document.querySelectorAll('.player-name-tag').forEach(el => el.remove());

  initThreeJS();
  buildCity(window._scene);
  createPlayer(window._scene);

  if (mode === 'robots' || mode === 'two-player') {
    spawnRobots(window._scene, mode === 'two-player' ? 2 : 6);
  } else if (mode === 'solo') {
    spawnRobots(window._scene, 4);
  } else if (mode === 'multiplayer') {
    spawnRobots(window._scene, 2);
    joinMultiplayerMatch();
  }

  spawnBystanders(window._scene, 10);
  spawnVehicles(window._scene);
  equipWeapon(window.currentPlayer.equippedWeapon || 'pistol');

  window.gameRunning = true;
  window.gamePaused = false;

  startTimer();
  updateHUD();
  startGameLoop();
  setupControls();

  // Add damage overlay
  if (!document.getElementById('damageOverlay')) {
    const overlay = document.createElement('div');
    overlay.id = 'damageOverlay';
    document.getElementById('gameContainer').appendChild(overlay);
  }
}

// ──────────────────────────────────────────────────
// THREE.JS INIT
// ──────────────────────────────────────────────────
function initThreeJS() {
  const canvas = document.getElementById('gameCanvas');
  const W = window.innerWidth, H = window.innerHeight;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0e1c);
  scene.fog = new THREE.FogExp2(0x0a0e1c, 0.018);
  window._scene = scene;

  const camera = new THREE.PerspectiveCamera(75, W / H, 0.1, 300);
  camera.position.set(0, 1.6, 0.2);
  camera._targetFOV = 75;
  window._camera = camera;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  window._renderer = renderer;

  // Lights
  const ambient = new THREE.AmbientLight(0x1a2040, 0.6);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xffa060, 1.2);
  sun.position.set(50, 80, 30);
  sun.castShadow = true;
  sun.shadow.mapSize.width = 2048;
  sun.shadow.mapSize.height = 2048;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 200;
  sun.shadow.camera.left = -80;
  sun.shadow.camera.right = 80;
  sun.shadow.camera.top = 80;
  sun.shadow.camera.bottom = -80;
  scene.add(sun);

  const moonLight = new THREE.DirectionalLight(0x4060ff, 0.3);
  moonLight.position.set(-30, 40, -20);
  scene.add(moonLight);

  window.addEventListener('resize', () => {
    const W = window.innerWidth, H = window.innerHeight;
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    renderer.setSize(W, H);
  });
}

// ──────────────────────────────────────────────────
// BUILD CITY WORLD
// ──────────────────────────────────────────────────
function buildCity(scene) {
  // Ground
  const groundGeo = new THREE.PlaneGeometry(200, 200, 20, 20);
  const groundMat = new THREE.MeshLambertMaterial({ color: 0x1a1e2c });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Roads (cross pattern + diagonal)
  addRoad(scene, 0, 0, 200, 8, true);   // main horizontal
  addRoad(scene, 0, 0, 200, 8, false);  // main vertical
  addRoad(scene, 30, 0, 200, 6, true);  // side road
  addRoad(scene, -30, 0, 200, 6, false);
  addRoad(scene, 0, 25, 80, 5, true);

  // City blocks — buildings
  const cityLayout = [
    // [x, z, w, h, d, color]
    [20, 20, 12, 35, 10, 0x2a3050],   [20, -20, 10, 50, 8, 0x303545],
    [-20, 20, 14, 28, 12, 0x252a40],  [-20, -20, 10, 60, 10, 0x2c3045],
    [45, 15, 16, 22, 14, 0x1e2438],   [45, -15, 12, 40, 10, 0x28304a],
    [-45, 15, 14, 30, 12, 0x232840],  [-45, -15, 10, 45, 8,  0x2a3050],
    [70, 5, 18, 55, 15, 0x1c2035],    [-70, 5, 16, 42, 13, 0x242040],
    [20, 50, 12, 20, 10, 0x2e3555],   [-20, 50, 10, 30, 8, 0x2a3048],
    [50, -45, 14, 18, 12, 0x262c42],  [-50, -45, 16, 35, 14, 0x202038],
    [0, 60, 20, 15, 15, 0x303050],    [35, -60, 12, 25, 10, 0x252a3c],
  ];

  cityLayout.forEach(([x, z, w, h, d, color]) => {
    addBuilding(scene, x, z, w, h, d, color);
    window._buildingBounds.push({ x, z, w, d });
  });

  // Gas station
  addGasStation(scene, -55, -55);

  // Abandoned factory
  addFactory(scene, 60, -60);

  // Bridge
  addBridge(scene, 0, -80, 200, 6);

  // Signboards
  addSignboard(scene, 15, 20, 'BELLA FOODS', 0xff8040);
  addSignboard(scene, -18, -22, 'BELLA MARKET', 0x40cc40);
  addSignboard(scene, 42, 18, 'BELLA TELECOM', 0x4080ff);
  addSignboard(scene, -42, -18, 'FOOD & DRINKS', 0xffcc20);
  addSignboard(scene, 68, 8, 'REALM TOWER', 0x00c8ff);

  // Street lights
  for (let i = -5; i <= 5; i++) {
    addStreetLight(scene, i * 18, 5);
    addStreetLight(scene, i * 18, -5);
    addStreetLight(scene, 5, i * 18);
    addStreetLight(scene, -5, i * 18);
  }

  // Fences / barriers
  for (let i = -3; i <= 3; i++) {
    addBarrier(scene, i * 15 + 7, 8);
    addBarrier(scene, i * 15 + 7, -8);
  }

  // Ground texture grid lines
  const lineGeo = new THREE.PlaneGeometry(200, 200);
  const lineMat = new THREE.MeshBasicMaterial({
    color: 0x222840, transparent: true, opacity: 0.4,
    wireframe: false,
  });
  // Road markings
  addRoadMarkings(scene);

  // Sky particles (city lights/stars)
  addCityAtmosphere(scene);
}

function addRoad(scene, cx, cz, len, width, isX) {
  const geo = new THREE.PlaneGeometry(isX ? len : width, isX ? width : len);
  const mat = new THREE.MeshLambertMaterial({ color: 0x131825 });
  const road = new THREE.Mesh(geo, mat);
  road.rotation.x = -Math.PI / 2;
  road.position.set(cx, 0.01, cz);
  road.receiveShadow = true;
  scene.add(road);

  // Yellow line
  const lineGeo = new THREE.PlaneGeometry(isX ? len : 0.15, isX ? 0.15 : len);
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xddaa00, transparent: true, opacity: 0.7 });
  const line = new THREE.Mesh(lineGeo, lineMat);
  line.rotation.x = -Math.PI / 2;
  line.position.set(cx, 0.02, cz);
  scene.add(line);
}

function addRoadMarkings(scene) {
  // White dashed lines along roads
  for (let i = -10; i <= 10; i++) {
    if (Math.abs(i) > 1) {
      const dash = new THREE.Mesh(
        new THREE.PlaneGeometry(0.2, 3),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 })
      );
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(i * 8, 0.015, 0);
      scene.add(dash);
    }
  }
}

function addBuilding(scene, x, z, w, h, d, color) {
  // Main structure
  const geo = new THREE.BoxGeometry(w, h, d);
  const mat = new THREE.MeshLambertMaterial({ color });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, h / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  window._wallMeshes.push(mesh);

  // Windows grid
  const winCols = Math.floor(w / 2.5);
  const winRows = Math.floor(h / 3.5);
  for (let r = 0; r < winRows; r++) {
    for (let c = 0; c < winCols; c++) {
      const lit = Math.random() > 0.35;
      if (!lit) continue;
      const winColor = Math.random() > 0.3 ? 0xffffaa : 0xaaccff;
      const win = new THREE.Mesh(
        new THREE.PlaneGeometry(1.2, 1.8),
        new THREE.MeshBasicMaterial({ color: winColor, transparent: true, opacity: 0.6 + Math.random() * 0.3 })
      );
      const wx = x - w/2 + (c + 0.5) * (w / winCols) + 0.3;
      const wy = 2 + r * 3.5;
      win.position.set(wx, wy, z + d/2 + 0.01);
      scene.add(win);

      // Window light glow
      if (Math.random() > 0.7) {
        const light = new THREE.PointLight(winColor, 0.3, 8);
        light.position.set(wx, wy, z + d/2 + 0.5);
        scene.add(light);
      }
    }
  }

  // Rooftop details
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(w * 0.9, 0.5, d * 0.9),
    new THREE.MeshLambertMaterial({ color: color + 0x050505 })
  );
  roof.position.set(x, h + 0.25, z);
  roof.castShadow = true;
  scene.add(roof);

  // Rooftop antenna
  if (Math.random() > 0.5) {
    const ant = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 3),
      new THREE.MeshLambertMaterial({ color: 0x888888 })
    );
    ant.position.set(x + Math.random() * 2 - 1, h + 2, z + Math.random() * 2 - 1);
    scene.add(ant);
  }
}

function addGasStation(scene, x, z) {
  // Base
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(16, 0.2, 12),
    new THREE.MeshLambertMaterial({ color: 0x1a2030 })
  );
  base.position.set(x, 0.1, z);
  base.receiveShadow = true;
  scene.add(base);

  // Canopy
  const canopy = new THREE.Mesh(
    new THREE.BoxGeometry(14, 0.3, 10),
    new THREE.MeshLambertMaterial({ color: 0xff4422 })
  );
  canopy.position.set(x, 5, z);
  scene.add(canopy);

  // Pumps
  [[-3, 0], [0, 0], [3, 0]].forEach(([ox, oz]) => {
    const pump = new THREE.Mesh(
      new THREE.BoxGeometry(1, 2, 0.6),
      new THREE.MeshLambertMaterial({ color: 0x336688 })
    );
    pump.position.set(x + ox, 1, z + oz);
    pump.castShadow = true;
    scene.add(pump);
  });

  // Canopy supports
  [[-5, -4], [5, -4], [-5, 4], [5, 4]].forEach(([ox, oz]) => {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 5),
      new THREE.MeshLambertMaterial({ color: 0x888888 })
    );
    post.position.set(x + ox, 2.5, z + oz);
    scene.add(post);
  });

  addSignboard(scene, x + 8, z - 5, 'GAS STATION', 0xff6600);
}

function addFactory(scene, x, z) {
  // Main hall
  const hall = new THREE.Mesh(
    new THREE.BoxGeometry(30, 15, 20),
    new THREE.MeshLambertMaterial({ color: 0x2a2220 })
  );
  hall.position.set(x, 7.5, z);
  hall.castShadow = true;
  scene.add(hall);
  window._wallMeshes.push(hall);

  // Chimney stacks
  [[-10, -5], [10, -5]].forEach(([ox, oz]) => {
    const chimney = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 1, 20),
      new THREE.MeshLambertMaterial({ color: 0x3a3030 })
    );
    chimney.position.set(x + ox, 10, z + oz);
    chimney.castShadow = true;
    scene.add(chimney);

    // Red light on chimney
    const light = new THREE.PointLight(0xff2200, 1.5, 15);
    light.position.set(x + ox, 21, z + oz);
    scene.add(light);
  });

  addSignboard(scene, x + 16, z, 'ABANDONED', 0x888888);
}

function addBridge(scene, x, z, len, w) {
  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(len, 0.5, w),
    new THREE.MeshLambertMaterial({ color: 0x2a3550 })
  );
  deck.position.set(x, 3, z);
  deck.castShadow = true;
  scene.add(deck);

  // Railings
  for (let i = -10; i <= 10; i++) {
    [-(w/2 - 0.3), (w/2 - 0.3)].forEach(rz => {
      const post = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 1.2, 0.15),
        new THREE.MeshLambertMaterial({ color: 0x888888 })
      );
      post.position.set(x + i * 9, 4, z + rz);
      scene.add(post);
    });
  }
}

function addStreetLight(scene, x, z) {
  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.1, 6, 6),
    new THREE.MeshLambertMaterial({ color: 0x666666 })
  );
  post.position.set(x, 3, z);
  post.castShadow = true;
  scene.add(post);

  const arm = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.1, 0.1),
    new THREE.MeshLambertMaterial({ color: 0x666666 })
  );
  arm.position.set(x + 0.7, 6.1, z);
  scene.add(arm);

  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 6, 6),
    new THREE.MeshBasicMaterial({ color: 0xffffcc })
  );
  lamp.position.set(x + 1.3, 6, z);
  scene.add(lamp);

  const light = new THREE.PointLight(0xffe8a0, 1.2, 18);
  light.position.set(x + 1.3, 5.8, z);
  scene.add(light);
}

function addBarrier(scene, x, z) {
  const bar = new THREE.Mesh(
    new THREE.BoxGeometry(3.5, 0.9, 0.5),
    new THREE.MeshLambertMaterial({ color: 0xee6622 })
  );
  bar.position.set(x, 0.45, z);
  bar.castShadow = true;
  scene.add(bar);
  window._wallMeshes.push(bar);

  // White stripes
  for (let i = 0; i < 4; i++) {
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.91, 0.51),
      new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0xffffff : 0xee6622 })
    );
    stripe.position.set(x - 1.5 + i * 1, 0.45, z);
    scene.add(stripe);
  }
}

function addSignboard(scene, x, z, text, color) {
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(6, 2, 0.2),
    new THREE.MeshLambertMaterial({ color: 0x1a1a2a })
  );
  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, 4),
    new THREE.MeshLambertMaterial({ color: 0x888888 })
  );
  post.position.set(x, 2, z);
  board.position.set(x, 4.2, z);
  scene.add(post);
  scene.add(board);

  // Color strip
  const strip = new THREE.Mesh(
    new THREE.BoxGeometry(6, 0.3, 0.21),
    new THREE.MeshBasicMaterial({ color })
  );
  strip.position.set(x, 3.3, z);
  scene.add(strip);

  // Light from board
  const light = new THREE.PointLight(color, 0.5, 10);
  light.position.set(x, 4.5, z + 0.5);
  scene.add(light);
}

function addCityAtmosphere(scene) {
  // Stars
  const starGeo = new THREE.BufferGeometry();
  const starCount = 800;
  const positions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    positions[i*3]   = (Math.random() - 0.5) * 400;
    positions[i*3+1] = 40 + Math.random() * 100;
    positions[i*3+2] = (Math.random() - 0.5) * 400;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.3, transparent: true, opacity: 0.6 });
  scene.add(new THREE.Points(starGeo, starMat));

  // Moon
  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(3, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xeeeebb })
  );
  moon.position.set(-80, 80, -120);
  scene.add(moon);
  const moonGlow = new THREE.PointLight(0xbbccff, 0.8, 150);
  moonGlow.position.copy(moon.position);
  scene.add(moonGlow);
}

// ──────────────────────────────────────────────────
// CONTROLS (Mouse / Touch)
// ──────────────────────────────────────────────────
let _mouseX = 0, _mouseY = 0;
let _pointerLocked = false;

function setupControls() {
  const canvas = document.getElementById('gameCanvas');

  // Pointer lock (desktop aiming)
  canvas.addEventListener('click', () => {
    canvas.requestPointerLock?.();
  });
  document.addEventListener('pointerlockchange', () => {
    _pointerLocked = document.pointerLockElement === canvas;
  });

  document.addEventListener('mousemove', (e) => {
    if (!_pointerLocked || !window.gameRunning || window.gamePaused) return;
    const sens = 0.002;
    if (window._camera) {
      window._camera.rotation.y -= e.movementX * sens;
      window._camera.rotation.x = Math.max(
        -Math.PI / 3,
        Math.min(Math.PI / 3, window._camera.rotation.x - e.movementY * sens)
      );
    }
  });

  // Touch look (right side)
  let _touchLookId = null, _touchLookX = 0, _touchLookY = 0;
  const rightZone = document.getElementById('gameContainer');
  rightZone.addEventListener('touchstart', (e) => {
    Array.from(e.changedTouches).forEach(t => {
      if (t.clientX > window.innerWidth * 0.45) {
        _touchLookId = t.identifier;
        _touchLookX = t.clientX;
        _touchLookY = t.clientY;
      }
    });
  }, { passive: true });

  rightZone.addEventListener('touchmove', (e) => {
    Array.from(e.changedTouches).forEach(t => {
      if (t.identifier === _touchLookId && window._camera) {
        const dx = t.clientX - _touchLookX;
        const dy = t.clientY - _touchLookY;
        window._camera.rotation.y -= dx * 0.004;
        window._camera.rotation.x = Math.max(
          -Math.PI / 2.5,
          Math.min(Math.PI / 2.5, window._camera.rotation.x - dy * 0.004)
        );
        _touchLookX = t.clientX;
        _touchLookY = t.clientY;
      }
    });
  }, { passive: true });

  // Joystick
  initJoystick();

  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (!window.gameRunning) return;
    const k = e.key.toLowerCase();
    if (k === 'w' || k === 'arrowup') window._moveKeys.w = true;
    if (k === 'a' || k === 'arrowleft') window._moveKeys.a = true;
    if (k === 's' || k === 'arrowdown') window._moveKeys.s = true;
    if (k === 'd' || k === 'arrowright') window._moveKeys.d = true;
    if (k === ' ') { e.preventDefault(); startAction('jump'); }
    if (k === 'c') startAction('crouch');
    if (k === 'r') reloadWeapon();
    if (k === 'f') toggleVehicle();
    if (k === 'escape') pauseGame();
    if (k === 'b') openInGameShop();
    if (k === 'shift') startAction('dash');
    if (k === 'mousedown' || k === 'z') startShooting();
    if (k === 'rightclick' || k === 'q') startAiming();
  });

  document.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'w' || k === 'arrowup') window._moveKeys.w = false;
    if (k === 'a' || k === 'arrowleft') window._moveKeys.a = false;
    if (k === 's' || k === 'arrowdown') window._moveKeys.s = false;
    if (k === 'd' || k === 'arrowright') window._moveKeys.d = false;
    if (k === 'c') endAction('crouch');
    if (k === 'q') stopAiming();
    if (k === 'z') stopShooting();
  });

  // Mouse click = shoot
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0 && window.gameRunning && !window.gamePaused) startShooting();
    if (e.button === 2) startAiming();
  });
  canvas.addEventListener('mouseup', (e) => {
    if (e.button === 0) stopShooting();
    if (e.button === 2) stopAiming();
  });
  canvas.addEventListener('contextmenu', e => e.preventDefault());
}

function initJoystick() {
  const base = document.querySelector('.joystick-base');
  const knob = document.getElementById('joystickKnob');
  if (!base || !knob) return;

  let active = false, startX = 0, startY = 0;
  const MAX_R = 28;

  base.addEventListener('touchstart', (e) => {
    active = true;
    const t = e.changedTouches[0];
    const rect = base.getBoundingClientRect();
    startX = rect.left + rect.width / 2;
    startY = rect.top + rect.height / 2;
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (!active) return;
    const t = Array.from(e.touches).find(t => {
      const dx = t.clientX - startX, dy = t.clientY - startY;
      return Math.sqrt(dx*dx + dy*dy) < 80;
    });
    if (!t) return;
    let dx = t.clientX - startX;
    let dy = t.clientY - startY;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist > MAX_R) { dx = dx/dist*MAX_R; dy = dy/dist*MAX_R; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    window._joystickDelta.x = dx / MAX_R;
    window._joystickDelta.y = -dy / MAX_R;
  }, { passive: true });

  document.addEventListener('touchend', () => {
    active = false;
    knob.style.transform = '';
    window._joystickDelta.x = 0;
    window._joystickDelta.y = 0;
  });
}

// ──────────────────────────────────────────────────
// GAME LOOP
// ──────────────────────────────────────────────────
let _lastTime = 0;

function startGameLoop() {
  _lastTime = performance.now();
  requestAnimationFrame(gameLoop);
}

function gameLoop(now) {
  if (!window.gameRunning) return;
  requestAnimationFrame(gameLoop);

  const dt = Math.min((now - _lastTime) / 1000, 0.05);
  _lastTime = now;

  if (window.gamePaused) return;

  // Update player
  updatePlayerMovement(dt, window._camera);

  // Update vehicle
  if (window._inVehicle) updateVehicle(dt);

  // FOV smooth zoom
  if (window._camera) {
    const target = window._camera._targetFOV || 75;
    window._camera.fov += (target - window._camera.fov) * 8 * dt;
    window._camera.updateProjectionMatrix();
  }

  // Update robots
  (window._enemies || []).forEach(robot => updateRobotAI(robot, dt));

  // Update bystanders
  (window._bystanders || []).forEach(b => updateBystander(b, dt));

  // Multiplayer tick
  tickMultiplayer(dt);

  // Draw minimap
  drawMinimap();

  // Update name tags
  updateNameTags(window._camera, window._renderer);

  // Render
  window._renderer.render(window._scene, window._camera);
}
