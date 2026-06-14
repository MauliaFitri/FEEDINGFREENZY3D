// ── RENDERER & SCENE SETUP ──
const container = document.getElementById('canvas-container');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.insertBefore(renderer.domElement, container.firstChild);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x001a2e);
scene.fog = new THREE.Fog(0x001a2e, 40, 90);

// ── CAMERA ──
let camMode = 0;
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 8, 18);
camera.lookAt(0, 0, 0);

// ── LIGHTING ──
scene.add(new THREE.AmbientLight(0x113355, 1.2));

const sunLight = new THREE.DirectionalLight(0x88ccff, 1.5);
sunLight.position.set(10, 20, 10);
sunLight.castShadow = true;
scene.add(sunLight);

const rimLight = new THREE.PointLight(0x00e5ff, 0.8, 60);
rimLight.position.set(-10, 5, -5);
scene.add(rimLight);

// ── FLOOR ──
const floorGeo = new THREE.PlaneGeometry(120, 80, 30, 20);
const floorVerts = floorGeo.attributes.position.array;
for (let i = 0; i < floorVerts.length; i += 3) floorVerts[i + 2] += (Math.random() - 0.5) * 0.5;
floorGeo.attributes.position.needsUpdate = true;
floorGeo.computeVertexNormals();

const floor = new THREE.Mesh(floorGeo, new THREE.MeshStandardMaterial({ color: 0x003355, roughness: 0.9 }));
floor.rotation.x = -Math.PI / 2;
floor.position.y = -8;
floor.receiveShadow = true;
scene.add(floor);

// ── ROCKS ──
for (let i = 0; i < 30; i++) {
  const m = new THREE.Mesh(
    new THREE.DodecahedronGeometry(Math.random() * 0.8 + 0.3, 0),
    new THREE.MeshStandardMaterial({ color: 0x224455, roughness: 1 })
  );
  m.position.set((Math.random() - 0.5) * 100, -7.5, (Math.random() - 0.5) * 60);
  m.rotation.set(Math.random(), Math.random(), Math.random());
  scene.add(m);
}

// ── BUBBLES (particle system) ──
const bubbleGeo = new THREE.BufferGeometry();
const bCount = 300;
const bPos = new Float32Array(bCount * 3);
for (let i = 0; i < bCount * 3; i += 3) {
  bPos[i]     = (Math.random() - 0.5) * 100;
  bPos[i + 1] = Math.random() * 20 - 8;
  bPos[i + 2] = (Math.random() - 0.5) * 60;
}
bubbleGeo.setAttribute('position', new THREE.BufferAttribute(bPos, 3));
const bubbles = new THREE.Points(
  bubbleGeo,
  new THREE.PointsMaterial({ color: 0x88ddff, size: 0.15, transparent: true, opacity: 0.5 })
);
scene.add(bubbles);

// ── FISH BUILDER ──
function darken(hex, f) {
  const c = new THREE.Color(hex);
  c.r *= f; c.g *= f; c.b *= f;
  return c;
}

