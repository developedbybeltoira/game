// ══════════════════════════════════════════════════
//  vehicles.js — Cars, Bikes, Trucks
// ══════════════════════════════════════════════════

window._vehicles = [];
window._inVehicle = null;
window._vehicleState = {
  speed: 0, maxSpeed: 18, acceleration: 8,
  steering: 0, drag: 4,
};

const VEHICLE_DEFS = [
  { type: 'car',   color: 0xcc2222, w: 2,   h: 0.8,  l: 4.2,  seats: 2 },
  { type: 'car',   color: 0x2244aa, w: 2,   h: 0.8,  l: 4.2,  seats: 2 },
  { type: 'car',   color: 0x228822, w: 2.2, h: 0.9,  l: 4.6,  seats: 2 },
  { type: 'truck', color: 0x885522, w: 2.6, h: 1.4,  l: 7.0,  seats: 2 },
  { type: 'bike',  color: 0x333333, w: 0.6, h: 0.75, l: 2.0,  seats: 1 },
  { type: 'bike',  color: 0xaa3300, w: 0.6, h: 0.75, l: 2.0,  seats: 1 },
];

// ──────────────────────────────────────────────────
// Build vehicle mesh
// ──────────────────────────────────────────────────
function buildVehicle(def, scene) {
  const group = new THREE.Group();

  if (def.type === 'bike') {
    // Bike frame
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(def.w, def.h * 0.4, def.l),
      new THREE.MeshLambertMaterial({ color: def.color })
    );
    frame.position.y = def.h * 0.5;
    frame.castShadow = true;
    group.add(frame);

    // Wheels
    [{ z: -0.7 }, { z: 0.7 }].forEach(({ z }) => {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.35, 0.12, 12),
        new THREE.MeshLambertMaterial({ color: 0x111111 })
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(0, 0.35, z * def.l * 0.4);
      wheel.castShadow = true;
      group.add(wheel);
    });

    // Handlebar
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.06, 0.06),
      new THREE.MeshLambertMaterial({ color: 0x888888 })
    );
    bar.position.set(0, def.h * 0.9, -def.l * 0.38);
    group.add(bar);

  } else {
    // Car / Truck body
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(def.w, def.h * 0.55, def.l),
      new THREE.MeshLambertMaterial({ color: def.color })
    );
    body.position.y = def.h * 0.55;
    body.castShadow = true;
    group.add(body);

    // Cabin
    const cabinLen = def.type === 'truck' ? def.l * 0.42 : def.l * 0.55;
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(def.w * 0.85, def.h * 0.55, cabinLen),
      new THREE.MeshLambertMaterial({ color: lightenColor(def.color, 0.15) })
    );
    cabin.position.set(0, def.h * 1.02, def.type === 'truck' ? -def.l * 0.22 : 0);
    cabin.castShadow = true;
    group.add(cabin);

    // Windshield
    const wind = new THREE.Mesh(
      new THREE.BoxGeometry(def.w * 0.8, def.h * 0.4, 0.05),
      new THREE.MeshLambertMaterial({ color: 0x88ccff, transparent: true, opacity: 0.5 })
    );
    wind.position.set(0, def.h * 1.0, -(cabinLen * 0.5 + 0.02) + (def.type === 'truck' ? -def.l * 0.22 : 0));
    group.add(wind);

    // Wheels (4)
    const wx = def.w * 0.52;
    const wz = def.l * 0.34;
    [[-wx, -wz], [wx, -wz], [-wx, wz], [wx, wz]].forEach(([x, z]) => {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(def.h * 0.38, def.h * 0.38, 0.22, 10),
        new THREE.MeshLambertMaterial({ color: 0x222222 })
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, def.h * 0.38, z);
      wheel.castShadow = true;
      group.add(wheel);

      // Hubcap
      const hub = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.15, 0.24, 6),
        new THREE.MeshLambertMaterial({ color: 0x888888 })
      );
      hub.rotation.z = Math.PI / 2;
      hub.position.set(x, def.h * 0.38, z);
      group.add(hub);
    });

    // Headlights
    [{ x: -def.w * 0.3 }, { x: def.w * 0.3 }].forEach(({ x }) => {
      const light = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.12, 0.05),
        new THREE.MeshBasicMaterial({ color: 0xffffcc })
      );
      light.position.set(x, def.h * 0.6, -def.l * 0.5);
      group.add(light);
    });
  }

  return group;
}

function lightenColor(hex, amount) {
  const r = Math.min(255, ((hex >> 16) & 0xff) + Math.floor(255 * amount));
  const g = Math.min(255, ((hex >> 8) & 0xff) + Math.floor(255 * amount));
  const b = Math.min(255, (hex & 0xff) + Math.floor(255 * amount));
  return (r << 16) | (g << 8) | b;
}

