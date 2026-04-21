// world.js — Photo-realistic city matching screenshot quality
window._wallMeshes = [];
window._buildingBoxes = [];

function buildWorld(scene) {
  buildLighting(scene);
  buildTerrain(scene);
  buildRoads(scene);
  buildBuildings(scene);
  buildProps(scene);
  buildNaturalElements(scene);
  buildAtmosphere(scene);
}

// ── LIGHTING (matching warm-orange night city in screenshot) ─────────
function buildLighting(scene) {
  scene.background = new THREE.Color(0x060a14);
  scene.fog = new THREE.FogExp2(0x0a0e1c, 0.014);

  // Base ambient (very dark blue night)
  scene.add(new THREE.AmbientLight(0x1a2040, 0.45));

  // Moon (cold blue overhead)
  const moon = new THREE.DirectionalLight(0x4060bb, 0.35);
  moon.position.set(-50, 90, -60);
  moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048);
  moon.shadow.camera.left = -120; moon.shadow.camera.right = 120;
  moon.shadow.camera.top  =  120; moon.shadow.camera.bottom = -120;
  moon.shadow.camera.far  = 250;
  moon.shadow.bias = -0.0003;
  scene.add(moon);

  // Warm fill from below (street light bounce)
  const warm = new THREE.HemisphereLight(0xff9940, 0x0a0818, 0.28);
  scene.add(warm);

  window._moonLight = moon;
}

// ── TERRAIN ──────────────────────────────────────────────────────────
function buildTerrain(scene) {
  // City ground — dark asphalt look
  const groundMat = new THREE.MeshLambertMaterial({ color: 0x151820 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Raised sidewalk slabs (matching screenshot stone tile look)
  const sidewalkMat = new THREE.MeshLambertMaterial({ color: 0x2a2830 });
  const paths = [
    [0, 200, 6, 0.18, false, 7],
    [0, 200, 6, 0.18, true,  7],
    [25, 200, 6, 0.18, false, 32],
    [-25, 200, 6, 0.18, true, -32],
  ];
  paths.forEach(([cx, len, w, h, isX, cz]) => {
    const sw = new THREE.Mesh(new THREE.BoxGeometry(isX ? w : len, h, isX ? len : w), sidewalkMat);
    sw.position.set(cx, h / 2, cz);
    sw.receiveShadow = true;
    scene.add(sw);
  });

  // Sidewalk TILE GRID lines (matching screenshot stone tile pattern)
  addSidewalkTiles(scene,  8, 200, false,  7);  // right of main road
  addSidewalkTiles(scene,  8, 200, false, -7);  // left of main road
  addSidewalkTiles(scene, 35, 200, false, 32);
  addSidewalkTiles(scene, 35, 200, false, -32);
}

function addSidewalkTiles(scene, w, len, isX, cz) {
  const mat = new THREE.LineBasicMaterial({ color: 0x3a3848, transparent: true, opacity: 0.6 });
  const tileSize = 1.6;
  const cols = Math.floor(w / tileSize);
  const rows = Math.floor(len / tileSize);
  for (let c = 0; c <= cols; c++) {
    const g = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-w/2 + c*tileSize, 0.19, -len/2),
      new THREE.Vector3(-w/2 + c*tileSize, 0.19,  len/2),
    ]);
    const l = new THREE.Line(g, mat);
    l.position.set(0, 0, cz);
    scene.add(l);
  }
  for (let r = 0; r <= rows; r += 3) {
    const g = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-w/2, 0.19, -len/2 + r*tileSize),
      new THREE.Vector3( w/2, 0.19, -len/2 + r*tileSize),
    ]);
    const l = new THREE.Line(g, mat);
    l.position.set(0, 0, cz);
    scene.add(l);
  }
}