function createFish(color, scale = 1) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.3 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.7, 0.45), mat);
  body.castShadow = true;
  group.add(body);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.42), mat);
  head.position.set(0.75, 0.02, 0);
  group.add(head);

  const tail = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 0.55, 0.12),
    new THREE.MeshStandardMaterial({ color: darken(color, 0.6), roughness: 0.7 })
  );
  tail.position.set(-0.72, 0, 0);
  tail.rotation.z = Math.PI / 8;
  group.add(tail);
  group.userData.tail = tail;

  const fin = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.3, 0.06),
    new THREE.MeshStandardMaterial({ color: darken(color, 0.7) })
  );
  fin.position.set(0.1, 0.44, 0);
  group.add(fin);

  const sfGeo = new THREE.BoxGeometry(0.25, 0.12, 0.18);
  const sfMat = new THREE.MeshStandardMaterial({ color: darken(color, 0.75) });
  const sfL = new THREE.Mesh(sfGeo, sfMat);
  sfL.position.set(0.3, -0.15, 0.28);
  sfL.rotation.x = 0.3;
  group.add(sfL);
  const sfR = sfL.clone();
  sfR.position.z = -0.28;
  sfR.rotation.x = -0.3;
  group.add(sfR);

  const eyeGeo = new THREE.SphereGeometry(0.07, 6, 6);
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.3 });
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(0.97, 0.15, 0.2);
  group.add(eyeL);
  const eyeR = eyeL.clone();
  eyeR.position.z = -0.2;
  group.add(eyeR);

  const pupilGeo = new THREE.SphereGeometry(0.04, 4, 4);
  const pupilMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const pL = new THREE.Mesh(pupilGeo, pupilMat);
  pL.position.set(1.01, 0.15, 0.215);
  group.add(pL);
  const pR = pL.clone();
  pR.position.z = -0.215;
  group.add(pR);

  group.scale.setScalar(scale);
  return group;
}

const FISH_COLORS = [0xff6644, 0xffaa00, 0x44ffaa, 0xff44bb, 0x44aaff, 0xffff44, 0xaa44ff, 0xff8866];

// ── GAME STATE ──
let gameRunning = false, gamePaused = false, score = 0, eaten = 0;
let playerFish, playerScale = 1.0, npcs = [];
const keys = {};

// ── INPUT ──
document.addEventListener('keydown', e => {
  keys[e.key] = true;
  if (e.key === ' ' || e.key === 'Escape') togglePause();
});
document.addEventListener('keyup', e => { keys[e.key] = false; });

// ── MOUSE / RAYCASTER ──
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
document.addEventListener('mousemove', e => {
  mouse.x =  (e.clientX / window.innerWidth)  * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  document.getElementById('tooltip').style.left = (e.clientX + 14) + 'px';
  document.getElementById('tooltip').style.top  = (e.clientY - 10) + 'px';
});

// ── INIT ──
let waveTimer = 0;
const WAVE_INTERVAL = 12;

function initGame() {
  if (playerFish) scene.remove(playerFish);
  npcs.forEach(n => scene.remove(n.mesh));
  npcs = [];
  score = 0; eaten = 0; playerScale = 1.0; gamePaused = false; waveTimer = 0;
  updateHUD();

  playerFish = createFish(0x00e5ff, playerScale);
  playerFish.position.set(0, 0, 0);
  scene.add(playerFish);

  // Spawn 3 gelombang awal sekaligus
  spawnWave();
  spawnWave();
  spawnWave();
}

// Level Y yang tersedia agar ikan tersebar merata
const Y_LANES = [-6, -4, -2, 0, 2, 4, 6, 8];

function spawnWave() {
  const side   = Math.random() < 0.5 ? -1 : 1;
  const spawnX = side * 48; // selalu dari tepi layar, bukan dari posisi player
  const dir    = new THREE.Vector3(-side, 0, 0);

  const count = 4 + Math.floor(Math.random() * 4);
  const lanes = [...Y_LANES].sort(() => Math.random() - 0.5).slice(0, count);

  lanes.forEach(spawnY => {
    const sc    = Math.random() * 2.2 + 0.4;
    const color = FISH_COLORS[Math.floor(Math.random() * FISH_COLORS.length)];
    const mesh  = createFish(color, sc);
    mesh.position.set(spawnX, spawnY, 0);
    const speed = (0.8 + Math.random() * 1.2) * (sc < 1 ? 1.3 : 0.8);
    scene.add(mesh);
    npcs.push({ mesh, scale: sc, speed, dir: dir.clone(), color, wobble: Math.random() * Math.PI * 2 });
  });
}

