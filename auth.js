// ══════════════════════════════════════════════════
//  auth.js — Telegram Login + Supabase Profile
// ══════════════════════════════════════════════════

const SUPABASE_URL = 'https://qkxqcuuwsznbuyoklvky.supabase.co';
const SUPABASE_KEY = 'sb_secret_zivZw8_6DqKoUTAwj3zI3w_OdE7T5Ck';

// Init Supabase
const _supabase = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

// Current player data
window.currentPlayer = {
  id: null,
  name: 'AGENT',
  photo: '',
  level: 1,
  xp: 0,
  coins: 500,
  kills: 0,
  equippedWeapon: 'pistol',
  ownedWeapons: ['pistol'],
};

// ──────────────────────────────────────────────────
// Init Auth
// ──────────────────────────────────────────────────
async function initAuth() {
  const tg = window.Telegram?.WebApp;

  if (tg && tg.initDataUnsafe?.user) {
    const tgUser = tg.initDataUnsafe.user;
    window.currentPlayer.id = String(tgUser.id);
    window.currentPlayer.name = tgUser.username || tgUser.first_name || 'AGENT';
    window.currentPlayer.photo = tgUser.photo_url || '';
    tg.ready();
    tg.expand();
  } else {
    // Dev / browser fallback
    window.currentPlayer.id = 'dev_' + Math.random().toString(36).substr(2, 8);
    window.currentPlayer.name = 'AGENT_' + Math.floor(Math.random() * 9999);
  }

  if (_supabase) {
    await syncPlayerToSupabase();
  }

  updateProfileUI();
}

// ──────────────────────────────────────────────────
// Supabase sync
// ──────────────────────────────────────────────────
async function syncPlayerToSupabase() {
  try {
    const { data, error } = await _supabase
      .from('players')
      .select('*')
      .eq('telegram_id', window.currentPlayer.id)
      .single();

    if (error || !data) {
      // Create new player row
      await _supabase.from('players').insert([{
        telegram_id: window.currentPlayer.id,
        username: window.currentPlayer.name,
        photo_url: window.currentPlayer.photo,
        level: 1,
        xp: 0,
        coins: 500,
        kills: 0,
        owned_weapons: JSON.stringify(['pistol']),
        equipped_weapon: 'pistol',
      }]);
    } else {
      // Load saved state
      window.currentPlayer.level = data.level || 1;
      window.currentPlayer.xp = data.xp || 0;
      window.currentPlayer.coins = data.coins ?? 500;
      window.currentPlayer.kills = data.kills || 0;
      window.currentPlayer.equippedWeapon = data.equipped_weapon || 'pistol';
      try {
        window.currentPlayer.ownedWeapons = JSON.parse(data.owned_weapons || '["pistol"]');
      } catch(e) {
        window.currentPlayer.ownedWeapons = ['pistol'];
      }
    }
  } catch(e) {
    console.warn('Supabase sync failed (table may not exist yet):', e);
  }
}

// ──────────────────────────────────────────────────
// Save player data to Supabase
// ──────────────────────────────────────────────────
async function savePlayerData() {
  if (!_supabase || !window.currentPlayer.id) return;
  try {
    await _supabase.from('players').upsert({
      telegram_id: window.currentPlayer.id,
      username: window.currentPlayer.name,
      photo_url: window.currentPlayer.photo,
      level: window.currentPlayer.level,
      xp: window.currentPlayer.xp,
      coins: window.currentPlayer.coins,
      kills: window.currentPlayer.kills,
      owned_weapons: JSON.stringify(window.currentPlayer.ownedWeapons),
      equipped_weapon: window.currentPlayer.equippedWeapon,
    }, { onConflict: 'telegram_id' });
  } catch(e) {
    console.warn('Save failed:', e);
  }
}

// ──────────────────────────────────────────────────
// XP / Level / Coins
// ──────────────────────────────────────────────────
function addXP(amount) {
  window.currentPlayer.xp += amount;
  const xpNeeded = window.currentPlayer.level * 1000;
  if (window.currentPlayer.xp >= xpNeeded) {
    window.currentPlayer.xp -= xpNeeded;
    window.currentPlayer.level++;
    showLevelUp(window.currentPlayer.level);
  }
  updateProfileUI();
}

function addCoins(amount) {
  window.currentPlayer.coins += amount;
  updateProfileUI();
  if (document.getElementById('shopCoins')) {
    document.getElementById('shopCoins').textContent = window.currentPlayer.coins;
  }
}

function spendCoins(amount) {
  if (window.currentPlayer.coins < amount) return false;
  window.currentPlayer.coins -= amount;
  updateProfileUI();
  return true;
}

function showLevelUp(level) {
  const el = document.createElement('div');
  el.style.cssText = `
    position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
    font-family:var(--font-head);font-size:2rem;font-weight:900;
    color:#f0c040;text-shadow:0 0 40px rgba(240,192,64,0.8);
    letter-spacing:0.2em;pointer-events:none;z-index:500;
    animation:fadeInUp 0.5s ease,fadeOut 0.5s ease 2s forwards;
  `;
  el.textContent = `LEVEL UP! LVL ${level}`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

// ──────────────────────────────────────────────────
// Update Profile UI
// ──────────────────────────────────────────────────
function updateProfileUI() {
  const p = window.currentPlayer;
  const nameEl = document.getElementById('profileName');
  const levelEl = document.getElementById('profileLevel');
  const coinEl = document.getElementById('coinDisplay');
  const xpEl = document.getElementById('xpDisplay');
  const avatarEl = document.getElementById('profileAvatar');
  if (nameEl) nameEl.textContent = p.name.toUpperCase().substring(0, 12);
  if (levelEl) levelEl.textContent = `LVL ${p.level}`;
  if (coinEl) coinEl.textContent = p.coins;
  if (xpEl) xpEl.textContent = `${p.xp} XP`;
  if (avatarEl && p.photo) avatarEl.src = p.photo;
}

// ──────────────────────────────────────────────────
// Supabase SQL to run (copy into Supabase SQL editor)
// ──────────────────────────────────────────────────
/*
 CREATE TABLE IF NOT EXISTS players (
   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
   telegram_id TEXT UNIQUE NOT NULL,
   username TEXT,
   photo_url TEXT,
   level INT DEFAULT 1,
   xp INT DEFAULT 0,
   coins INT DEFAULT 500,
   kills INT DEFAULT 0,
   owned_weapons TEXT DEFAULT '["pistol"]',
   equipped_weapon TEXT DEFAULT 'pistol',
   created_at TIMESTAMPTZ DEFAULT NOW()
 );

 CREATE TABLE IF NOT EXISTS matches (
   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
   match_id TEXT UNIQUE NOT NULL,
   mode TEXT,
   players JSONB,
   state JSONB,
   created_at TIMESTAMPTZ DEFAULT NOW(),
   updated_at TIMESTAMPTZ DEFAULT NOW()
 );

 -- Enable Row Level Security & Allow all for now (tighten in production):
 ALTER TABLE players ENABLE ROW LEVEL SECURITY;
 CREATE POLICY "Allow all" ON players FOR ALL USING (true) WITH CHECK (true);
 ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
 CREATE POLICY "Allow all" ON matches FOR ALL USING (true) WITH CHECK (true);
*/