// ── ROADS ─────────────────────────────────────────────────────────────
function buildRoads(scene) {
  const roadMat   = new THREE.MeshLambertMaterial({ color: 0x111418 });
  const yellowMat = new THREE.MeshBasicMaterial({ color: 0xddaa00, transparent: true, opacity: 0.75 });
  const whiteMat  = new THREE.MeshBasicMaterial({ color: 0xeeeeff, transparent: true, opacity: 0.45 });

  // Road definitions [cx, cz, width, length, isLongZ]
  const roads = [
    [0,   0,  14, 220, false], // main street Z
    [0,   0,  14, 220, true],  // main street X
    [28,  0,  10, 220, false], // side street
    [-28, 0,  10, 220, false],
    [0,  40,  10, 60,  true],
    [0, -40,  10, 60,  true],
    [0,  80,  10, 60,  true],
    [0, -80,  10, 60,  true],
  ];
  roads.forEach(([cx, cz, rw, rl, isX]) => {
    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(isX ? rl : rw, isX ? rw : rl),
      roadMat
    );
    road.rotation.x = -Math.PI / 2;
    road.position.set(cx, 0.01, cz);
    road.receiveShadow = true;
    scene.add(road);

    // Center yellow line
    const yl = new THREE.Mesh(
      new THREE.PlaneGeometry(isX ? rl : 0.18, isX ? 0.18 : rl),
      yellowMat
    );
    yl.rotation.x = -Math.PI / 2;
    yl.position.set(cx, 0.02, cz);
    scene.add(yl);

    // Dashed white lines
    const dashCount = Math.floor(rl / 9);
    for (let d = 0; d < dashCount; d++) {
      const dash = new THREE.Mesh(
        new THREE.PlaneGeometry(isX ? 3.5 : 0.15, isX ? 0.15 : 3.5),
        whiteMat
      );
      dash.rotation.x = -Math.PI / 2;
      const offset = -rl/2 + d*9 + 4.5;
      dash.position.set(
        cx + (isX ? offset : rw * 0.25),
        0.022,
        cz + (isX ? rw * 0.25 : offset)
      );
      scene.add(dash);
      // other side
      const dash2 = dash.clone();
      dash2.position.set(
        cx + (isX ? offset : -rw * 0.25),
        0.022,
        cz + (isX ? -rw * 0.25 : offset)
      );
      scene.add(dash2);
    }
  });

  // Curb edges (raised stone border)
  const curbMat = new THREE.MeshLambertMaterial({ color: 0x303040 });
  [5, -5, 33, -33].forEach(cz2 => {
    const curb = new THREE.Mesh(new THREE.BoxGeometry(200, 0.12, 0.3), curbMat);
    curb.position.set(0, 0.06, cz2);
    curb.receiveShadow = true;
    scene.add(curb);
  });
}

// ── BUILDINGS ─────────────────────────────────────────────────────────
function buildBuildings(scene) {
  const layouts = [
    // [x, z, w, h, d, style]
    // style: 0=stone, 1=brick, 2=glass, 3=concrete
    [ 22,   0,  12, 38, 200, 1],  // right wall of main street (brick)
    [-22,   0,  12, 42, 200, 0],  // left wall (stone)
    [ 55,  25,  18, 28,  22, 2],
    [-55,  25,  16, 35,  20, 0],
    [ 55, -25,  20, 50,  24, 3],
    [-55, -25,  14, 32,  18, 1],
    [ 22,  80,  12, 22,  35, 0],
    [-22,  80,  12, 26,  30, 2],
    [ 22, -80,  12, 30,  35, 1],
    [-22, -80,  12, 20,  30, 3],
    [ 80,   0,  20, 55,  22, 0],
    [-80,   0,  18, 45,  20, 1],
    [ 80,  60,  22, 32,  28, 2],
    [-80, -60,  20, 40,  26, 3],
    [  0, 110,  40, 18,  22, 0],
    [  0,-110,  35, 22,  20, 1],
  ];

  layouts.forEach(([x, z, w, h, d, style], idx) => {
    addRealisticBuilding(scene, x, z, w, h, d, style, idx);
    window._buildingBoxes.push({ minX: x-w/2, maxX: x+w/2, minZ: z-d/2, maxZ: z+d/2, h });
  });
}