function spawnNPC() {
  const sc     = Math.random() * 2.2 + 0.4;
  const color  = FISH_COLORS[Math.floor(Math.random() * FISH_COLORS.length)];
  const mesh   = createFish(color, sc);
  const side   = Math.random() < 0.5 ? -1 : 1;
  const spawnX = side * 48; // tepi layar tetap
  const spawnY = Y_LANES[Math.floor(Math.random() * Y_LANES.length)];
  mesh.position.set(spawnX, spawnY, 0);
  const dir   = new THREE.Vector3(-side, 0, 0);
  const speed = (0.8 + Math.random() * 1.2) * (sc < 1 ? 1.3 : 0.8);
  scene.add(mesh);
  npcs.push({ mesh, scale: sc, speed, dir, color, wobble: Math.random() * Math.PI * 2 });
}

// ── HUD ──
function updateHUD() {
  document.getElementById('score-val').textContent = score;
  document.getElementById('eaten-val').textContent = eaten;
  document.getElementById('level-val').textContent = Math.floor(playerScale * 2);
  document.getElementById('size-bar-fill').style.width = Math.min((playerScale / 4) * 100, 100) + '%';
}

function togglePause() {
  if (!gameRunning) return;
  gamePaused = !gamePaused;
  document.getElementById('pause-indicator').style.opacity = gamePaused ? '1' : '0';
  document.getElementById('btn-pause').textContent = gamePaused ? '▶ Lanjut' : '⏸ Pause';
}

function triggerGameOver() {
  gameRunning = false;
  stopBacksound();
  playGameOverSound();
  document.getElementById('final-score').textContent = 'Skor: ' + score;
  document.getElementById('game-over-overlay').style.display = 'flex';
}

// ── D-PAD BUTTON EVENTS ──
const dpadMap = {
  'btn-up':    'ArrowUp',
  'btn-down':  'ArrowDown',
  'btn-left':  'ArrowLeft',
  'btn-right': 'ArrowRight',
};

Object.entries(dpadMap).forEach(([id, key]) => {
  const btn = document.getElementById(id);
  const press = (e) => { e.preventDefault(); keys[key] = true;  btn.classList.add('pressed'); };
  const release = (e) => { e.preventDefault(); keys[key] = false; btn.classList.remove('pressed'); };
  btn.addEventListener('mousedown',   press);
  btn.addEventListener('mouseup',     release);
  btn.addEventListener('mouseleave',  release);
  btn.addEventListener('touchstart',  press,   { passive: false });
  btn.addEventListener('touchend',    release, { passive: false });
  btn.addEventListener('touchcancel', release, { passive: false });
});

// ── BUTTON EVENTS ──
document.getElementById('btn-start').addEventListener('click', () => {
  document.getElementById('start-overlay').style.display = 'none';
  initGame();
  gameRunning = true;
  playBacksound();
});
document.getElementById('btn-pause').addEventListener('click', togglePause);
document.getElementById('btn-restart').addEventListener('click', () => {
  document.getElementById('game-over-overlay').style.display = 'none';
  initGame();
  gameRunning = true;
  playBacksound();
});
document.getElementById('btn-restart-go').addEventListener('click', () => {
  document.getElementById('game-over-overlay').style.display = 'none';
  initGame();
  gameRunning = true;
  playBacksound();
});
document.getElementById('btn-cam').addEventListener('click', () => {
  camMode = (camMode + 1) % 3;
  document.getElementById('btn-cam').textContent = ['📷 Follow', '🔭 Top-Down', '🎬 Sinematik'][camMode];
});

