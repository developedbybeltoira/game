// game.js — Main engine, helicopter cinematic intro, game loop
window.gameRunning = false;
window.gamePaused  = false;
window._camMode    = '3rd';
window._currentMode= 'solo';
window._lives      = 2;
window._gameTime   = 0;

// Camera look angles
let _camYaw   = 0;
let _camPitch = -0.18;
let _pointerLocked = false;

// ─────────────────────────────────────────────────────────────────────
// BOOT
// ─────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  setLoad(2, 'Starting...');
  await initAuth();
  setLoad(90, 'Ready!');
  await new Promise(r => setTimeout(r, 300));
  document.getElementById('loadingScreen').classList.add('hidden');

  const tg = window.Telegram?.WebApp;
  const hasTG = tg?.initDataUnsafe?.user;
  const hasSaved = !!localStorage.getItem('realm_session');
  if (!hasTG && !hasSaved) {
    document.getElementById('loginScreen').classList.remove('hidden');
    animateLoginBg();
  } else {
    startCinematic();
  }
});

// ─────────────────────────────────────────────────────────────────────
// LOGIN BACKGROUND
// ─────────────────────────────────────────────────────────────────────
function animateLoginBg() {
  const c = document.getElementById('loginBg'); if (!c) return;
  c.width = window.innerWidth; c.height = window.innerHeight;
  const ctx = c.getContext('2d');
  const pts = Array.from({length:55},()=>({x:Math.random()*c.width,y:Math.random()*c.height,r:Math.random()*1.2+.3,vx:(Math.random()-.5)*.22,vy:(Math.random()-.5)*.22,life:Math.random()}));
  const buildings = Array.from({length:18},(_,i)=>({x:i*(c.width/16),w:35+Math.random()*70,h:80+Math.random()*210}));
  let running = true;
  function draw() {
    if (!running) return;
    c.width = window.innerWidth; c.height = window.innerHeight;
    const W=c.width,H=c.height;
    const bg=ctx.createLinearGradient(0,0,0,H);
    bg.addColorStop(0,'#020510');bg.addColorStop(.6,'#040c1a');bg.addColorStop(1,'#020510');
    ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
    // City silhouette
    ctx.fillStyle='rgba(12,18,38,0.92)';
    ctx.beginPath();ctx.moveTo(0,H*.72);
    buildings.forEach(b=>{ctx.lineTo(b.x,H*.72-b.h);ctx.lineTo(b.x+b.w,H*.72-b.h);});
    ctx.lineTo(W,H*.72);ctx.closePath();ctx.fill();
    // Particles
    pts.forEach(p=>{
      p.x+=p.vx;p.y+=p.vy;
      if(p.x<0||p.x>W)p.vx*=-1;if(p.y<0||p.y>H)p.vy*=-1;
      ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle=`rgba(0,200,255,${p.life*.45})`;ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  draw();
  document.getElementById('loginScreen').addEventListener('transitionend',()=>{running=false;},{once:true});
}

// ─────────────────────────────────────────────────────────────────────
// HELICOPTER CINEMATIC INTRO
// ─────────────────────────────────────────────────────────────────────
let _cinSkipped = false;

function startCinematic() {
  document.getElementById('cinematic').classList.remove('hidden');
  const canvas = document.getElementById('introCanvas');
  canvas.width = window.innerWidth; canvas.height = window.innerHeight;
  window.addEventListener('resize', () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; });
  const ctx = canvas.getContext('2d');
  runCinematic(ctx, canvas);
}

function runCinematic(ctx, canvas) {
  _cinSkipped = false;
  let t = 0;
  let screenShake = 0;
  let flashAlpha = 0;
  let playerDeadAlpha = 0;
  let titleAlpha = 0;
  let subtitleAlpha = 0;
  let helicopterX = -0.5, helicopterY = 0.12;
  let spotlightOn = false;
  let enemyRopeY = -0.2;
  let enemyLanded = false;
  let muzzleFlash = 0;
  let bloodAlpha = 0;
  let fadeBlack = 0;

  // City buildings
  const W = () => canvas.width, H = () => canvas.height;
  const buildings = Array.from({length:20},(_,i)=>({
    x: i*(W()/18), w: 38+Math.random()*80, h: 85+Math.random()*240,
    wins: Array.from({length:50},()=>({ox:Math.random(),oy:Math.random(),on:Math.random()>.3,fl:Math.random()>.9}))
  }));
  const cars = Array.from({length:5},()=>({x:-80+Math.random()*300,speed:1.5+Math.random()*2,col:`hsl(${Math.random()*360},55%,48%)`}));

  function drawBuilding(b) {
    const base=H()*.66;
    ctx.fillStyle='rgba(20,26,40,0.98)';
    ctx.fillRect(b.x,base-b.h,b.w,b.h);
    // Horizontal bands
    for(let r=0;r<Math.floor(b.h/22);r++){
      ctx.fillStyle='rgba(30,38,58,0.6)';
      ctx.fillRect(b.x+1,base-b.h+r*22,b.w-2,0.5);
    }
    // Windows
    const cols=Math.max(2,Math.floor(b.w/16));
    const rows=Math.max(3,Math.floor(b.h/22));
    b.wins.forEach((w,wi)=>{
      if(w.fl&&Math.random()>.94)w.on=!w.on;
      if(!w.on) return;
      const wx=b.x+3+(wi%cols)*(b.w/cols);
      const wy=base-b.h+5+Math.floor(wi/cols)*(b.h/rows);
      ctx.fillStyle=Math.random()>.5?`rgba(255,220,110,0.65)`:`rgba(140,190,255,0.5)`;
      ctx.fillRect(wx,wy,b.w/cols-4,b.h/rows-6);
    });
    // Rooftop
    ctx.fillStyle='rgba(40,50,70,0.9)';
    ctx.fillRect(b.x,base-b.h-2,b.w,3);
  }

  function drawRoad() {
    const ry=H()*.66;
    const rg=ctx.createLinearGradient(0,ry,0,H());
    rg.addColorStop(0,'#14181e');rg.addColorStop(1,'#0a0c10');
    ctx.fillStyle=rg;ctx.fillRect(0,ry,W(),H()-ry);
    // Sidewalks
    ctx.fillStyle='#1e2228';
    ctx.fillRect(0,ry,W()*.12,H()-ry);
    ctx.fillRect(W()*.88,ry,W()*.12,H()-ry);
    // Yellow center line
    ctx.strokeStyle='rgba(230,180,0,0.65)';ctx.lineWidth=2.5;ctx.setLineDash([28,18]);
    ctx.beginPath();ctx.moveTo(0,H()*.78);ctx.lineTo(W(),H()*.78);ctx.stroke();ctx.setLineDash([]);
    // White shoulder lines
    ctx.strokeStyle='rgba(255,255,255,0.25)';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(0,H()*.69);ctx.lineTo(W(),H()*.69);ctx.stroke();
    ctx.beginPath();ctx.moveTo(0,H()*.95);ctx.lineTo(W(),H()*.95);ctx.stroke();
  }

  function drawStreetLights() {
    for(let i=0;i<6;i++){
      const slx=(i/5)*W()*.85+W()*.07;
      const sly=H()*.63;
      ctx.strokeStyle='rgba(100,110,130,0.9)';ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(slx,sly);ctx.lineTo(slx,sly-52);
      ctx.lineTo(slx+18,sly-52);ctx.stroke();
      // Light head
      ctx.fillStyle='rgba(50,50,60,0.9)';
      ctx.fillRect(slx+12,sly-57,16,10);
      // Glow
      const glowG=ctx.createRadialGradient(slx+20,sly-50,0,slx+20,sly-50,35);
      glowG.addColorStop(0,`rgba(255,190,80,${0.35+Math.sin(t*.03)*.05})`);
      glowG.addColorStop(1,'transparent');
      ctx.fillStyle=glowG;ctx.fillRect(slx-15,sly-85,70,60);
    }
  }

  function drawCar(car) {
    car.x+=car.speed;if(car.x>W()+120)car.x=-120;
    const cy=H()*.815;const sc=0.62;
    ctx.save();ctx.translate(car.x,cy);
    ctx.fillStyle=car.col;ctx.fillRect(-26*sc,-17*sc,52*sc,15*sc);
    ctx.fillStyle=car.col;ctx.fillRect(-16*sc,-28*sc,32*sc,13*sc);
    ctx.fillStyle='rgba(110,170,220,0.4)';ctx.fillRect(-12*sc,-26*sc,24*sc,10*sc);
    ctx.fillStyle='rgba(255,240,180,0.9)';ctx.fillRect(20*sc,-10*sc,6*sc,4*sc);ctx.fillRect(20*sc,-5*sc,6*sc,4*sc);
    ctx.fillStyle='rgba(255,20,20,0.85)';
    ctx.beginPath();ctx.arc(-24*sc,-4*sc,3*sc,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(-24*sc,-9*sc,3*sc,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#0a0a0a';[[-18*sc,0],[18*sc,0]].forEach(([wx])=>{ctx.beginPath();ctx.arc(wx,0,5*sc,0,Math.PI*2);ctx.fill();});
    ctx.restore();
  }

  function drawPlayer(dead) {
    const px=W()*.5,py=H()*.72;
    ctx.save();
    if(dead){ctx.translate(px,py);ctx.rotate(Math.PI/2);ctx.translate(-px,-py);}
    // Shadow
    ctx.fillStyle='rgba(0,0,0,0.35)';
    ctx.beginPath();ctx.ellipse(px,py+2,16,6,0,0,Math.PI*2);ctx.fill();
    // Legs
    ctx.fillStyle='#1a2a4a';ctx.fillRect(px-9,py,8,28);ctx.fillRect(px+1,py,8,28);
    ctx.fillStyle='#111';ctx.fillRect(px-10,py+22,10,8);ctx.fillRect(px+1,py+22,10,8);
    // Torso
    ctx.fillStyle='#1a3a6a';ctx.fillRect(px-13,py-30,26,32);
    ctx.fillStyle='#112211';ctx.fillRect(px-14,py-30,28,22);// vest
    // Arms
    ctx.fillStyle='#c8854a';ctx.fillRect(px-20,py-28,8,24);ctx.fillRect(px+12,py-28,8,24);
    ctx.fillStyle='#111';ctx.fillRect(px-20,py-5,8,9);ctx.fillRect(px+12,py-5,8,9);// gloves
    // Gun in right hand
    if(!dead){ctx.fillStyle='#1a1a22';ctx.fillRect(px+17,py-18,16,5);
      if(muzzleFlash>0){ctx.fillStyle=`rgba(255,200,60,${muzzleFlash*.9})`;ctx.beginPath();ctx.arc(px+33,py-16,6,0,Math.PI*2);ctx.fill();}}
    // Head
    ctx.fillStyle='#c8854a';ctx.fillRect(px-10,py-50,20,22);
    ctx.fillStyle='#1e2e10';ctx.fillRect(px-11,py-56,22,18);// helmet
    // Goggles
    ctx.fillStyle='rgba(60,120,90,0.7)';ctx.fillRect(px-9,py-47,18,7);
    ctx.restore();
    // Death blood
    if(dead){
      ctx.fillStyle=`rgba(160,0,0,${bloodAlpha*.8})`;
      ctx.beginPath();ctx.ellipse(px+20,py+5,18,8,0.3,0,Math.PI*2);ctx.fill();
    }
  }

  function drawHelicopter(hx, hy) {
    const x=hx*W(), y=hy*H();
    ctx.save();ctx.translate(x,y);
    ctx.fillStyle='#1a1e28';
    ctx.fillRect(-30,-12,60,20);// body
    ctx.fillRect(-8,-22,16,12);// cockpit top
    ctx.fillStyle='rgba(80,180,255,0.5)';ctx.fillRect(-6,-20,12,10);// cockpit glass
    // Tail
    ctx.fillStyle='#1a1e28';ctx.fillRect(28,-8,20,5);
    // Main rotor (spinning)
    ctx.strokeStyle='rgba(180,190,200,0.85)';ctx.lineWidth=3;
    const ra=t*.18;
    for(let r=0;r<2;r++){
      ctx.save();ctx.rotate(r*Math.PI/2+ra);
      ctx.beginPath();ctx.moveTo(-40,0);ctx.lineTo(40,0);ctx.stroke();
      ctx.restore();
    }
    // Tail rotor
    ctx.strokeStyle='rgba(180,190,200,0.7)';ctx.lineWidth=2;
    const ra2=t*.35;
    ctx.save();ctx.translate(42,-5);
    for(let r=0;r<2;r++){ctx.save();ctx.rotate(r*Math.PI/2+ra2);ctx.beginPath();ctx.moveTo(-8,0);ctx.lineTo(8,0);ctx.stroke();ctx.restore();}
    ctx.restore();
    // Landing skids
    ctx.strokeStyle='#888';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(-22,8);ctx.lineTo(-22,16);ctx.lineTo(22,16);ctx.lineTo(22,8);ctx.stroke();
    ctx.restore();
  }

  function drawSpotlight(hx, hy) {
    if (!spotlightOn) return;
    const hxp=hx*W(), hyp=hy*H();
    const px=W()*.5, py=H()*.72;
    const sg=ctx.createLinearGradient(hxp,hyp,px,py);
    sg.addColorStop(0,'rgba(255,255,255,0.0)');
    sg.addColorStop(0.6,'rgba(255,255,220,0.12)');
    sg.addColorStop(1,'rgba(255,255,200,0.0)');
    ctx.fillStyle=sg;
    ctx.beginPath();ctx.moveTo(hxp,hyp);
    ctx.lineTo(px-15,py);ctx.lineTo(px+15,py);ctx.closePath();ctx.fill();
    // Ground pool
    const gp=ctx.createRadialGradient(px,py,0,px,py,30);
    gp.addColorStop(0,'rgba(255,255,220,0.35)');gp.addColorStop(1,'transparent');
    ctx.fillStyle=gp;ctx.beginPath();ctx.arc(px,py,30,0,Math.PI*2);ctx.fill();
  }

  function drawEnemy(ry) {
    // Enemy rappelling down rope from helicopter
    const ex=helicopterX*W()+20, heliY=helicopterY*H();
    const ey=Math.min(H()*.72, heliY + ry*(H()*.72-heliY));
    // Rope
    ctx.strokeStyle='rgba(180,170,150,0.7)';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(ex,heliY+18);ctx.lineTo(ex,ey-30);ctx.stroke();
    if(ry<1) return; // still descending
    // Enemy standing
    const epy=H()*.72;
    ctx.save();ctx.translate(ex,epy);
    ctx.fillStyle='#330000';ctx.fillRect(-9,0,7,26);ctx.fillRect(2,0,7,26);// legs
    ctx.fillStyle='#111';ctx.fillRect(-10,22,9,7);ctx.fillRect(2,22,9,7);// boots
    ctx.fillStyle='#661111';ctx.fillRect(-12,-28,24,30);// torso
    ctx.fillStyle='#4a0a0a';ctx.fillRect(-13,-28,26,20);// vest
    ctx.fillStyle='#cc3300';ctx.fillRect(-8,-48,18,20);// head
    ctx.fillStyle='#330808';ctx.fillRect(-9,-54,20,16);// helmet
    ctx.fillStyle='rgba(255,0,0,0.7)';ctx.fillRect(-7,-46,15,5);// red visor
    // Gun
    ctx.fillStyle='#111';ctx.fillRect(-22,-20,16,5);
    if(muzzleFlash>0&&enemyLanded){
      ctx.fillStyle=`rgba(255,200,60,${muzzleFlash*.9})`;
      ctx.beginPath();ctx.arc(-22,-18,5,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
  }

  function frame() {
    if (_cinSkipped) return;
    t++;
    const shake = screenShake > 0 ? (Math.random()-0.5)*screenShake : 0;
    ctx.save();
    if(shake) ctx.translate(shake, shake*.4);

    // Sky
    const sky=ctx.createLinearGradient(0,0,0,H()*.66);
    sky.addColorStop(0,'#050812');sky.addColorStop(0.4,'#0c1428');sky.addColorStop(0.7,'#1a1e28');
    ctx.fillStyle=sky;ctx.fillRect(0,0,W(),H()*.66);
    // Stars
    if(t>10){
      for(let s=0;s<80;s++){
        const sx=((s*137.5)%1)*W(),sy=((s*91.3)%1)*H()*.5;
        const sa=0.4+((s*17)%10)*.05;
        ctx.fillStyle=`rgba(255,255,255,${sa})`;
        ctx.beginPath();ctx.arc(sx,sy,0.5+((s*7)%10)*.1,0,Math.PI*2);ctx.fill();
      }
    }
    // Moon
    const mg=ctx.createRadialGradient(W()*.75,H()*.15,0,W()*.75,H()*.15,W()*.18);
    mg.addColorStop(0,'rgba(200,210,240,0.22)');mg.addColorStop(1,'transparent');
    ctx.fillStyle=mg;ctx.fillRect(0,0,W(),H());
    ctx.fillStyle='rgba(230,235,210,0.88)';
    ctx.beginPath();ctx.arc(W()*.75,H()*.15,W()*.02,0,Math.PI*2);ctx.fill();

    // Buildings
    buildings.forEach(b=>drawBuilding(b));
    // Fog layer at building base
    const fogG=ctx.createLinearGradient(0,H()*.60,0,H()*.70);
    fogG.addColorStop(0,'transparent');fogG.addColorStop(1,'rgba(20,25,40,0.7)');
    ctx.fillStyle=fogG;ctx.fillRect(0,H()*.60,W(),H()*.12);

    // Road + street lights
    drawRoad(); drawStreetLights();
    cars.forEach(c=>drawCar(c));

    // ── PHASE TIMELINE ──
    // t 0–40:   City establishes, helicopter enters from left
    // t 40–120: Helicopter flies over, spotlight activates
    // t 120–200: Enemy rappels down
    // t 200–260: Enemy shoots player
    // t 260–320: Slow motion, player falls
    // t 320–440: Screen fades black → REALM title
    // t 440+:   Fade to home

    // Helicopter movement
    if (t < 60) {
      helicopterX = -0.5 + (t / 60) * 1.0;
    } else if (t < 120) {
      helicopterX = 0.5 - ((t-60)/60)*0.1; // slow above player
    }
    helicopterY = 0.12 + Math.sin(t*0.04)*0.015;

    if (t >= 55 && t < 80) {
      spotlightOn = true;
    }
    if (t < 80) spotlightOn = t >= 55;

    // Always draw spotlight if on
    drawSpotlight(helicopterX, helicopterY);

    // Enemy rope descent t=80–160
    if (t >= 80 && t < 160) {
      enemyRopeY = (t - 80) / 80;
      if (enemyRopeY >= 1) enemyLanded = true;
    }
    if (t >= 80) drawEnemy(enemyRopeY);

    // Player
    const playerDead = t >= 260;
    if (t >= 20) drawPlayer(playerDead);

    // Enemy shoots at t=200
    if (t >= 200 && t < 260 && enemyLanded) {
      muzzleFlash = Math.max(0, 1 - (t-200)*0.05);
      if (t === 220 || t === 232 || t === 245) { playSFX('shoot_pistol'); screenShake = 5; }
    }
    if (t >= 260) { muzzleFlash = 0; bloodAlpha = Math.min(1, (t-260)/30); }
    muzzleFlash = Math.max(0, muzzleFlash - 0.04);
    if (screenShake > 0) screenShake -= 0.3;

    // Helicopter
    drawHelicopter(helicopterX, helicopterY);

    // Slow motion overlay t=240–280
    if (t >= 240 && t < 280) {
      ctx.fillStyle=`rgba(180,200,255,${((t-240)/40)*0.12})`;ctx.fillRect(0,0,W(),H());
    }

    // Screen flash at shooting
    if (flashAlpha > 0) { ctx.fillStyle=`rgba(255,255,255,${flashAlpha})`; ctx.fillRect(0,0,W(),H()); flashAlpha -= 0.04; }
    if (t===200){flashAlpha=0.4;}

    // FADE TO BLACK
    if (t >= 300) { fadeBlack = Math.min(1, (t-300)/40); ctx.fillStyle=`rgba(0,0,0,${fadeBlack})`; ctx.fillRect(0,0,W(),H()); }

    // TITLE (t 360–480)
    if (t >= 360 && t < 500) {
      titleAlpha = t < 400 ? (t-360)/40 : (t > 470 ? 1-(t-470)/30 : 1);
      subtitleAlpha = t > 390 ? Math.min(1,(t-390)/30) : 0;
      ctx.save();ctx.globalAlpha=Math.max(0,titleAlpha);
      // Smoke/fog behind title
      const tfog=ctx.createRadialGradient(W()*.5,H()*.45,0,W()*.5,H()*.45,W()*.4);
      tfog.addColorStop(0,'rgba(0,30,60,0.7)');tfog.addColorStop(1,'transparent');
      ctx.fillStyle=tfog;ctx.fillRect(0,0,W(),H());
      // Main title
      ctx.shadowColor='rgba(0,180,255,0.95)';ctx.shadowBlur=50;
      ctx.fillStyle='#ffffff';
      ctx.font=`bold ${Math.floor(W()*.088)}px "Orbitron",monospace`;
      ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText('REALM', W()*.5, H()*.42);
      ctx.shadowBlur=0;
      // Metal lines
      ctx.strokeStyle='rgba(0,200,255,0.5)';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(W()*.2,H()*.49);ctx.lineTo(W()*.8,H()*.49);ctx.stroke();
      // Subtitle
      ctx.globalAlpha=Math.max(0,subtitleAlpha*titleAlpha);
      ctx.fillStyle='rgba(0,200,255,0.9)';
      ctx.font=`${Math.floor(W()*.018)}px "Orbitron",monospace`;
      ctx.letterSpacing='0.35em';
      ctx.fillText('URBAN BATTLEGROUND', W()*.5, H()*.55);
      ctx.restore();
    }

    // Vignette
    const vig=ctx.createRadialGradient(W()*.5,H()*.5,H()*.2,W()*.5,H()*.5,H()*.85);
    vig.addColorStop(0,'transparent');vig.addColorStop(1,'rgba(0,0,0,0.7)');
    ctx.fillStyle=vig;ctx.fillRect(0,0,W(),H());
    // Scanlines
    for(let sl=0;sl<H();sl+=3){ctx.fillStyle='rgba(0,0,0,0.03)';ctx.fillRect(0,sl,W(),1);}

    ctx.restore();
    if (t >= 500) { skipIntro(); return; }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function skipIntro() {
  _cinSkipped = true;
  const cin = document.getElementById('cinematic');
  cin.style.transition = 'opacity .7s ease';
  cin.style.opacity = '0';
  setTimeout(() => {
    cin.classList.add('hidden');
    cin.style.opacity = '';
    showHomeScreen();
  }, 700);
}

// ─────────────────────────────────────────────────────────────────────
// HOME SCREEN
// ─────────────────────────────────────────────────────────────────────
let _homeBgRunning = false;
function showHomeScreen() {
  document.getElementById('homeScreen').classList.remove('hidden');
  updateProfileUI();
  if (!_homeBgRunning) { _homeBgRunning = true; runHomeBg(); }
}

function runHomeBg() {
  const c = document.getElementById('homeBg'); if (!c) return;
  c.width = window.innerWidth; c.height = window.innerHeight;
  const ctx = c.getContext('2d');
  const pts = Array.from({length:65},()=>({x:Math.random()*c.width,y:Math.random()*c.height,r:Math.random()*1.4+.3,vx:(Math.random()-.5)*.22,vy:-Math.random()*.3-.08,life:Math.random()}));
  const buildings = Array.from({length:22},(_,i)=>({x:i*(c.width/19),w:38+Math.random()*72,h:85+Math.random()*225}));
  function draw() {
    if (!_homeBgRunning) return;
    c.width = window.innerWidth; c.height = window.innerHeight;
    const W=c.width,H=c.height;
    const bg=ctx.createLinearGradient(0,0,0,H);
    bg.addColorStop(0,'#020510');bg.addColorStop(.55,'#040c1a');bg.addColorStop(1,'#020510');
    ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
    // City silhouette + window glow
    buildings.forEach(b=>{
      ctx.fillStyle='rgba(12,17,32,0.95)';
      ctx.fillRect(b.x,H*.72-b.h,b.w,b.h);
      // Random windows
      for(let w2=0;w2<6;w2++){
        const wx=b.x+4+Math.random()*(b.w-10);
        const wy=H*.72-b.h+6+Math.random()*(b.h-15);
        if(Math.random()>.5){
          ctx.fillStyle=`rgba(255,210,100,${0.3+Math.random()*.35})`;
          ctx.fillRect(wx,wy,b.w*0.12,b.h*0.06);
        }
      }
    });
    // Grid
    ctx.strokeStyle='rgba(0,200,255,0.035)';ctx.lineWidth=1;
    for(let gx=0;gx<W;gx+=44){ctx.beginPath();ctx.moveTo(gx,0);ctx.lineTo(gx,H);ctx.stroke();}
    for(let gy=0;gy<H;gy+=44){ctx.beginPath();ctx.moveTo(0,gy);ctx.lineTo(W,gy);ctx.stroke();}
    // Particles
    pts.forEach(p=>{
      p.x+=p.vx;p.y+=p.vy;p.life-=.0015;
      if(p.life<=0||p.y<0){p.x=Math.random()*W;p.y=H;p.life=.65+Math.random()*.3;}
      if(p.x<0||p.x>W)p.vx*=-1;
      ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle=`rgba(0,200,255,${p.life*.42})`;ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  draw();
}

// ─────────────────────────────────────────────────────────────────────
// START GAME
// ─────────────────────────────────────────────────────────────────────
function startGame(mode) {
  _homeBgRunning = false;
  window._currentMode = mode;
  window._lives = 2;
  window._gameTime = 0;
  window.currentPlayer.kills = 0;
  window._PS.health = window._PS.maxHealth;
  window._PS.armor  = 0;
  window.currentPlayer.grenades = window.currentPlayer.grenades || 2;
  window.currentPlayer.medkits  = window.currentPlayer.medkits  || 1;

  ['homeScreen','multiMenu','matchCreated','shopScreen','settingsScreen','upgradeScreen'].forEach(id=>{
    document.getElementById(id)?.classList.add('hidden');
  });
  const gc = document.getElementById('gameContainer');
  gc.classList.remove('hidden');
  document.getElementById('hudMode').textContent = mode.toUpperCase().replace('-',' ');
  document.getElementById('hudTimer').textContent = mode==='solo' ? '∞' : '05:00';
  document.getElementById('livesRow').innerHTML = '<span style="color:#ff4444;font-size:1rem">&#9632;</span><span style="color:#ff4444;font-size:1rem">&#9632;</span>';

  // Cleanup
  if (window._renderer) { try { window._renderer.dispose(); } catch(e){} }
  window._enemies=[]; window._bystanders=[]; window._vehicles=[];
  window._wallMeshes=[]; window._buildingBoxes=[];
  window._pickups=[]; window._pickupMeshes=[];
  document.querySelectorAll('.name-tag').forEach(el=>el.remove());
  _camYaw=0; _camPitch=-0.18;

  initThreeJS();
  buildWorld(window._scene);
  createPlayer(window._scene);

  if (mode==='agents')      spawnEnemies(window._scene, 6);
  else if (mode==='two-player') spawnEnemies(window._scene, 8);
  else if (mode==='solo')   spawnEnemies(window._scene, 0);
  else if (mode==='multiplayer') { spawnEnemies(window._scene, 3); startMPGame(); }

  spawnBystanders(window._scene, 12);
  spawnVehicles(window._scene);
  spawnPickups(window._scene);
  equipWeapon(window.currentPlayer.equippedWeapon || 'assault');

  window.gameRunning=true; window.gamePaused=false;
  if (mode!=='solo') startTimer(300);
  updateHUD(); updateGearHUD(); updateAmmoHUD();
  setupControls();
  startBGMusic();
  window._lastT = performance.now();
  gameLoop();
}

async function startMPGame() {
  if (window._mpMatchKey) subscribeToMatch(window._mpMatchKey);
}

// ─────────────────────────────────────────────────────────────────────
// THREE.JS INIT — cinematic night city rendering
// ─────────────────────────────────────────────────────────────────────
function initThreeJS() {
  const canvas = document.getElementById('gameCanvas');
  const W=window.innerWidth, H=window.innerHeight;

  const scene = new THREE.Scene();
  window._scene = scene;

  const camera = new THREE.PerspectiveCamera(70, W/H, 0.1, 300);
  camera._targetFOV = 70;
  window._camera = camera;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  window._renderer = renderer;

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

// ─────────────────────────────────────────────────────────────────────
// CAMERA — smooth 3rd person behind player (matches screenshot exactly)
// ─────────────────────────────────────────────────────────────────────
function updateCamera(dt) {
  const cam = window._camera; const pm = window._playerMesh;
  if (!cam || !pm) return;

  // Smooth FOV
  cam.fov += (cam._targetFOV - cam.fov) * 8 * dt;
  cam.updateProjectionMatrix();

  if (window._inVehicle) return;

  if (window._camMode === '3rd') {
    // Camera offset: behind and above — slightly right when aiming (like GTA)
    const dist   = window._isAiming ? 2.8 : 5.0;
    const height = window._isAiming ? 1.8 : 2.5;
    const lateral= window._isAiming ? 0.7 : 0.0;

    // Build behind vector from camYaw
    const cosY = Math.cos(_camYaw), sinY = Math.sin(_camYaw);
    const behind = new THREE.Vector3(sinY * lateral + cosY * lateral * 0.3, height, cosY * dist + sinY * dist * 0.15);
    // Wait — just use camera yaw properly:
    const behindDir = new THREE.Vector3(
      Math.sin(_camYaw) * lateral + Math.sin(_camYaw + Math.PI) * (dist - lateral * 0.5),
      height,
      Math.cos(_camYaw) * lateral + Math.cos(_camYaw + Math.PI) * (dist - lateral * 0.5)
    ).normalize().multiplyScalar(dist);
    behindDir.y = height;

    const targetCamPos = pm.position.clone().add(new THREE.Vector3(
      Math.sin(_camYaw + Math.PI) * dist + Math.sin(_camYaw + Math.PI/2) * lateral,
      height,
      Math.cos(_camYaw + Math.PI) * dist + Math.cos(_camYaw + Math.PI/2) * lateral
    ));

    // Smooth follow
    cam.position.lerp(targetCamPos, 10 * dt);

    // Look at player chest level
    const lookTarget = pm.position.clone().add(new THREE.Vector3(0, 1.3, 0));
    cam.lookAt(lookTarget);

    // Face player in direction of movement
    pm.rotation.y = _camYaw;

  } else {
    // First person: camera = head position
    cam.position.copy(pm.position).add(new THREE.Vector3(0, 1.56, 0));
    cam.rotation.order = 'YXZ';
    cam.rotation.y = _camYaw;
    cam.rotation.x = _camPitch;
    pm.visible = false;
  }
}

// ─────────────────────────────────────────────────────────────────────
// CONTROLS
// ─────────────────────────────────────────────────────────────────────
function setupControls() {
  const canvas = document.getElementById('gameCanvas');
  canvas.addEventListener('click', () => { canvas.requestPointerLock?.(); });
  document.addEventListener('pointerlockchange', () => {
    _pointerLocked = document.pointerLockElement === canvas;
  });

  // Mouse look
  document.addEventListener('mousemove', e => {
    if (!window.gameRunning || window.gamePaused) return;
    if (_pointerLocked) {
      _camYaw   -= e.movementX * 0.0022;
      _camPitch  = Math.max(-1.1, Math.min(0.35, _camPitch - e.movementY * 0.0022));
    }
  });

  // Touch look (right half — NOT interfering with joystick)
  let _tlId = null, _tlX = 0, _tlY = 0;
  const gc = document.getElementById('gameContainer');
  gc.addEventListener('touchstart', e => {
    Array.from(e.changedTouches).forEach(touch => {
      const rightHalf = touch.clientX > window.innerWidth * 0.42;
      const notControl = !document.getElementById('mobileControls')?.contains(e.target) &&
                         !document.getElementById('driveControls')?.contains(e.target);
      if (rightHalf && notControl && _tlId === null) {
        _tlId = touch.identifier; _tlX = touch.clientX; _tlY = touch.clientY;
      }
    });
  }, { passive: true });
  gc.addEventListener('touchmove', e => {
    Array.from(e.changedTouches).forEach(touch => {
      if (touch.identifier !== _tlId) return;
      const dx = touch.clientX - _tlX, dy = touch.clientY - _tlY;
      _camYaw   -= dx * 0.0038;
      _camPitch  = Math.max(-1.1, Math.min(0.35, _camPitch - dy * 0.0038));
      _tlX = touch.clientX; _tlY = touch.clientY;
    });
  }, { passive: true });
  gc.addEventListener('touchend', e => {
    Array.from(e.changedTouches).forEach(t => { if (t.identifier === _tlId) _tlId = null; });
  }, { passive: true });

  // Joystick
  initJoystick();

  // Keyboard
  document.addEventListener('keydown', e => {
    if (!window.gameRunning) return;
    const k = e.key.toLowerCase();
    if (k==='w'||k==='arrowup')    window._keys.w=true;
    if (k==='s'||k==='arrowdown')  window._keys.s=true;
    if (k==='a'||k==='arrowleft')  window._keys.a=true;
    if (k==='d'||k==='arrowright') window._keys.d=true;
    if (k===' ') { e.preventDefault(); doJump(); }
    if (k==='c') startCrouch();
    if (k==='r') doReload();
    if (k==='f') toggleVehicle();
    if (k==='g') doGrenade();
    if (k==='h') doHeal();
    if (k==='v') toggleCameraMode();
    if (k==='b') openInGameShop();
    if (k==='escape') pauseGame();
    if (k==='shift') doDash();
  });
  document.addEventListener('keyup', e => {
    const k = e.key.toLowerCase();
    if (k==='w'||k==='arrowup')    window._keys.w=false;
    if (k==='s'||k==='arrowdown')  window._keys.s=false;
    if (k==='a'||k==='arrowleft')  window._keys.a=false;
    if (k==='d'||k==='arrowright') window._keys.d=false;
    if (k==='c') stopCrouch();
    if (k==='q') stopAiming();
  });

  // Mouse fire
  canvas.addEventListener('mousedown', e => {
    if (e.button===0 && window.gameRunning && !window.gamePaused) startFiring();
    if (e.button===2) startAiming();
  });
  canvas.addEventListener('mouseup', e => {
    if (e.button===0) stopFiring();
    if (e.button===2) stopAiming();
  });
  canvas.addEventListener('contextmenu', e => e.preventDefault());
}

function initJoystick() {
  const base = document.getElementById('joyBase');
  const knob = document.getElementById('joyKnob');
  if (!base || !knob) return;
  let active=false, cx=0, cy=0; const MAX=30;
  base.addEventListener('touchstart', e => {
    active=true;
    const r=base.getBoundingClientRect(); cx=r.left+r.width/2; cy=r.top+r.height/2;
    e.preventDefault();
  }, { passive: false });
  document.addEventListener('touchmove', e => {
    if (!active) return;
    const touch = [...e.touches].find(t => {
      const dx=t.clientX-cx, dy=t.clientY-cy; return Math.sqrt(dx*dx+dy*dy) < 90;
    });
    if (!touch) return;
    let dx=touch.clientX-cx, dy=touch.clientY-cy;
    const dist=Math.sqrt(dx*dx+dy*dy); if(dist>MAX){dx=dx/dist*MAX;dy=dy/dist*MAX;}
    knob.style.transform=`translate(${dx}px,${dy}px)`;
    window._joy.x=dx/MAX; window._joy.y=-dy/MAX;
  }, { passive: true });
  document.addEventListener('touchend', () => {
    if (!active) return; active=false;
    knob.style.transform=''; window._joy.x=0; window._joy.y=0;
  });
}

function toggleCameraMode() {
  if (window._camMode==='3rd') {
    window._camMode='1st';
    if (window._playerMesh) window._playerMesh.visible=false;
    document.getElementById('camBtn').textContent='1P';
  } else {
    window._camMode='3rd';
    if (window._playerMesh) window._playerMesh.visible=true;
    document.getElementById('camBtn').textContent='3P';
  }
}

// ─────────────────────────────────────────────────────────────────────
// GAME LOOP
// ─────────────────────────────────────────────────────────────────────
window._lastT = 0;
function gameLoop() {
  if (!window.gameRunning) return;
  requestAnimationFrame(ts => {
    const dt = Math.min((ts - window._lastT) / 1000, 0.05);
    window._lastT = ts;
    if (!window.gamePaused) {
      window._gameTime += dt;
      if (!window._inVehicle) updatePlayerMovement(dt, window._camera);
      updateCamera(dt);
      if (window._inVehicle) updateDriving(dt);
      (window._enemies  || []).forEach(e => updateEnemyAI(e, dt));
      (window._bystanders || []).forEach(b => updateBystander(b, dt));
      (window._vehicles || []).filter(v => !v.occupied).forEach(v => updateVehicleAI(v, dt));
      updatePickups(dt);
      tickMP(dt);
      animateWorld(window._gameTime);
      drawMinimap();
      updateAllNameTags(window._camera, window._renderer);
    }
    if (window._renderer && window._scene && window._camera) {
      window._renderer.render(window._scene, window._camera);
    }
    gameLoop();
  });
}