function addRealisticBuilding(scene, x, z, w, h, d, style, idx) {
  // Color palettes matching screenshot (stone/brick warm tones)
  const palettes = [
    // stone: warm grey
    { wall: 0x5a4f42, facade: 0x6a5e50, window: 0x88ccff, trim: 0x7a6e62, door: 0x2a4020 },
    // brick: orange-brown  
    { wall: 0x6b3a2a, facade: 0x7c4a3a, window: 0x88bbff, trim: 0x8a5040, door: 0x2a3030 },
    // glass/modern: dark
    { wall: 0x1a2030, facade: 0x242a3a, window: 0x4488aa, trim: 0x303848, door: 0x111820 },
    // concrete: grey
    { wall: 0x3a3e48, facade: 0x454a55, window: 0xaabbcc, trim: 0x505560, door: 0x202428 },
  ];
  const pal = palettes[style];

  const wallMat    = new THREE.MeshLambertMaterial({ color: pal.wall });
  const facadeMat  = new THREE.MeshLambertMaterial({ color: pal.facade });
  const trimMat    = new THREE.MeshLambertMaterial({ color: pal.trim });
  const doorMat    = new THREE.MeshLambertMaterial({ color: pal.door });

  // Main body
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
  body.position.set(x, h/2, z);
  body.castShadow = true; body.receiveShadow = true;
  scene.add(body);
  window._wallMeshes.push(body);

  // Facade detail strips (horizontal bands matching screenshot stone look)
  const bandCount = Math.floor(h / 4);
  for (let b = 0; b < bandCount; b++) {
    if (b % 3 !== 0) continue;
    const band = new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, 0.15, d + 0.2), trimMat);
    band.position.set(x, b*4 + 2, z);
    scene.add(band);
  }

  // Vertical pilasters (stone columns like screenshot)
  if (style === 0 || style === 1) {
    const pilasterCount = Math.max(2, Math.floor(w / 5));
    for (let p = 0; p <= pilasterCount; p++) {
      const px = x - w/2 + p * (w / pilasterCount);
      const pil = new THREE.Mesh(new THREE.BoxGeometry(0.35, h, 0.35), facadeMat);
      pil.position.set(px, h/2, z - d/2 - 0.15);
      pil.castShadow = true;
      scene.add(pil);
    }
  }

  // Windows — realistic with frame + glass (matching screenshot)
  const wCols = Math.max(2, Math.floor(w / 3.2));
  const wRows = Math.max(2, Math.floor(h / 4.5));
  const glassMat = new THREE.MeshBasicMaterial({ color: 0x88aacc, transparent: true, opacity: 0.6 });
  const frameMat = new THREE.MeshLambertMaterial({ color: pal.trim });

  for (let row = 0; row < wRows; row++) {
    for (let col = 0; col < wCols; col++) {
      const wx = x - w/2 + (col + 0.5) * (w / wCols) + 0.2;
      const wy = 2.5 + row * 4.5;
      const lit = Math.random() > 0.25;
      if (!lit && Math.random() > 0.4) continue;

      // Window frame
      const frame = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.4, 0.12), frameMat);
      frame.position.set(wx, wy, z - d/2 - 0.04);
      scene.add(frame);

      // Glass (warmly lit)
      const gColor = lit
        ? (Math.random() > 0.4 ? 0xffeeaa : 0xaaccff)
        : 0x223344;
      const gMat = new THREE.MeshBasicMaterial({ color: gColor, transparent: true, opacity: lit ? 0.7 : 0.3 });
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.0), gMat);
      glass.position.set(wx, wy, z - d/2 - 0.04);
      scene.add(glass);

      // Interior glow for lit windows
      if (lit && Math.random() > 0.6) {
        const wl = new THREE.PointLight(0xffddaa, 0.3, 5);
        wl.position.set(wx, wy, z - d/2 - 1);
        scene.add(wl);
      }
    }
  }

  // Ground floor: door + shopfront windows
  if (Math.random() > 0.3) {
    // Shopfront glass
    const shopGlass = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.6, 2.8), new THREE.MeshLambertMaterial({ color: 0x88bbcc, transparent: true, opacity: 0.45 }));
    shopGlass.position.set(x, 1.5, z - d/2 - 0.05);
    scene.add(shopGlass);
    // Shop light spill on sidewalk
    const shopLight = new THREE.SpotLight(0xff9955, 0.8, 12, Math.PI / 4, 0.5);
    shopLight.position.set(x, 4, z - d/2 - 1);
    shopLight.target.position.set(x, 0, z - d/2 - 5);
    scene.add(shopLight); scene.add(shopLight.target);
  }

  // Door
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.8, 0.1), doorMat);
  door.position.set(x + (Math.random() - 0.5) * (w * 0.3), 1.4, z - d/2 - 0.04);
  scene.add(door);

  // Rooftop details
  const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.5, d + 0.4), trimMat);
  roof.position.set(x, h + 0.25, z);
  roof.castShadow = true;
  scene.add(roof);

  // Rooftop cornice
  const cornice = new THREE.Mesh(new THREE.BoxGeometry(w + 0.8, 0.3, d + 0.8), facadeMat);
  cornice.position.set(x, h + 0.65, z);
  scene.add(cornice);

  // Random rooftop elements
  if (Math.random() > 0.5) {
    // AC unit
    const ac = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 1.0), new THREE.MeshLambertMaterial({ color: 0x888899 }));
    ac.position.set(x + (Math.random() - 0.5) * (w * 0.5), h + 0.9, z + (Math.random() - 0.5) * (d * 0.4));
    scene.add(ac);
  }
  if (Math.random() > 0.6) {
    // Antenna
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 3 + Math.random() * 3, 4), new THREE.MeshLambertMaterial({ color: 0x777788 }));
    ant.position.set(x + (Math.random() - 0.5) * w * 0.4, h + 2, z + (Math.random() - 0.5) * d * 0.3);
    scene.add(ant);
    // Red blink
    const blink = new THREE.Mesh(new THREE.SphereGeometry(0.06, 4, 4), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
    blink.position.set(x + (Math.random() - 0.5) * w * 0.4, h + 4.5, z + (Math.random() - 0.5) * d * 0.3);
    scene.add(blink);
    window._blinkLights = window._blinkLights || [];
    window._blinkLights.push(blink);
  }
}

