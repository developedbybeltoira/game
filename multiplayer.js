// multiplayer.js — Supabase Realtime multiplayer with match keys
window._mpChannel = null;
window._mpMatchKey = null;
window._mpPlayers = {};
window._mpMeshes = {};
window._keyExpireTimer = null;
window._mpJoinedPlayers = [];

// Generate 6-char key
function genKey() {
  return Math.random().toString(36).substring(2,8).toUpperCase();
}

async function createOnlineMatch() {
  if (!window._sb) { showNotif('Supabase not connected — check config.js'); return; }
  const key = genKey();
  const hostId = window.currentPlayer.id;
  try {
    const { error } = await window._sb.from('realm_matches').insert([{
      match_key: key,
      mode: 'multiplayer',
      host_id: hostId,
      players: JSON.stringify([{ id: hostId, name: window.currentPlayer.name }]),
      state: 'waiting',
      expires_at: new Date(Date.now() + 60000).toISOString(),
    }]);
    if (error) { showNotif('Error: ' + error.message); return; }
    window._mpMatchKey = key;
    document.getElementById('multiMenu').classList.add('hidden');
    document.getElementById('matchCreated').classList.remove('hidden');
    document.getElementById('matchKeyDisp').textContent = key;
    // Countdown
    let secs = 60;
    window._keyExpireTimer = setInterval(() => {
      secs--;
      const el = document.getElementById('keyTimer'); if (el) el.textContent = secs;
      if (secs <= 0) { clearInterval(window._keyExpireTimer); cancelMatch(); }
    }, 1000);
    // Subscribe to this match for join notifications
    subscribeToMatch(key);
  } catch(e) { showNotif('Error creating match: ' + e.message); }
}

async function joinMatchByKey() {
  const key = document.getElementById('joinKey')?.value?.trim();
  if (!key || key.length < 4) { showNotif('Enter a valid key'); return; }
  if (!window._sb) { showNotif('Supabase not connected'); return; }
  try {
    const { data, error } = await window._sb.from('realm_matches').select('*').eq('match_key', key).maybeSingle();
    if (error || !data) { showNotif('Match not found: ' + key); return; }
    if (data.state === 'active') { showNotif('Match already started'); return; }
    if (new Date(data.expires_at) < new Date()) { showNotif('Match key expired'); return; }
    // Add self to players
    let players = []; try { players = JSON.parse(data.players); } catch(e) {}
    players.push({ id: window.currentPlayer.id, name: window.currentPlayer.name });
    await window._sb.from('realm_matches').update({ players: JSON.stringify(players) }).eq('match_key', key);
    window._mpMatchKey = key;
    document.getElementById('multiMenu').classList.add('hidden');
    showNotif('Joined match ' + key + '! Starting...');
    subscribeToMatch(key);
    setTimeout(() => startGame('multiplayer'), 1500);
  } catch(e) { showNotif('Error joining: ' + e.message); }
}

function subscribeToMatch(key) {
  if (!window._sb) return;
  // Unsubscribe previous
  if (window._mpChannel) { window._sb.removeChannel(window._mpChannel); }
  const ch = window._sb.channel('match:' + key, { config: { broadcast: { self: false }}});
  ch.on('broadcast', { event: 'player_pos' }, ({ payload }) => handleRemotePos(payload));
  ch.on('broadcast', { event: 'player_shoot' }, ({ payload }) => handleRemoteShoot(payload));
  ch.on('broadcast', { event: 'player_dead' }, ({ payload }) => handleRemoteDead(payload));
  ch.on('broadcast', { event: 'player_join' }, ({ payload }) => {
    window._mpJoinedPlayers.push(payload);
    const ws = document.getElementById('waitStatus');
    if (ws) ws.textContent = `Waiting (${window._mpJoinedPlayers.length} joined)`;
  });
  ch.subscribe(status => {
    if (status === 'SUBSCRIBED') {
      ch.send({ type:'broadcast', event:'player_join', payload:{ id: window.currentPlayer.id, name: window.currentPlayer.name }});
    }
  });
  window._mpChannel = ch;
}