// ── MAIN LOOP ──
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t  = clock.elapsedTime;

  // Animasi gelembung
  const bp = bubbles.geometry.attributes.position.array;
  for (let i = 1; i < bp.length; i += 3) {
    bp[i] += dt * 0.5;
    if (bp[i] > 12) bp[i] = -8;
  }
  bubbles.geometry.attributes.position.needsUpdate = true;

  rimLight.intensity  = 0.7 + Math.sin(t * 0.8) * 0.2;
  rimLight.position.x = Math.sin(t * 0.3) * 15;

  if (!gameRunning || gamePaused) {
    renderer.render(scene, camera);
    return;
  }

  // Spawn gelombang baru secara berkala
  waveTimer += dt;
  if (waveTimer >= WAVE_INTERVAL) {
    waveTimer = 0;
    spawnWave();
  }

  // ── PLAYER MOVEMENT ──
  const spd = 8 * dt;
  let mx = 0, my = 0;
  if (keys['ArrowLeft']  || keys['a'] || keys['A']) mx -= 1;
  if (keys['ArrowRight'] || keys['d'] || keys['D']) mx += 1;
  if (keys['ArrowUp']    || keys['w'] || keys['W']) my += 1;
  if (keys['ArrowDown']  || keys['s'] || keys['S']) my -= 1;

  if (mx || my) {
    const len = Math.sqrt(mx * mx + my * my);
    playerFish.position.x += mx / len * spd;
    playerFish.position.y += my / len * spd;
    playerFish.rotation.y  = THREE.MathUtils.lerp(playerFish.rotation.y, mx < 0 ? Math.PI : 0, 0.2);
    playerFish.rotation.z  = THREE.MathUtils.lerp(playerFish.rotation.z, my * -0.35, 0.15);
  } else {
    playerFish.rotation.z = THREE.MathUtils.lerp(playerFish.rotation.z, 0, 0.1);
  }

  if (playerFish.userData.tail) playerFish.userData.tail.rotation.z = Math.sin(t * 8) * 0.3;

  playerFish.position.x = THREE.MathUtils.clamp(playerFish.position.x, -45, 45);
  playerFish.position.y = THREE.MathUtils.clamp(playerFish.position.y, -7, 10);
  playerFish.scale.setScalar(playerScale);

  // ── NPC UPDATE ──
  for (let i = npcs.length - 1; i >= 0; i--) {
    const n = npcs[i];
    n.wobble += dt * 3;

    // Gerak lurus horizontal saja — tidak mengikuti player sama sekali
    n.mesh.position.x += n.dir.x * n.speed * dt;

    // Efek ombak kecil pada Y (natural swim, bukan mengikuti player)
    n.mesh.position.y += Math.sin(n.wobble) * 0.008;

    // Hadap arah gerak
    n.mesh.rotation.y = n.dir.x < 0 ? Math.PI : 0;

    // Animasi ekor
    if (n.mesh.userData.tail) n.mesh.userData.tail.rotation.z = Math.sin(n.wobble) * 0.35;

    // Respawn jika keluar batas X
    if (Math.abs(n.mesh.position.x) > 55) {
      scene.remove(n.mesh);
      npcs.splice(i, 1);
      spawnNPC();
      continue;
    }

    // ── COLLISION DETECTION ──
    const dist = n.mesh.position.distanceTo(playerFish.position);
    if (dist < (playerScale + n.scale) * 0.35) {
      if (playerScale >= n.scale * 0.95) {
        score      += Math.floor(n.scale * 10);
        eaten++;
        playerScale = Math.min(playerScale + n.scale * 0.08, 4.0);
        playEatSound();
        scene.remove(n.mesh);
        npcs.splice(i, 1);
        spawnNPC();
        updateHUD();
      } else if (n.scale > playerScale * 1.1) {
        triggerGameOver();
        return;
      }
    }
  }

  // ── HOVER TOOLTIP ──
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(npcs.map(n => n.mesh), true);
  const tt = document.getElementById('tooltip');
  if (hits.length > 0) {
    const npc = npcs.find(n => {
      let o = hits[0].object;
      while (o) { if (o === n.mesh) return true; o = o.parent; }
      return false;
    });
    if (npc) {
      const bigger = npc.scale > playerScale;
      tt.style.display     = 'block';
      tt.textContent       = bigger ? '⚠️ Lebih besar! Hindari!' : '✅ Bisa dimakan!';
      tt.style.borderColor = bigger ? 'rgba(255,80,80,0.6)' : 'rgba(0,255,150,0.6)';
    }
  } else {
    tt.style.display = 'none';
  }

  // ── CAMERA MODES ──
  const px = playerFish.position;
  if (camMode === 0) {
    camera.position.lerp(new THREE.Vector3(px.x, px.y + 6, px.z + 16), 0.08);
  } else if (camMode === 1) {
    camera.position.lerp(new THREE.Vector3(px.x, px.y + 22, px.z + 2), 0.08);
  } else {
    camera.position.lerp(new THREE.Vector3(px.x + Math.sin(t * 0.2) * 22, px.y + 8, px.z + Math.cos(t * 0.2) * 22), 0.05);
  }
  camera.lookAt(px.x, px.y, px.z);

  renderer.render(scene, camera);
}