// ── PROPS: street lights, poles, benches, barriers ───────────────────
function buildProps(scene) {
  // Street lights along main road — warm orange matching screenshot
  const streetLightPositions = [];
  for (let i = -10; i <= 10; i++) {
    streetLightPositions.push([6.5, i * 14, 0xff9940]);
    streetLightPositions.push([-6.5, i * 14, 0xff9940]);
    streetLightPositions.push([33, i * 14, 0xff8830]);
    streetLightPositions.push([-33, i * 14, 0xff8830]);
  }
  streetLightPositions.forEach(([x, z, col]) => addStreetLight(scene, x, z, col));

  // Parked cars
  addParkedCars(scene);

  // Barriers / bollards
  for (let i = -4; i <= 4; i++) {
    addBollard(scene, 4.8, i * 18);
    addBollard(scene, -4.8, i * 18);
  }

  // Trash bins
  [[-6, 20], [6, -30], [-6, 60], [6, -60]].forEach(([x, z]) => {
    const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.18, 0.8, 8), new THREE.MeshLambertMaterial({ color: 0x223322 }));
    bin.position.set(x, 0.4, z);
    bin.castShadow = true;
    scene.add(bin);
  });

  // Fire hydrants
  [[-5.5, 15], [5.5, -45], [-5.5, 75]].forEach(([x, z]) => {
    const hyd = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.55, 6), new THREE.MeshLambertMaterial({ color: 0xdd2200 }));
    hyd.position.set(x, 0.27, z);
    scene.add(hyd);
  });

  // Police warning tape / road cones
  for (let i = 0; i < 4; i++) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.4, 6), new THREE.MeshLambertMaterial({ color: 0xff6600 }));
    cone.position.set(-3 + i * 2, 0.2, 25);
    scene.add(cone);
    const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.125, 0.08, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    stripe.position.set(-3 + i * 2, 0.28, 25);
    scene.add(stripe);
  }

  // Store signboards on buildings
  addSignboards(scene);

  // Poles / lampposts
  for (let i = -3; i <= 3; i++) {
    addPowerPole(scene, 20, i * 35);
    addPowerPole(scene, -20, i * 35);
  }
}

