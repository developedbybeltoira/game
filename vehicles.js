// vehicles.js — Realistic vehicles with driving physics
window._vehicles = [];
window._inVehicle = null;
window._driveInput = { gas: false, brake: false, steer: 0 };

const VEH_DEFS = [
  { type:'sedan',  col:0xcc2222, w:2.0, h:.8, l:4.2 },
  { type:'sedan',  col:0x2244aa, w:2.0, h:.8, l:4.2 },
  { type:'suv',    col:0x228822, w:2.3, h:1.1, l:4.8 },
  { type:'suv',    col:0x884422, w:2.3, h:1.1, l:4.8 },
  { type:'truck',  col:0x555522, w:2.5, h:1.3, l:6.5 },
  { type:'sport',  col:0xaa0033, w:1.9, h:.7, l:4.0 },
  { type:'sport',  col:0xffa500, w:1.9, h:.7, l:4.0 },
  { type:'police', col:0x112266, w:2.0, h:.85, l:4.5 },
  { type:'taxi',   col:0xffcc00, w:2.0, h:.85, l:4.3 },
  { type:'van',    col:0xffffff, w:2.1, h:1.4, l:5.0 },
  { type:'bus',    col:0xddaa00, w:2.6, h:1.8, l:9.0 },
  { type:'bike',   col:0x111111, w:.65, h:.85, l:2.1 },
  { type:'bike',   col:0xaa3300, w:.65, h:.85, l:2.1 },
];