// ── SOUND EFFECTS (Web Audio API) ──
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playEatSound() {
  const osc1 = audioCtx.createOscillator();
  const osc2 = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc1.connect(gain); osc2.connect(gain); gain.connect(audioCtx.destination);
  osc1.type = 'sine'; osc2.type = 'sine';
  const now = audioCtx.currentTime;
  osc1.frequency.setValueAtTime(400, now);
  osc1.frequency.exponentialRampToValueAtTime(800, now + 0.08);
  osc2.frequency.setValueAtTime(600, now);
  osc2.frequency.exponentialRampToValueAtTime(1100, now + 0.1);
  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
  osc1.start(now); osc1.stop(now + 0.18);
  osc2.start(now); osc2.stop(now + 0.18);
}

function playGameOverSound() {
  const osc  = audioCtx.createOscillator();
  const osc2 = audioCtx.createOscillator();
  const dist = audioCtx.createWaveShaper();
  const gain = audioCtx.createGain();
  const curve = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    const x = (i * 2) / 256 - 1;
    curve[i] = (Math.PI + 80) * x / (Math.PI + 80 * Math.abs(x));
  }
  dist.curve = curve;
  osc.connect(dist); osc2.connect(gain); dist.connect(gain); gain.connect(audioCtx.destination);
  osc.type = 'sawtooth'; osc2.type = 'sine';
  const now = audioCtx.currentTime;
  osc.frequency.setValueAtTime(300, now);
  osc.frequency.exponentialRampToValueAtTime(60, now + 0.6);
  osc2.frequency.setValueAtTime(200, now + 0.1);
  osc2.frequency.exponentialRampToValueAtTime(40, now + 0.8);
  gain.gain.setValueAtTime(0.0, now);
  gain.gain.linearRampToValueAtTime(0.4, now + 0.05);
  gain.gain.setValueAtTime(0.4, now + 0.3);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
  osc.start(now); osc.stop(now + 1.0);
  osc2.start(now + 0.1); osc2.stop(now + 1.0);
  [0.65, 0.78, 0.88].forEach((t, i) => {
    const b = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    b.connect(g); g.connect(audioCtx.destination);
    b.type = 'square';
    b.frequency.setValueAtTime(120 - i * 20, now + t);
    g.gain.setValueAtTime(0.15, now + t);
    g.gain.exponentialRampToValueAtTime(0.001, now + t + 0.08);
    b.start(now + t); b.stop(now + t + 0.1);
  });
}

function resumeAudio() {
  if (audioCtx.state === 'suspended') audioCtx.resume();
}
document.addEventListener('keydown',    resumeAudio, { once: true });
document.addEventListener('click',      resumeAudio, { once: true });
document.addEventListener('touchstart', resumeAudio, { once: true });

// ── BACKSOUND ──
const backsound = document.getElementById('backsound');
backsound.volume = 0.4;

function playBacksound() {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  backsound.currentTime = 0;
  backsound.play().catch(() => {});
}

function stopBacksound() {
  backsound.pause();
  backsound.currentTime = 0;
}

// ── RESIZE ──
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ── START ──
animate();