// auth.js — Username/password login + Telegram SDK + Supabase
window._sb = null;
window.currentPlayer = {
  id:null, name:'AGENT', photo:'', level:1, xp:0,
  coins:500, kills:0, equippedWeapon:'assault',
  ownedWeapons:['pistol','assault'], armor:0,
  grenades:2, medkits:1,
  upgrades:{speed:0,health:0,armor:0,damage:0},
};

async function initAuth(){
  setLoad(5,'Starting...');
  // Init Supabase
  try{
    const cfg=window.REALM_CONFIG||{};
    if(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && !cfg.SUPABASE_ANON_KEY.includes('PASTE')){
      window._sb=window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
      setLoad(25,'Database connected');
    } else {
      setLoad(25,'Offline mode (add Supabase key)');
    }
  }catch(e){ console.warn('Supabase:',e); }

  // Telegram WebApp auto-login
  const tg=window.Telegram?.WebApp;
  if(tg?.initDataUnsafe?.user){
    const u=tg.initDataUnsafe.user;
    window.currentPlayer.id='tg_'+u.id;
    window.currentPlayer.name=u.username||u.first_name||'AGENT';
    window.currentPlayer.photo=u.photo_url||'';
    try{tg.ready();tg.expand();}catch(e){}
    setLoad(60,'Logged in via Telegram: '+window.currentPlayer.name);
    if(window._sb) await syncProfile();
    setLoad(90,'Profile loaded');
    return; // skip login screen
  }

  // Check saved session
  const saved=localStorage.getItem('realm_session');
  if(saved){
    try{
      const s=JSON.parse(saved);
      Object.assign(window.currentPlayer,s);
      setLoad(60,'Welcome back, '+window.currentPlayer.name);
      if(window._sb) await syncProfile();
      setLoad(90,'Profile loaded');
      return;
    }catch(e){}
  }

  // Need login
  window.currentPlayer.id='anon_'+Math.random().toString(36).substr(2,8);
  setLoad(90,'Please sign in');
}

// ── Login Screen actions ──────────────────────────────────────────────
async function doLogin(){
  const u=document.getElementById('loginUser')?.value?.trim();
  const p=document.getElementById('loginPass')?.value?.trim();
  if(!u||!p){ showLoginError('Enter username and password'); return; }
  setLoginLoading(true);
  if(window._sb){
    try{
      const { data, error }=await window._sb.auth.signInWithPassword({ email:u+'@realm.game', password:p });
      if(error){ showLoginError('Login failed: '+error.message); setLoginLoading(false); return; }
      window.currentPlayer.id='sb_'+data.user.id;
    }catch(e){ showLoginError('Connection error'); setLoginLoading(false); return; }
  } else {
    // Offline: just use username
    window.currentPlayer.id='local_'+u;
  }
  window.currentPlayer.name=u;
  await syncProfile();
  saveSession();
  document.getElementById('loginScreen').classList.add('hidden');
  updateProfileUI();
  startCinematic();
  setLoginLoading(false);
}

async function doRegister(){
  const u=document.getElementById('loginUser')?.value?.trim();
  const p=document.getElementById('loginPass')?.value?.trim();
  if(!u||!p||p.length<6){ showLoginError('Username + 6+ char password required'); return; }
  setLoginLoading(true);
  if(window._sb){
    try{
      const { data, error }=await window._sb.auth.signUp({ email:u+'@realm.game', password:p });
      if(error){ showLoginError('Register failed: '+error.message); setLoginLoading(false); return; }
      window.currentPlayer.id='sb_'+data.user.id;
    }catch(e){ showLoginError('Connection error'); setLoginLoading(false); return; }
  } else {
    window.currentPlayer.id='local_'+u;
  }
  window.currentPlayer.name=u;
  window.currentPlayer.coins=500;
  await syncProfile();
  saveSession();
  document.getElementById('loginScreen').classList.add('hidden');
  updateProfileUI();
  startCinematic();
  setLoginLoading(false);
}

function doGuestPlay(){
  window.currentPlayer.id='guest_'+Math.random().toString(36).substr(2,6);
  window.currentPlayer.name='GUEST_'+Math.floor(Math.random()*9999);
  document.getElementById('loginScreen').classList.add('hidden');
  startCinematic();
}

function showLoginError(msg){
  const el=document.getElementById('loginError'); if(!el) return;
  el.textContent=msg; el.style.display='block';
}
function setLoginLoading(on){
  const btn=document.getElementById('loginBtn'); const rbtn=document.getElementById('registerBtn');
  if(btn) btn.disabled=on;
  if(rbtn) rbtn.disabled=on;
  const el=document.getElementById('loginSpinner'); if(el) el.style.display=on?'block':'none';
}
function saveSession(){
  const save={id:window.currentPlayer.id,name:window.currentPlayer.name,photo:window.currentPlayer.photo,level:window.currentPlayer.level,xp:window.currentPlayer.xp,coins:window.currentPlayer.coins,kills:window.currentPlayer.kills,equippedWeapon:window.currentPlayer.equippedWeapon,ownedWeapons:window.currentPlayer.ownedWeapons,upgrades:window.currentPlayer.upgrades};
  localStorage.setItem('realm_session',JSON.stringify(save));
}
function doLogout(){
  localStorage.removeItem('realm_session');
  if(window._sb) window._sb.auth.signOut().catch(()=>{});
  window.currentPlayer.id=null;
  location.reload();
}