function buildVehicleMesh(def) {
  const g = new THREE.Group();
  const mainMat = new THREE.MeshLambertMaterial({ color: def.col });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x88ccff, transparent: true, opacity: .45 });
  const chromeMat = new THREE.MeshLambertMaterial({ color: 0x888899 });
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffcc });
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2222 });

  if (def.type === 'bike') {
    // Frame
    const frame = new THREE.Mesh(new THREE.BoxGeometry(def.w*.6, def.h*.3, def.l*.7), mainMat);
    frame.position.y = def.h * .55; frame.castShadow = true; g.add(frame);
    // Fuel tank
    const tank = new THREE.Mesh(new THREE.BoxGeometry(def.w*.4, def.h*.4, def.l*.3), mainMat);
    tank.position.set(0, def.h*.7, -def.l*.1); g.add(tank);
    // Handlebar
    const bar = new THREE.Mesh(new THREE.BoxGeometry(.7,.05,.05), chromeMat);
    bar.position.set(0, def.h*.9, -def.l*.4); g.add(bar);
    // Exhaust
    const ex = new THREE.Mesh(new THREE.CylinderGeometry(.03,.03,.5,6), darkMat);
    ex.rotation.z = Math.PI/2; ex.position.set(def.w*.4, def.h*.3, def.l*.2); g.add(ex);
    // Wheels
    [{ z:-def.l*.38, name:'wF' },{ z:def.l*.38, name:'wR' }].forEach(({z,name}) => {
      const tyre = new THREE.Mesh(new THREE.CylinderGeometry(.3,.3,.15,12), darkMat);
      tyre.rotation.z = Math.PI/2; tyre.position.set(0,.32,z); tyre.castShadow = true; tyre.name = name; g.add(tyre);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(.16,.16,.16,6), chromeMat);
      rim.rotation.z = Math.PI/2; rim.position.set(0,.32,z); g.add(rim);
    });
    // Fork
    const fork = new THREE.Mesh(new THREE.BoxGeometry(.06,.5,.06), chromeMat);
    fork.position.set(0,.55,-def.l*.4); g.add(fork);
    return g;
  }

  // Car/truck/bus body
  const body = new THREE.Mesh(new THREE.BoxGeometry(def.w, def.h*.55, def.l), mainMat);
  body.position.y = def.h * .55; body.castShadow = true; g.add(body);

  // Cabin
  const cabW = def.type === 'bus' ? def.w*.9 : def.w*.86;
  const cabL = def.type === 'truck' ? def.l*.45 : def.type === 'bus' ? def.l*.88 : def.l*.62;
  const cabZ = def.type === 'truck' ? -def.l*.24 : 0;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(cabW, def.h*.58, cabL), mainMat);
  cabin.position.set(0, def.h*1.02, cabZ); cabin.castShadow = true; g.add(cabin);

  // Windshields (front + rear)
  [[-(cabL*.5+.01),0,1],[cabL*.5+.01,1,-1]].forEach(([zOff, isRear, rot]) => {
    const ws = new THREE.Mesh(new THREE.BoxGeometry(cabW*.8, def.h*.45, .06), glassMat);
    ws.position.set(0, def.h*1.02, cabZ + zOff); ws.rotation.y = isRear ? Math.PI : 0; g.add(ws);
  });

  // Side windows
  [-def.w*.44, def.w*.44].forEach(xOff => {
    const sw = new THREE.Mesh(new THREE.BoxGeometry(.05, def.h*.35, cabL*.7), glassMat);
    sw.position.set(xOff, def.h*1.04, cabZ); g.add(sw);
  });

  // Roof rack (SUV / truck)
  if (def.type === 'suv' || def.type === 'truck') {
    const rack = new THREE.Mesh(new THREE.BoxGeometry(def.w*.8,.05,cabL*.6), chromeMat);
    rack.position.set(0, def.h*1.31, cabZ); g.add(rack);
  }

  // Police light bar
  if (def.type === 'police') {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(def.w*.6,.08,.4), darkMat);
    bar.position.set(0, def.h*1.33, cabZ); g.add(bar);
    const lb = new THREE.Mesh(new THREE.BoxGeometry(.15,.1,.12), new THREE.MeshBasicMaterial({color:0x0000ff}));
    lb.position.set(-.15, def.h*1.37, cabZ); g.add(lb);
    const lr = new THREE.Mesh(new THREE.BoxGeometry(.15,.1,.12), new THREE.MeshBasicMaterial({color:0xff0000}));
    lr.position.set(.15, def.h*1.37, cabZ); g.add(lr);
  }

  // Taxi sign
  if (def.type === 'taxi') {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(.6,.22,.22), new THREE.MeshBasicMaterial({color:0xffcc00}));
    sign.position.set(0, def.h*1.33, cabZ); g.add(sign);
  }

  // Bumpers
  const fBump = new THREE.Mesh(new THREE.BoxGeometry(def.w+.1,.2,.15), chromeMat);
  fBump.position.set(0, def.h*.3, -(def.l*.5+.06)); g.add(fBump);
  const rBump = new THREE.Mesh(new THREE.BoxGeometry(def.w+.1,.2,.15), chromeMat);
  rBump.position.set(0, def.h*.3, def.l*.5+.06); g.add(rBump);

  // Headlights (front)
  [-def.w*.32, def.w*.32].forEach(x => {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(.24,.15,.06), lightMat);
    hl.position.set(x, def.h*.6, -(def.l*.5+.02)); g.add(hl);
  });
  // Tail lights
  [-def.w*.32, def.w*.32].forEach(x => {
    const tl = new THREE.Mesh(new THREE.BoxGeometry(.22,.13,.06), tailMat);
    tl.position.set(x, def.h*.6, def.l*.5+.02); g.add(tl);
  });

  // Door details
  for (let side of [-def.w*.51, def.w*.51]) {
    const door = new THREE.Mesh(new THREE.BoxGeometry(.04, def.h*.48, def.l*.36), new THREE.MeshLambertMaterial({color: lighten(def.col, .06)}));
    door.position.set(side, def.h*.72, -def.l*.08); g.add(door);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(.03,.04,.08), chromeMat);
    handle.position.set(side, def.h*.72, -def.l*.05); g.add(handle);
  }

  // Wheels (4)
  const wh = def.h * .38;
  const positions = [[-def.w*.52, wh, -def.l*.34],[def.w*.52, wh, -def.l*.34],
                     [-def.w*.52, wh, def.l*.34],[def.w*.52, wh, def.l*.34]];
  positions.forEach(([x,y,z], i) => {
    const tyre = new THREE.Mesh(new THREE.CylinderGeometry(wh, wh, .24, 10), darkMat);
    tyre.rotation.z = Math.PI/2; tyre.position.set(x, y, z); tyre.castShadow = true;
    tyre.name = 'wheel_' + i; g.add(tyre);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(wh*.5, wh*.5, .26, 6), chromeMat);
    hub.rotation.z = Math.PI/2; hub.position.set(x, y, z); g.add(hub);
    // Lug nuts
    for (let l = 0; l < 5; l++) {
      const ang = (l/5)*Math.PI*2;
      const lug = new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,.27,4), darkMat);
      lug.rotation.z = Math.PI/2;
      lug.position.set(x + (x>0?.14:-.14), y + Math.sin(ang)*wh*.32, z + Math.cos(ang)*wh*.32);
      g.add(lug);
    }
  });

  // Exhaust pipe
  const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,.3,6), darkMat);
  exhaust.rotation.x = Math.PI/2; exhaust.position.set(def.w*.35, def.h*.2, def.l*.5+.14); g.add(exhaust);

  return g;
}