function addStreetLight(scene, x, z, color) {
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x555566 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 7, 7), poleMat);
  pole.position.set(x, 3.5, z);
  pole.castShadow = true;
  scene.add(pole);

  // Arm
  const arm = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 0.1), poleMat);
  arm.position.set(x + (x > 0 ? -0.85 : 0.85), 7.1, z);
  scene.add(arm);

  // Head (lamp housing)
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.22, 0.35), new THREE.MeshLambertMaterial({ color: 0x333344 }));
  head.position.set(x + (x > 0 ? -1.7 : 1.7), 7.0, z);
  scene.add(head);

  // Lens
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.18, 8), new THREE.MeshBasicMaterial({ color: color }));
  lens.rotation.x = Math.PI / 2;
  lens.position.set(x + (x > 0 ? -1.7 : 1.7), 6.88, z);
  scene.add(lens);

  // Actual point light — key feature matching the warm glow in screenshot
  const light = new THREE.PointLight(color, 1.4, 22);
  light.position.set(x + (x > 0 ? -1.7 : 1.7), 6.7, z);
  light.castShadow = false; // performance
  scene.add(light);

  // Ground glow puddle
  const puddleMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.08, side: THREE.BackSide });
  const puddle = new THREE.Mesh(new THREE.CircleGeometry(4.5, 16), puddleMat);
  puddle.rotation.x = -Math.PI / 2;
  puddle.position.set(x + (x > 0 ? -1.7 : 1.7), 0.03, z);
  scene.add(puddle);
}

function addBollard(scene, x, z) {
  const mat = new THREE.MeshLambertMaterial({ color: 0x888899 });
  const b = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.9, 6), mat);
  b.position.set(x, 0.45, z);
  b.castShadow = true;
  scene.add(b);
  // Reflective band
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.08, 6), new THREE.MeshBasicMaterial({ color: 0xffcc00 }));
  band.position.set(x, 0.65, z);
  scene.add(band);
}

function addPowerPole(scene, x, z) {
  const mat = new THREE.MeshLambertMaterial({ color: 0x3a3428 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 9, 6), mat);
  pole.position.set(x, 4.5, z);
  pole.castShadow = true;
  scene.add(pole);
  // Crossbeam
  const beam = new THREE.Mesh(new THREE.BoxGeometry(3, 0.15, 0.15), mat);
  beam.position.set(x, 8.5, z);
  scene.add(beam);
}