// ── Supabase profile sync ─────────────────────────────────────────────
async function syncProfile(){
  if(!window._sb||!window.currentPlayer.id) return;
  try{
    const {data}=await window._sb.from('realm_players').select('*').eq('player_id',window.currentPlayer.id).maybeSingle();
    if(!data){
      await window._sb.from('realm_players').insert([{
        player_id:window.currentPlayer.id, username:window.currentPlayer.name,
        photo_url:window.currentPlayer.photo, level:1, xp:0, coins:500, kills:0,
        owned_weapons:JSON.stringify(['pistol','assault']), equipped_weapon:'assault',
        upgrades:JSON.stringify({speed:0,health:0,armor:0,damage:0}),
      }]);
    } else {
      window.currentPlayer.level=data.level||1;
      window.currentPlayer.xp=data.xp||0;
      window.currentPlayer.coins=data.coins??500;
      window.currentPlayer.kills=data.kills||0;
      window.currentPlayer.equippedWeapon=data.equipped_weapon||'assault';
      try{ window.currentPlayer.ownedWeapons=JSON.parse(data.owned_weapons||'["pistol","assault"]'); }catch(e){}
      try{ window.currentPlayer.upgrades=JSON.parse(data.upgrades||'{}'); }catch(e){}
    }
  }catch(e){ console.warn('syncProfile:',e.message); }
}

async function savePlayerData(){
  saveSession();
  if(!window._sb||!window.currentPlayer.id||window.currentPlayer.id.startsWith('anon_')||window.currentPlayer.id.startsWith('guest_')) return;
  try{
    await window._sb.from('realm_players').upsert({
      player_id:window.currentPlayer.id, username:window.currentPlayer.name,
      photo_url:window.currentPlayer.photo||'', level:window.currentPlayer.level,
      xp:window.currentPlayer.xp, coins:window.currentPlayer.coins,
      kills:window.currentPlayer.kills, owned_weapons:JSON.stringify(window.currentPlayer.ownedWeapons||['pistol']),
      equipped_weapon:window.currentPlayer.equippedWeapon,
      upgrades:JSON.stringify(window.currentPlayer.upgrades||{}),
      updated_at:new Date().toISOString(),
    },{onConflict:'player_id'});
  }catch(e){ console.warn('save:',e.message); }
}

function addXP(n){
  window.currentPlayer.xp+=n;
  const need=window.currentPlayer.level*800;
  if(window.currentPlayer.xp>=need){ window.currentPlayer.xp-=need; window.currentPlayer.level++; showFloaty('LEVEL UP! LVL '+window.currentPlayer.level,'#f0c040'); }
  updateProfileUI();
}
function addCoins(n){ window.currentPlayer.coins+=n; updateProfileUI(); }
function spendCoins(n){ if((window.currentPlayer.coins||0)<n) return false; window.currentPlayer.coins-=n; updateProfileUI(); return true; }

function updateProfileUI(){
  const p=window.currentPlayer;
  ['profileName','profileName2'].forEach(id=>{ const el=document.getElementById(id); if(el) el.textContent=(p.name||'AGENT').toUpperCase().slice(0,14); });
  ['profileLevel','profileLevel2'].forEach(id=>{ const el=document.getElementById(id); if(el) el.textContent='LVL '+(p.level||1); });
  ['coinDisp','coinDisp2'].forEach(id=>{ const el=document.getElementById(id); if(el) el.textContent=p.coins||0; });
  const el=document.getElementById('xpDisp'); if(el) el.textContent=(p.xp||0)+' XP';
  const sc=document.getElementById('shopCoins'); if(sc) sc.textContent=p.coins||0;
  ['profileAvatar','profileAvatar2'].forEach(id=>{ const a=document.getElementById(id); if(a&&p.photo){ a.src=p.photo; a.onerror=()=>{a.src=''}; }});
}
function setLoad(pct,msg){
  const b=document.getElementById('loadBar'); if(b) b.style.width=pct+'%';
  const s=document.getElementById('loadStatus'); if(s) s.textContent=msg;
}

/* ── SQL for Supabase (run once in SQL editor) ──
CREATE TABLE IF NOT EXISTS realm_players (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id TEXT UNIQUE NOT NULL,
  username TEXT, photo_url TEXT,
  level INT DEFAULT 1, xp INT DEFAULT 0,
  coins INT DEFAULT 500, kills INT DEFAULT 0,
  owned_weapons TEXT DEFAULT '["pistol","assault"]',
  equipped_weapon TEXT DEFAULT 'assault',
  upgrades TEXT DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE realm_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all" ON realm_players FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS realm_matches (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  match_key TEXT UNIQUE NOT NULL,
  host_id TEXT NOT NULL,
  players JSONB DEFAULT '[]',
  state TEXT DEFAULT 'waiting',
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '2 minutes')
);
ALTER TABLE realm_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all" ON realm_matches FOR ALL USING (true) WITH CHECK (true);
── end SQL ──*/