function lighten(hex, amt) {
  return Math.min(0xffffff, hex + Math.floor(amt * 0xffffff));
}

function spawnVehicles(scene) {
  const roadPositions = [
    [12,0,3,0],[-14,0,3,1.57],[22,0,-12,0],[-20,0,18,3.14],
    [6,0,-20,0],[-9,0,-10,1.57],[32,0,8,0],[-28,0,-6,1.57],
    [16,0,28,0],[-32,0,12,0],[0,0,35,1.57],[40,0,-20,0],[-40,0,22,1.57],
  ];
  VEH_DEFS.forEach((def, i) => {
    const pos = roadPositions[i % roadPositions.length];
    const mesh = buildVehicleMesh(def);
    mesh.position.set(pos[0], 0, pos[2]);
    mesh.rotation.y = pos[3] + Math.random() * .3;
    mesh.castShadow = true; scene.add(mesh);
    window._vehicles.push({
      mesh, def, speed: 0, steer: 0, occupied: false,
      // AI driving for parked vehicles
      isAIdriven: Math.random() > .4,
      aiTarget: new THREE.Vector3(pos[0] + (Math.random()-.5)*60, 0, pos[2] + (Math.random()-.5)*60),
      aiSpeed: 4 + Math.random() * 8,
    });
  });
}

// Spawn traffic (AI-driven vehicles on roads)
function updateVehicleAILocal(v, dt) {
  if (v.occupied || !v.isAIdriven) return;
  const target = v.aiTarget;
  const d = v.mesh.position.distanceTo(target);
  if (d < 5) {
    v.aiTarget = new THREE.Vector3((Math.random()-.5)*90, 0, (Math.random()-.5)*90);
  }
  const dir = new THREE.Vector3().subVectors(target, v.mesh.position).normalize();
  v.mesh.position.addScaledVector(dir, v.aiSpeed * dt);
  v.mesh.position.y = 0;
  v.mesh.rotation.y = Math.atan2(dir.x, dir.z);
  // Rotate wheels
  v.mesh.children.forEach(c => { if (c.name?.startsWith('wheel_')) c.rotation.x += v.aiSpeed * dt * .5; });
}

// Toggle enter/exit vehicle
function toggleVehicle() {
  if (window._inVehicle) { exitVehicle(); return; }
  const pm = window._playerMesh; if (!pm) return;
  const nearest = window._vehicles.find(v => !v.occupied && v.mesh.position.distanceTo(pm.position) < 4.5);
  if (nearest) enterVehicle(nearest);
  else showNotif('No vehicle nearby');
}