function addSignboards(scene) {
  const signs = [
    [16, 0,  3, 'BELLA DINER',   0xff6622],
    [-16, 10, 3, 'CITY PHARMACY', 0x22aaff],
    [16, -20, 3, 'NOVA BANK',    0xffcc00],
    [-16, -30, 3, '24/7 STORE',  0x22cc44],
    [16, 40,  3, 'APEX HOTEL',   0x8844ff],
    [-16, 50, 3, 'BELLA FOODS',  0xff4422],
  ];
  signs.forEach(([x, z, y, text, col]) => {
    const bMat = new THREE.MeshLambertMaterial({ color: 0x0a0c14 });
    const board = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1.4, 0.18), bMat);
    board.position.set(x, y + 15, z - 6.1);
    scene.add(board);
    // Color strip
    const strip = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.22, 0.2), new THREE.MeshBasicMaterial({ color: col }));
    strip.position.set(x, y + 14.3, z - 6.1);
    scene.add(strip);
    // Glow from sign
    const sl = new THREE.PointLight(col, 0.55, 8);
    sl.position.set(x, y + 15.5, z - 5.5);
    scene.add(sl);
  });
}

// ── PARKED CARS (matching screenshot style) ───────────────────────────
function addParkedCars(scene) {
  const parkedDefs = [
    { x: 10.5, z: -15, ry: 0,   color: 0xddcc00, type: 'taxi' },
    { x:-10.5, z:  20, ry: Math.PI, color: 0x112266, type: 'police' },
    { x: 10.5, z:  45, ry: 0,   color: 0xaa2222, type: 'sport' },
    { x:-10.5, z: -50, ry: Math.PI, color: 0x228822, type: 'sedan' },
    { x: 36,  z:  10,  ry: Math.PI/2, color: 0x888888, type: 'sedan' },
    { x:-36,  z: -10,  ry: -Math.PI/2, color: 0xcc6622, type: 'suv' },
    { x: 36,  z: -40,  ry: Math.PI/2, color: 0x222288, type: 'sedan' },
    { x:-36,  z:  40,  ry: -Math.PI/2, color: 0x552222, type: 'sport' },
  ];
  parkedDefs.forEach(def => {
    const mesh = buildDetailedCar(def.color, def.type);
    mesh.position.set(def.x, 0, def.z);
    mesh.rotation.y = def.ry;
    mesh.castShadow = true;
    scene.add(mesh);
    // Parked car has no active lights, but subtle tail light glow
    const tl = new THREE.PointLight(def.type === 'police' ? 0x0000ff : 0xff2200, 0.3, 4);
    tl.position.set(def.x, 0.5, def.z);
    scene.add(tl);
  });
}