// ──────────────────────────────────────────────────
// Spawn vehicles across the city
// ──────────────────────────────────────────────────
function spawnVehicles(scene) {
  const positions = [
    [10, 0, 8], [-12, 0, 5], [20, 0, -15], [-18, 0, 20],
    [5, 0, -22], [-8, 0, -12], [30, 0, 10], [-25, 0, -8],
    [15, 0, 30], [-30, 0, 15],
  ];

  VEHICLE_DEFS.forEach((def, i) => {
    if (i >= positions.length) return;
    const mesh = buildVehicle(def, scene);
    const [x, y, z] = positions[i];
    mesh.position.set(x, y, z);
    mesh.rotation.y = Math.random() * Math.PI * 2;
    mesh.castShadow = true;
    scene.add(mesh);

    window._vehicles.push({
      mesh, def,
      speed: 0, steering: 0,
      occupied: false,
    });
  });
}

// ──────────────────────────────────────────────────
// Enter / Exit vehicle
// ──────────────────────────────────────────────────
function toggleVehicle() {
  if (window._inVehicle) {
    exitVehicle();
  } else {
    tryEnterVehicle();
  }
}

function tryEnterVehicle() {
  const playerPos = window._playerMesh?.position;
  if (!playerPos) return;

  const nearest = window._vehicles.find(v => {
    if (v.occupied) return false;
    return v.mesh.position.distanceTo(playerPos) < 4;
  });

  if (nearest) {
    enterVehicle(nearest);
  }
}

function enterVehicle(vehicle) {
  window._inVehicle = vehicle;
  vehicle.occupied = true;
  // Hide player mesh
  if (window._playerMesh) window._playerMesh.visible = false;
  document.getElementById('vehicleBtn').textContent = 'EXIT';
  showNotification('ENTERED VEHICLE — DRIVE!');
}

function exitVehicle() {
  if (!window._inVehicle) return;
  const v = window._inVehicle;
  v.occupied = false;
  window._inVehicle = null;
  // Restore player near vehicle
  if (window._playerMesh) {
    window._playerMesh.position.copy(v.mesh.position);
    window._playerMesh.position.x += 3;
    window._playerMesh.visible = true;
  }
  document.getElementById('vehicleBtn').textContent = 'VEHICLE';
}

// ──────────────────────────────────────────────────
// Vehicle driving physics update
// ──────────────────────────────────────────────────
function updateVehicle(dt) {
  const v = window._inVehicle;
  if (!v) return;
  const vs = window._vehicleState;
  const keys = window._moveKeys;
  const joy = window._joystickDelta;

  // Acceleration
  const accelInput = (keys.w ? 1 : 0) - (keys.s ? 1 : 0) + (joy.y);
  vs.speed += accelInput * vs.acceleration * dt;
  vs.speed -= vs.speed * vs.drag * dt; // drag
  vs.speed = Math.max(-vs.maxSpeed * 0.4, Math.min(vs.maxSpeed, vs.speed));

  // Steering
  const steerInput = (keys.d ? 1 : 0) - (keys.a ? 1 : 0) + (joy.x);
  v.mesh.rotation.y -= steerInput * 1.5 * dt * (Math.abs(vs.speed) / vs.maxSpeed);

  // Move vehicle
  const dir = new THREE.Vector3(0, 0, -1);
  dir.applyQuaternion(v.mesh.quaternion);
  v.mesh.position.addScaledVector(dir, vs.speed * dt);
  v.mesh.position.y = 0;

  // Wheel spin (visual) - rotate wheel meshes
  v.mesh.children.forEach(c => {
    if (c.geometry instanceof THREE.CylinderGeometry) {
      c.rotation.x += vs.speed * dt;
    }
  });

  // Camera follows vehicle
  if (window._camera) {
    const offset = new THREE.Vector3(0, 4, 8);
    offset.applyQuaternion(v.mesh.quaternion);
    window._camera.position.copy(v.mesh.position).add(offset);
    window._camera.lookAt(v.mesh.position);
  }
}

function showNotification(text) {
  const el = document.createElement('div');
  el.style.cssText = `
    position:fixed;bottom:190px;left:50%;transform:translateX(-50%);
    background:rgba(0,0,0,0.8);border:1px solid rgba(0,200,255,0.4);
    padding:0.4rem 1.2rem;border-radius:4px;
    font-family:var(--font-mono);font-size:0.75rem;letter-spacing:0.1em;
    color:var(--c-accent);pointer-events:none;z-index:50;
    animation:fadeInUp 0.3s ease,killFade 2s ease 0.5s forwards;
  `;
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}