function startMatchNow() {
  clearInterval(window._keyExpireTimer);
  document.getElementById('matchCreated')?.classList.add('hidden');
  startGame('multiplayer');
}

function cancelMatch() {
  clearInterval(window._keyExpireTimer);
  document.getElementById('matchCreated')?.classList.add('hidden');
  document.getElementById('multiMenu')?.classList.remove('hidden');
  if (window._mpChannel && window._sb) window._sb.removeChannel(window._mpChannel);
  window._mpChannel = null; window._mpMatchKey = null;
}

// Realtime position broadcast (20hz)
let _mpT = 0;
function tickMP(dt) {
  if (!window._mpChannel || !window._playerMesh) return;
  _mpT += dt;
  if (_mpT < .05) return;
  _mpT = 0;
  const m = window._playerMesh;
  window._mpChannel.send({ type:'broadcast', event:'player_pos', payload:{
    id: window.currentPlayer.id, name: window.currentPlayer.name,
    x: +m.position.x.toFixed(2), y: +m.position.y.toFixed(2), z: +m.position.z.toFixed(2),
    ry: +m.rotation.y.toFixed(3), hp: window._PS.health,
    wep: window.currentPlayer.equippedWeapon,
  }});
}

function handleRemotePos(p) {
  if (p.id === window.currentPlayer.id) return;
  if (!window._mpMeshes[p.id]) {
    const mesh = buildHumanSoldier({ skin: 0xe88860, outfit: 0x662222, isEnemy: true });
    mesh.name = 'MP_' + p.id;
    window._scene?.add(mesh);
    window._mpMeshes[p.id] = mesh;
    createNameTag3D(mesh, p.name || 'PLAYER', true, false);
    window._mpPlayers[p.id] = { mesh, name: p.name, hp: 100 };
  }
  const mesh = window._mpMeshes[p.id];
  mesh.position.lerp(new THREE.Vector3(p.x, p.y, p.z), .3);
  mesh.rotation.y = p.ry;
  if (window._mpPlayers[p.id]) window._mpPlayers[p.id].hp = p.hp;
}

function handleRemoteShoot(p) {
  const mesh = window._mpMeshes[p.id]; if (!mesh) return;
  const fl = new THREE.PointLight(0xffaa00, 3, 6);
  fl.position.copy(mesh.position).add(new THREE.Vector3(0, 1.2, 0));
  window._scene?.add(fl); setTimeout(() => window._scene?.remove(fl), 100);
}

function handleRemoteDead(p) {
  const mesh = window._mpMeshes[p.id]; if (!mesh) return;
  window._scene?.remove(mesh);
  delete window._mpMeshes[p.id]; delete window._mpPlayers[p.id];
}

function leaveMP() {
  if (window._mpChannel && window._sb) {
    window._mpChannel.send({ type:'broadcast', event:'player_dead', payload:{ id: window.currentPlayer.id }});
    window._sb.removeChannel(window._mpChannel);
  }
  window._mpChannel = null; window._mpMatchKey = null;
  Object.values(window._mpMeshes).forEach(m => window._scene?.remove(m));
  window._mpMeshes = {}; window._mpPlayers = {};
}

// UI helpers
function openMultiMenu() {
  document.getElementById('multiMenu')?.classList.remove('hidden');
  updateOnlineCount();
}
function closeMultiMenu() {
  document.getElementById('multiMenu')?.classList.add('hidden');
}
async function updateOnlineCount() {
  const el = document.getElementById('onlineCount'); if (!el) return;
  if (!window._sb) { el.textContent = '● Offline mode'; return; }
  try {
    const { count } = await window._sb.from('realm_players').select('*', { count:'exact', head:true });
    el.textContent = `● ${count || 0} players online`;
  } catch(e) { el.textContent = '● Connecting...'; }
}