function buildDetailedCar(color, type) {
  const g = new THREE.Group();
  const bodyMat  = new THREE.MeshLambertMaterial({ color });
  const darkMat  = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const chromeMat= new THREE.MeshLambertMaterial({ color: 0x888899 });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x446688, transparent: true, opacity: 0.55 });
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffcc });
  const tailMat  = new THREE.MeshBasicMaterial({ color: 0xff2200 });
  const rubberMat= new THREE.MeshLambertMaterial({ color: 0x111111 });

  const w = type === 'truck' ? 2.4 : type === 'suv' ? 2.1 : 1.95;
  const h = type === 'suv' ? 1.0 : type === 'truck' ? 1.2 : 0.78;
  const l = type === 'truck' ? 5.8 : type === 'suv' ? 4.5 : 4.2;

  // Body
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.55, l), bodyMat);
  body.position.y = h * 0.55; body.castShadow = true; g.add(body);

  // Cabin
  const cabL = type === 'truck' ? l * 0.42 : l * 0.58;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(w * 0.84, h * 0.52, cabL), bodyMat);
  cabin.position.set(0, h * 1.03, type === 'truck' ? -l * 0.22 : 0);
  cabin.castShadow = true; g.add(cabin);

  // Windshields
  const wsFront = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.78, h * 0.42), glassMat);
  wsFront.position.set(0, h * 1.0, -(cabL/2 + (type === 'truck' ? -l*0.22 : 0)));
  wsFront.rotation.x = 0.2; g.add(wsFront);
  const wsRear = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.78, h * 0.42), glassMat);
  wsRear.position.set(0, h * 1.0, cabL/2 + (type === 'truck' ? -l*0.22 : 0));
  wsRear.rotation.x = -0.2; wsRear.rotation.y = Math.PI; g.add(wsRear);

  // Side windows
  [-w*0.42, w*0.42].forEach(x2 => {
    const sw = new THREE.Mesh(new THREE.PlaneGeometry(cabL * 0.75, h * 0.35), glassMat);
    sw.position.set(x2, h * 1.05, type === 'truck' ? -l*0.22 : 0);
    sw.rotation.y = Math.PI / 2; g.add(sw);
  });

  // Wheels (4)
  const wr = h * 0.38;
  [[-w*0.53, wr, -l*0.33],[w*0.53,wr,-l*0.33],[-w*0.53,wr,l*0.33],[w*0.53,wr,l*0.33]].forEach(([wx,wy,wz], i) => {
    const tyre = new THREE.Mesh(new THREE.CylinderGeometry(wr, wr, 0.22, 12), rubberMat);
    tyre.rotation.z = Math.PI/2; tyre.position.set(wx, wy, wz); tyre.castShadow = true;
    tyre.name = 'wheel_'+i; g.add(tyre);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(wr*0.55, wr*0.55, 0.24, 8), chromeMat);
    rim.rotation.z = Math.PI/2; rim.position.set(wx, wy, wz); g.add(rim);
  });

  // Bumpers
  const fBump = new THREE.Mesh(new THREE.BoxGeometry(w+0.1, 0.18, 0.18), chromeMat);
  fBump.position.set(0, h*0.3, -l/2 - 0.08); g.add(fBump);
  const rBump = new THREE.Mesh(new THREE.BoxGeometry(w+0.1, 0.18, 0.18), chromeMat);
  rBump.position.set(0, h*0.3, l/2 + 0.08); g.add(rBump);

  // Headlights (front)
  [-w*0.3, w*0.3].forEach(x2 => {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.06), lightMat);
    hl.position.set(x2, h*0.58, -l/2 - 0.02); g.add(hl);
  });
  // Tail lights
  [-w*0.3, w*0.3].forEach(x2 => {
    const tl2 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.13, 0.06), tailMat);
    tl2.position.set(x2, h*0.58, l/2 + 0.02); g.add(tl2);
  });

  // Door lines
  const dMat = new THREE.MeshLambertMaterial({ color: lightenHex(color, 0.08) });
  [-w*0.52, w*0.52].forEach(x2 => {
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.04, h*0.46, l*0.38), dMat);
    door.position.set(x2, h*0.72, -l*0.08); g.add(door);
  });

  // Police extras
  if (type === 'police') {
    const lightBar = new THREE.Mesh(new THREE.BoxGeometry(w*0.6, 0.1, 0.4), darkMat);
    lightBar.position.set(0, h*1.32, type === 'truck' ? -l*0.22 : 0); g.add(lightBar);
    const lb = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.12), new THREE.MeshBasicMaterial({ color: 0x0000ff }));
    lb.position.set(-0.2, h*1.38, type === 'truck' ? -l*0.22 : 0); g.add(lb);
    const lr = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.12), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
    lr.position.set(0.2, h*1.38, type === 'truck' ? -l*0.22 : 0); g.add(lr);
  }
  // Taxi sign
  if (type === 'taxi') {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.22, 0.25), new THREE.MeshBasicMaterial({ color: 0xffcc00 }));
    sign.position.set(0, h*1.35, type === 'truck' ? -l*0.22 : 0); g.add(sign);
  }

  return g;
}

function lightenHex(hex, amt) {
  const r = Math.min(255, ((hex >> 16) & 0xff) + Math.floor(255 * amt));
  const g = Math.min(255, ((hex >>  8) & 0xff) + Math.floor(255 * amt));
  const b = Math.min(255, ( hex        & 0xff) + Math.floor(255 * amt));
  return (r << 16) | (g << 8) | b;
}

