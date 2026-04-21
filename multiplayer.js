// ══════════════════════════════════════════════════
//  multiplayer.js — Supabase Realtime Multiplayer
// ══════════════════════════════════════════════════

window._mpChannel = null;
window._mpMatchId = null;
window._mpPlayers = {};
window._mpMeshes = {};

// ──────────────────────────────────────────────────
// Create / Join a match
// ──────────────────────────────────────────────────
async function joinMultiplayerMatch() {
  if (!_supabase) {
    showNotification('OFFLINE MODE — SUPABASE NOT CONNECTED');
    return;
  }

  const matchId = await findOrCreateMatch();
  window._mpMatchId = matchId;

  // Subscribe to realtime channel for this match
  const channel = _supabase.channel(`match:${matchId}`, {
    config: { broadcast: { self: false } },
  });

  channel.on('broadcast', { event: 'player_update' }, ({ payload }) => {
    handleRemotePlayerUpdate(payload);
  });

  channel.on('broadcast', { event: 'player_shoot' }, ({ payload }) => {
    handleRemoteShoot(payload);
  });

  channel.on('broadcast', { event: 'player_dead' }, ({ payload }) => {
    handleRemoteDeath(payload);
  });

  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      broadcastJoin(channel, matchId);
      showNotification(`MATCH JOINED: ${matchId.substring(0, 8).toUpperCase()}`);
    }
  });

  window._mpChannel = channel;
}

async function findOrCreateMatch() {
  try {
    // Look for open match
    const { data } = await _supabase
      .from('matches')
      .select('match_id, players')
      .eq('mode', 'multiplayer')
      .order('created_at', { ascending: false })
      .limit(5);

    for (const m of (data || [])) {
      const players = JSON.parse(m.players || '[]');
      if (players.length < 6) {
        return m.match_id;
      }
    }
  } catch(e) {}

  // Create new match
  const newId = 'match_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  try {
    await _supabase.from('matches').insert([{
      match_id: newId,
      mode: 'multiplayer',
      players: JSON.stringify([window.currentPlayer.id]),
      state: JSON.stringify({ started: false }),
    }]);
  } catch(e) {}
  return newId;
}

// ──────────────────────────────────────────────────
// Broadcast own position/state
// ──────────────────────────────────────────────────
function broadcastPlayerState() {
  if (!window._mpChannel || !window._playerMesh) return;
  const mesh = window._playerMesh;
  window._mpChannel.send({
    type: 'broadcast',
    event: 'player_update',
    payload: {
      id: window.currentPlayer.id,
      name: window.currentPlayer.name,
      x: parseFloat(mesh.position.x.toFixed(2)),
      y: parseFloat(mesh.position.y.toFixed(2)),
      z: parseFloat(mesh.position.z.toFixed(2)),
      ry: parseFloat(mesh.rotation.y.toFixed(3)),
      health: window._playerState.health,
      weapon: window.currentPlayer.equippedWeapon,
    },
  });
}

function broadcastJoin(channel, matchId) {
  channel.send({
    type: 'broadcast',
    event: 'player_update',
    payload: {
      id: window.currentPlayer.id,
      name: window.currentPlayer.name,
      x: 0, y: 0, z: 0, ry: 0,
      health: 100,
      weapon: window.currentPlayer.equippedWeapon,
    },
  });
}

function broadcastShoot() {
  if (!window._mpChannel) return;
  window._mpChannel.send({
    type: 'broadcast',
    event: 'player_shoot',
    payload: { id: window.currentPlayer.id },
  });
}

// ──────────────────────────────────────────────────
// Handle remote players
// ──────────────────────────────────────────────────
function handleRemotePlayerUpdate(payload) {
  const { id, name, x, y, z, ry, health } = payload;
  if (id === window.currentPlayer.id) return;

  if (!window._mpMeshes[id]) {
    // Spawn remote player mesh
    const mesh = buildHumanoid({ skinColor: 0xe88860, outfitColor: 0xaa2222 });
    mesh.name = `MP_${id}`;
    window._scene?.add(mesh);
    window._mpMeshes[id] = mesh;
    createNameTag(mesh, name || 'PLAYER', true, false);
    window._mpPlayers[id] = { mesh, health: 100, name };
  }

  const mesh = window._mpMeshes[id];
  // Smooth interpolation
  mesh.position.lerp(new THREE.Vector3(x, y, z), 0.25);
  mesh.rotation.y = ry;
  window._mpPlayers[id].health = health;
}

function handleRemoteShoot(payload) {
  // Visual: muzzle flash on remote player mesh
  const mesh = window._mpMeshes[payload.id];
  if (mesh) {
    // Simple flash effect
    const flash = new THREE.PointLight(0xffaa00, 2, 5);
    flash.position.copy(mesh.position);
    flash.position.y += 1;
    window._scene?.add(flash);
    setTimeout(() => window._scene?.remove(flash), 100);
  }
}

function handleRemoteDeath(payload) {
  const mesh = window._mpMeshes[payload.id];
  if (mesh) {
    window._scene?.remove(mesh);
    delete window._mpMeshes[payload.id];
    delete window._mpPlayers[payload.id];
  }
}

// ──────────────────────────────────────────────────
// Leave match
// ──────────────────────────────────────────────────
function leaveMultiplayer() {
  if (window._mpChannel) {
    window._mpChannel.unsubscribe();
    window._mpChannel = null;
  }
  // Remove all remote meshes
  Object.values(window._mpMeshes).forEach(mesh => {
    window._scene?.remove(mesh);
  });
  window._mpMeshes = {};
  window._mpPlayers = {};
  window._mpMatchId = null;
}

// ──────────────────────────────────────────────────
// MP tick (called from game loop)
// ──────────────────────────────────────────────────
let _mpBroadcastTick = 0;
function tickMultiplayer(dt) {
  if (!window._mpChannel) return;
  _mpBroadcastTick += dt;
  if (_mpBroadcastTick >= 0.05) { // 20hz
    _mpBroadcastTick = 0;
    broadcastPlayerState();
  }
}