function enterVehicle(v) {
  window._inVehicle = v; v.occupied = true; v.isAIdriven = false;
  if (window._playerMesh) window._playerMesh.visible = false;
  document.getElementById('mobileControls').classList.add('hidden');
  document.getElementById('driveControls').classList.remove('hidden');
  const btn = document.getElementById('btnVehicle'); if (btn) btn.textContent = 'EXIT';
  playSFX('vehicle_start');
  showNotif('Vehicle entered — use drive controls!');
}

function exitVehicle() {
  const v = window._inVehicle; if (!v) return;
  v.occupied = false; window._inVehicle = null;
  if (window._playerMesh) {
    window._playerMesh.position.copy(v.mesh.position);
    window._playerMesh.position.x += 2.5; window._playerMesh.visible = true;
  }
  document.getElementById('mobileControls').classList.remove('hidden');
  document.getElementById('driveControls').classList.add('hidden');
  const btn = document.getElementById('btnVehicle'); if (btn) btn.textContent = '🚗';
}

function driveGas(on) { window._driveInput.gas = on; }
function driveBrake(on) { window._driveInput.brake = on; }
function driveSteer(v) { window._driveInput.steer = v; }

function updateDriving(dt) {
  const v = window._inVehicle; if (!v) return;
  const inp = window._driveInput;
  const maxSpd = 22;
  const accel = 12;
  const brakePow = 18;
  const drag = 3.5;

  if (inp.gas) v.speed = Math.min(maxSpd, v.speed + accel * dt);
  else if (inp.brake) v.speed = Math.max(-maxSpd * .4, v.speed - brakePow * dt);
  else v.speed -= v.speed * drag * dt;

  if (Math.abs(v.speed) > .1) {
    const steerAmount = inp.steer * 2.0 * dt * (Math.abs(v.speed) / maxSpd);
    v.mesh.rotation.y -= steerAmount;
  }

  const dir = new THREE.Vector3(0,0,-1).applyQuaternion(v.mesh.quaternion);
  v.mesh.position.addScaledVector(dir, v.speed * dt);
  v.mesh.position.y = 0;

  // Spin wheels
  v.mesh.children.forEach(c => { if (c.name?.startsWith('wheel_') || c.name === 'wF' || c.name === 'wR') c.rotation.x += v.speed * dt * .5; });

  // Camera follows vehicle
  if (window._camera) {
    const back = new THREE.Vector3(0,0,7).applyQuaternion(v.mesh.quaternion);
    const tgt = v.mesh.position.clone().add(back).add(new THREE.Vector3(0,3.5,0));
    window._camera.position.lerp(tgt, 8 * dt);
    const lookAt = v.mesh.position.clone().add(new THREE.Vector3(0,1,0));
    window._camera.lookAt(lookAt);
  }
}

function showNotif(txt) {
  const el = document.getElementById('pickupNotif'); if (!el) return;
  el.textContent = txt; el.classList.remove('hidden');
  clearTimeout(window._notifT);
  window._notifT = setTimeout(() => el.classList.add('hidden'), 2500);
}

// Alias for game loop
function updateVehicleAI(v, dt) {
  if (v.occupied || !v.isAIdriven) return;
  const target = v.aiTarget;
  const d = v.mesh.position.distanceTo(target);
  if (d < 5) v.aiTarget = new THREE.Vector3((Math.random()-.5)*80, 0, (Math.random()-.5)*80);
  const dir = new THREE.Vector3().subVectors(target, v.mesh.position).normalize();
  v.mesh.position.addScaledVector(dir, Math.min(v.aiSpeed, 12) * dt);
  v.mesh.position.y = 0;
  v.mesh.rotation.y = Math.atan2(dir.x, dir.z);
  v.mesh.children.forEach(c => { if (c.name?.startsWith('wheel_') || c.name==='wF' || c.name==='wR') c.rotation.x += v.aiSpeed * dt * 0.5; });
}