// ── NATURAL ELEMENTS ─────────────────────────────────────────────────
function buildNaturalElements(scene) {
  const treePositions = [
    [7.5, 10], [-7.5, 25], [7.5, -15], [-7.5, -35],
    [7.5, 55], [-7.5, 70], [7.5, -65], [-7.5, -80],
    [35, 20], [-35, -20], [35, -55], [-35, 60],
    [65, 10], [-65, -10], [70, 45], [-70, -45],
  ];
  treePositions.forEach(([x, z]) => addRealisticTree(scene, x, z));
}

function addRealisticTree(scene, x, z) {
  const h = 5.5 + Math.random() * 3.5;
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x2a1c0e });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, h, 7), trunkMat);
  trunk.position.set(x, h/2, z);
  trunk.castShadow = true;
  scene.add(trunk);

  // Multi-layer canopy for depth
  const layers = [
    { y: h + 0.5, r: 1.6, col: 0x1a4010 },
    { y: h + 1.5, r: 1.3, col: 0x1e4a14 },
    { y: h + 2.5, r: 0.9, col: 0x224e18 },
  ];
  layers.forEach(l => {
    const canopyMat = new THREE.MeshLambertMaterial({ color: l.col });
    const canopy = new THREE.Mesh(new THREE.ConeGeometry(l.r, 2.5, 7), canopyMat);
    canopy.position.set(x, l.y, z);
    canopy.castShadow = true;
    scene.add(canopy);
  });
}

// ── ATMOSPHERE ────────────────────────────────────────────────────────
function buildAtmosphere(scene) {
  // Stars
  const starGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(1500 * 3);
  for (let i = 0; i < 1500; i++) {
    starPos[i*3]   = (Math.random() - 0.5) * 500;
    starPos[i*3+1] = 40 + Math.random() * 120;
    starPos[i*3+2] = (Math.random() - 0.5) * 500;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.3, transparent: true, opacity: 0.8 });
  scene.add(new THREE.Points(starGeo, starMat));

  // Moon disc
  const moonMesh = new THREE.Mesh(
    new THREE.CircleGeometry(4, 16),
    new THREE.MeshBasicMaterial({ color: 0xeeeebb })
  );
  moonMesh.position.set(-90, 80, -130);
  moonMesh.lookAt(0, 0, 0);
  scene.add(moonMesh);
  const moonGlow = new THREE.PointLight(0xbbccff, 0.7, 200);
  moonGlow.position.copy(moonMesh.position);
  scene.add(moonGlow);

  // Haze/smoke particles near ground
  for (let i = 0; i < 20; i++) {
    const haze = new THREE.Mesh(
      new THREE.PlaneGeometry(6 + Math.random() * 4, 2),
      new THREE.MeshBasicMaterial({ color: 0x404858, transparent: true, opacity: 0.04 + Math.random() * 0.04, side: THREE.DoubleSide })
    );
    haze.position.set((Math.random() - 0.5) * 80, 0.3 + Math.random() * 1.5, (Math.random() - 0.5) * 80);
    haze.rotation.y = Math.random() * Math.PI;
    scene.add(haze);
    window._hazeParticles = window._hazeParticles || [];
    window._hazeParticles.push(haze);
  }
}

// ── WORLD ANIMATION (called from game loop) ───────────────────────────
function animateWorld(t) {
  // Blink antenna lights
  if (window._blinkLights) {
    const on = Math.sin(t * 2.8) > 0;
    window._blinkLights.forEach(b => b.material.color.setHex(on ? 0xff0000 : 0x220000));
  }
  // Drift haze
  if (window._hazeParticles) {
    window._hazeParticles.forEach((h, i) => {
      h.position.x += Math.sin(t * 0.3 + i) * 0.005;
      h.material.opacity = 0.03 + Math.abs(Math.sin(t * 0.2 + i)) * 0.04;
    });
  }
  // Waterfall removed — no waterfall in city scene
}
