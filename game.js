// =============================================
// TANK BATTLE 3D - Supabase Realtime Multiplayer
// Your credentials are embedded below
// =============================================

// YOUR SUPABASE CREDENTIALS (EMBEDDED)
const SUPABASE_URL = 'https://lwxgnkfrwcelaofqhyfw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3eGdua2Zyd2NlbGFvZnFoeWZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0ODQyNjUsImV4cCI6MjA4NzA2MDI2NX0.bDRc3gPUihDmHojI3tw3UFv8RQXAwtAQYcmAMePN9-Y';

// Initialize Supabase
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Game state
let channel = null;
let myId = null;
let myName = 'Tank';
let players = {};
let bullets = {};
let powerups = {};
let myHealth = 100;
let myKills = 0;
let isDead = false;
let lastShotTime = 0;
let bulletCounter = 0;
let powerupCounter = 0;

// Three.js
let scene, camera, renderer;
let tankMeshes = {};
let bulletMeshes = {};
let myTank = null;
let minimapCtx = null;

// Powerups
let activePowerups = {
  shield: false,
  rapidFire: false,
  speedBoost: false
};

// Particles
let particles = [];

class Particle {
  constructor(x, y, z, color = 0xff6600) {
    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 4, 4),
      new THREE.MeshBasicMaterial({ color })
    );
    this.mesh.position.set(x, y, z);
    
    this.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.3,
      Math.random() * 0.4 + 0.2,
      (Math.random() - 0.5) * 0.3
    );
    
    this.life = 1.0;
    this.decay = 0.02;
    
    scene.add(this.mesh);
  }

  update() {
    this.mesh.position.add(this.velocity);
    this.velocity.y -= 0.01;
    this.life -= this.decay;
    
    const scale = this.life;
    this.mesh.scale.set(scale, scale, scale);
    this.mesh.material.opacity = this.life;
    this.mesh.material.transparent = true;
    
    return this.life > 0;
  }

  destroy() {
    scene.remove(this.mesh);
  }
}

function createExplosion(x, y, z) {
  for (let i = 0; i < 20; i++) {
    particles.push(new Particle(x, y, z, 0xff6600));
  }
  for (let i = 0; i < 10; i++) {
    particles.push(new Particle(x, y, z, 0x555555));
  }
}

// Input
const keys = {};
let mouseX = 0, mouseY = 0;

// Camera controls
let cameraDistance = 18;
let cameraHeight = 12;
let cameraAngleOffset = 0;
let isDraggingCamera = false;
let lastMouseX = 0;
let lastMouseY = 0;
let viewMode = 0;

// Mobile
let isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
let joystickActive = false;
let joystickCenter = { x: 0, y: 0 };
let joystickTouch = null;
let aimJoystickActive = false;
let aimJoystickCenter = { x: 0, y: 0 };
let aimJoystickTouch = null;

// Performance
let lastFrameTime = Date.now();
let fps = 60;

// Sounds
let audioCtx = null;
let sounds = {};

function initSounds() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  audioCtx = new AudioContext();

  sounds.shoot = () => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.setValueAtTime(200, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
  };

  sounds.explosion = () => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + 0.4);
    filter.frequency.setValueAtTime(2000, audioCtx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.4);
  };

  sounds.hit = () => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.setValueAtTime(300, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.05);
  };

  sounds.powerup = () => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.setValueAtTime(440, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.2);
  };
}

// Join button
document.getElementById('joinBtn').addEventListener('click', async () => {
  myName = document.getElementById('playerName').value.trim() || 'Tank_' + Math.floor(Math.random() * 999);
  myId = 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  
  document.getElementById('statusMsg').textContent = 'Connecting to Supabase...';
  
  // Create channel
  channel = supabaseClient.channel('tank-battle-main');
  
  // Listen for presence
  channel.on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState();
    players = {};
    Object.keys(state).forEach(key => {
      const presences = state[key];
      if (presences.length > 0) {
        const p = presences[0];
        players[key] = p;
      }
    });
    updatePlayerCount();
    updateLeaderboard();
  });

  // Listen for broadcasts
  channel.on('broadcast', { event: 'move' }, ({ payload }) => {
    if (players[payload.id]) {
      players[payload.id].x = payload.x;
      players[payload.id].z = payload.z;
      players[payload.id].ry = payload.ry;
      players[payload.id].ty = payload.ty;
      syncTankMesh(payload.id);
    }
  });

  channel.on('broadcast', { event: 'bullet' }, ({ payload }) => {
    if (!bullets[payload.id]) {
      bullets[payload.id] = payload;
      createBulletMesh(payload);
    }
  });

  channel.on('broadcast', { event: 'hit' }, ({ payload }) => {
    if (payload.targetId === myId) {
      if (activePowerups.shield) {
        showKillMsg('SHIELD BLOCKED!', '#00aaff');
        if (sounds.powerup) sounds.powerup();
      } else {
        myHealth = Math.max(0, myHealth - 25);
        updateHealthBar();
        flashHit();
        if (sounds.hit) sounds.hit();
        if (myHealth <= 0 && !isDead) die(payload.shooterName);
      }
    }
    if (players[payload.targetId]) {
      players[payload.targetId].health = Math.max(0, (players[payload.targetId].health || 100) - 25);
    }
  });

  channel.on('broadcast', { event: 'kill' }, ({ payload }) => {
    if (payload.killerId === myId) {
      myKills++;
      document.getElementById('myKills').textContent = myKills;
      showKillMsg('ENEMY DESTROYED!', '#00ff88');
      if (sounds.explosion) sounds.explosion();
    }
    if (players[payload.killerId]) {
      players[payload.killerId].kills = (players[payload.killerId].kills || 0) + 1;
    }
    if (players[payload.targetId]) {
      players[payload.targetId].health = 100;
      players[payload.targetId].x = (Math.random() - 0.5) * 60;
      players[payload.targetId].z = (Math.random() - 0.5) * 60;
      syncTankMesh(payload.targetId);
    }
    updateLeaderboard();
  });

  channel.on('broadcast', { event: 'powerup_spawn' }, ({ payload }) => {
    powerups[payload.id] = payload;
    createPowerupMesh(payload.id, payload);
  });

  channel.on('broadcast', { event: 'powerup_collect' }, ({ payload }) => {
    if (window.powerupMeshes && window.powerupMeshes[payload.id]) {
      scene.remove(window.powerupMeshes[payload.id]);
      delete window.powerupMeshes[payload.id];
    }
    delete powerups[payload.id];
  });

  // Subscribe
  await channel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      // Track my presence
      await channel.track({
        id: myId,
        name: myName,
        x: (Math.random() - 0.5) * 60,
        z: (Math.random() - 0.5) * 60,
        ry: 0,
        ty: 0,
        health: 100,
        kills: 0,
        color: `hsl(${Math.random() * 360}, 70%, 50%)`
      });

      startGame();
    }
  });
});

function startGame() {
  document.getElementById('lobby').style.display = 'none';
  document.getElementById('hud').classList.add('active');

  initThree();
  initSounds();

  // Create my tank
  if (players[myId]) {
    createTankMesh(myId, players[myId].color);
    myTank = tankMeshes[myId];
    
    // Add shield mesh
    if (myTank) {
      const shieldGeo = new THREE.SphereGeometry(3, 16, 16);
      const shieldMat = new THREE.MeshBasicMaterial({
        color: 0x00aaff,
        transparent: true,
        opacity: 0,
        wireframe: true
      });
      const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
      shieldMesh.position.y = 0.5;
      myTank.add(shieldMesh);
      myTank.userData.shield = shieldMesh;
    }
  }

  // Initialize minimap
  const minimapCanvas = document.getElementById('minimapCanvas');
  minimapCtx = minimapCanvas.getContext('2d');

  // Mobile controls
  if (isMobile) {
    document.getElementById('mobileControls').classList.add('active');
    setupMobileControls();
  }

  updateLeaderboard();
  updatePlayerCount();
  animate();
}

function initThree() {
  const canvas = document.getElementById('gameCanvas');

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = new THREE.FogExp2(0x87ceeb, 0.008);

  camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 500);

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;

  // Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const sunLight = new THREE.DirectionalLight(0xffffcc, 1.2);
  sunLight.position.set(50, 80, 50);
  sunLight.castShadow = true;
  sunLight.shadow.camera.left = -60;
  sunLight.shadow.camera.right = 60;
  sunLight.shadow.camera.top = 60;
  sunLight.shadow.camera.bottom = -60;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  scene.add(sunLight);

  const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x228b22, 0.4);
  scene.add(hemiLight);

  // Ground
  const groundGeometry = new THREE.PlaneGeometry(200, 200, 50, 50);
  const groundMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x4a7c59,
    roughness: 0.9,
    metalness: 0.1
  });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const gridHelper = new THREE.GridHelper(100, 40, 0x2d5a3d, 0x1a3d2a);
  gridHelper.position.y = 0.01;
  scene.add(gridHelper);

  // Walls
  const wallMat = new THREE.MeshStandardMaterial({ 
    color: 0x8b4513,
    roughness: 0.8,
    metalness: 0.2
  });
  [
    [0, 2, -50, 100, 4, 2],
    [0, 2, 50, 100, 4, 2],
    [-50, 2, 0, 2, 4, 100],
    [50, 2, 0, 2, 4, 100]
  ].forEach(([x, y, z, w, h, d]) => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    wall.position.set(x, y, z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    scene.add(wall);
  });

  // Obstacles
  const obstacleMat = new THREE.MeshStandardMaterial({ 
    color: 0x696969,
    roughness: 0.9,
    metalness: 0.1
  });
  const obstaclePositions = [
    [15, 1.5, 15], [-15, 1.5, 15], [15, 1.5, -15], [-15, 1.5, -15],
    [0, 2, 25], [0, 2, -25], [25, 2, 0], [-25, 2, 0],
    [10, 1, 10], [-10, 1, -10], [20, 1.5, -20], [-20, 1.5, 20]
  ];
  obstaclePositions.forEach(([x, y, z]) => {
    const size = 2 + Math.random() * 2;
    const height = y * 2 + Math.random() * 1;
    const obs = new THREE.Mesh(
      new THREE.BoxGeometry(size, height, size),
      obstacleMat
    );
    obs.position.set(x, y, z);
    obs.rotation.y = Math.random() * Math.PI;
    obs.castShadow = true;
    obs.receiveShadow = true;
    scene.add(obs);
  });

  window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
}

function createTankMesh(id, color) {
  if (tankMeshes[id]) return;

  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ 
    color, 
    metalness: 0.6,
    roughness: 0.4,
    emissive: color,
    emissiveIntensity: 0.1
  });

  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.9, 3.2), mat);
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  const trackMat = new THREE.MeshStandardMaterial({ 
    color: 0x222222, 
    roughness: 1,
    metalness: 0.3
  });
  [-1.2, 1.2].forEach(xOff => {
    const track = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 3.4), trackMat);
    track.position.set(xOff, -0.2, 0);
    track.castShadow = true;
    g.add(track);
  });

  const turretGroup = new THREE.Group();
  turretGroup.position.y = 0.7;

  const turretMat = new THREE.MeshStandardMaterial({ 
    color, 
    metalness: 0.7,
    roughness: 0.3,
    emissive: color,
    emissiveIntensity: 0.15
  });
  
  const turret = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.65, 0.7, 8),
    turretMat
  );
  turret.castShadow = true;
  turretGroup.add(turret);

  const barrelMat = new THREE.MeshStandardMaterial({ 
    color: 0x333333, 
    metalness: 0.9, 
    roughness: 0.2
  });
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.18, 2.2, 8),
    barrelMat
  );
  barrel.rotation.z = Math.PI / 2;
  barrel.position.set(1.3, 0, 0);
  barrel.castShadow = true;
  turretGroup.add(barrel);
  turretGroup.userData.barrelOffset = -Math.PI / 2;

  g.add(turretGroup);
  g.userData.turretGroup = turretGroup;
  g.userData.playerId = id;

  g.position.y = 0.6;
  scene.add(g);
  tankMeshes[id] = g;
}

function syncTankMesh(id) {
  const p = players[id];
  const mesh = tankMeshes[id];
  if (!p || !mesh) return;

  mesh.position.x = p.x;
  mesh.position.z = p.z;
  mesh.rotation.y = p.ry || 0;
  
  if (mesh.userData.turretGroup) {
    const relativeAngle = (p.ty || 0) - (p.ry || 0);
    const barrelOffset = mesh.userData.turretGroup.userData.barrelOffset || 0;
    mesh.userData.turretGroup.rotation.y = relativeAngle + barrelOffset;
  }
}

function createBulletMesh(bullet) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0xffff00, emissiveIntensity: 2 })
  );
  mesh.position.set(bullet.x, bullet.y, bullet.z);
  scene.add(mesh);
  bulletMeshes[bullet.id] = mesh;

  setTimeout(() => {
    if (bulletMeshes[bullet.id]) {
      scene.remove(bulletMeshes[bullet.id]);
      delete bulletMeshes[bullet.id];
    }
    delete bullets[bullet.id];
  }, 4000);
}

const POWERUP_TYPES = {
  HEALTH: { color: 0x00ff00, size: 0.8 },
  SHIELD: { color: 0x00aaff, size: 0.8 },
  RAPID_FIRE: { color: 0xffaa00, size: 0.8 },
  SPEED: { color: 0xff00ff, size: 0.8 }
};

function createPowerupMesh(id, powerup) {
  if (!scene) return;
  
  const config = POWERUP_TYPES[powerup.type];
  const geometry = new THREE.BoxGeometry(config.size, config.size, config.size);
  const material = new THREE.MeshStandardMaterial({
    color: config.color,
    emissive: config.color,
    emissiveIntensity: 0.5,
    metalness: 0.3,
    roughness: 0.7
  });
  
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(powerup.x, powerup.y, powerup.z);
  scene.add(mesh);
  
  if (!window.powerupMeshes) window.powerupMeshes = {};
  window.powerupMeshes[id] = mesh;
}

function updatePowerups() {
  if (!window.powerupMeshes) return;
  
  Object.keys(window.powerupMeshes).forEach(id => {
    const mesh = window.powerupMeshes[id];
    mesh.rotation.y += 0.02;
    mesh.position.y = 1 + Math.sin(Date.now() * 0.003 + id.length) * 0.3;
  });
}

function checkPowerupCollection() {
  if (!myTank || !players[myId]) return;
  
  const p = players[myId];
  
  Object.keys(powerups).forEach(id => {
    const powerup = powerups[id];
    const dx = p.x - powerup.x;
    const dz = p.z - powerup.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    
    if (dist < 3) {
      collectPowerup(id, powerup.type);
    }
  });
}

function collectPowerup(id, type) {
  if (sounds.powerup) sounds.powerup();
  
  if (window.powerupMeshes && window.powerupMeshes[id]) {
    scene.remove(window.powerupMeshes[id]);
    delete window.powerupMeshes[id];
  }
  
  delete powerups[id];
  
  channel.send({
    type: 'broadcast',
    event: 'powerup_collect',
    payload: { id, playerId: myId }
  });
  
  switch (type) {
    case 'HEALTH':
      myHealth = Math.min(100, myHealth + 50);
      updateHealthBar();
      showKillMsg('+50 HP', '#00ff00');
      break;
    case 'SHIELD':
      activePowerups.shield = true;
      showKillMsg('SHIELD ACTIVE!', '#00aaff');
      setTimeout(() => { activePowerups.shield = false; }, 10000);
      break;
    case 'RAPID_FIRE':
      activePowerups.rapidFire = true;
      showKillMsg('RAPID FIRE!', '#ffaa00');
      setTimeout(() => { activePowerups.rapidFire = false; }, 8000);
      break;
    case 'SPEED':
      activePowerups.speedBoost = true;
      showKillMsg('SPEED BOOST!', '#ff00ff');
      setTimeout(() => { activePowerups.speedBoost = false; }, 7000);
      break;
  }
}

function spawnPowerup() {
  const types = Object.keys(POWERUP_TYPES);
  const type = types[Math.floor(Math.random() * types.length)];
  
  const id = 'powerup_' + (powerupCounter++);
  const powerup = {
    id,
    type,
    x: (Math.random() - 0.5) * 80,
    z: (Math.random() - 0.5) * 80,
    y: 1
  };
  
  powerups[id] = powerup;
  createPowerupMesh(id, powerup);
  
  channel.send({
    type: 'broadcast',
    event: 'powerup_spawn',
    payload: powerup
  });
}

let lastBroadcast = 0;

function animate() {
  requestAnimationFrame(animate);

  const now = Date.now();
  const delta = now - lastFrameTime;
  lastFrameTime = now;
  fps = Math.round(1000 / delta);

  // Update particles
  particles = particles.filter(p => {
    const alive = p.update();
    if (!alive) p.destroy();
    return alive;
  });

  // Update shield visual
  if (myTank && myTank.userData.shield) {
    const shield = myTank.userData.shield;
    if (activePowerups.shield) {
      shield.material.opacity = 0.3 + Math.sin(now * 0.01) * 0.1;
      shield.rotation.y += 0.02;
    } else {
      shield.material.opacity = 0;
    }
  }

  updatePowerups();

  if (!myTank || isDead) {
    renderer.render(scene, camera);
    return;
  }

  const p = players[myId];
  if (!p) return;

  const speedMultiplier = activePowerups.speedBoost ? 1.5 : 1;
  const speed = 0.18 * speedMultiplier;
  const rotSpeed = 0.045;
  let moved = false;

  if (keys['w'] || keys['arrowup'])    { p.x += Math.sin(p.ry) * speed; p.z += Math.cos(p.ry) * speed; moved = true; }
  if (keys['s'] || keys['arrowdown'])  { p.x -= Math.sin(p.ry) * speed; p.z -= Math.cos(p.ry) * speed; moved = true; }
  if (keys['a'] || keys['arrowleft'])  { p.ry += rotSpeed; moved = true; }
  if (keys['d'] || keys['arrowright']) { p.ry -= rotSpeed; moved = true; }

  p.x = Math.max(-48, Math.min(48, p.x));
  p.z = Math.max(-48, Math.min(48, p.z));

  // Turret aiming
  if (!isMobile || !aimJoystickActive) {
    const raycaster = new THREE.Raycaster();
    const mouseVector = new THREE.Vector2(mouseX, mouseY);
    raycaster.setFromCamera(mouseVector, camera);
    
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersectPoint = new THREE.Vector3();
    const didIntersect = raycaster.ray.intersectPlane(groundPlane, intersectPoint);
    
    if (didIntersect) {
      const dx = intersectPoint.x - p.x;
      const dz = intersectPoint.z - p.z;
      p.ty = Math.atan2(dx, dz);
    } else {
      p.ty = p.ry;
    }
  }

  syncTankMesh(myId);

  // Camera follow
  if (viewMode === 1) {
    const turretAngle = p.ty;
    camera.position.x = p.x + Math.sin(turretAngle) * 0.5;
    camera.position.y = 2.5;
    camera.position.z = p.z + Math.cos(turretAngle) * 0.5;
    camera.lookAt(
      p.x + Math.sin(turretAngle) * 50,
      2,
      p.z + Math.cos(turretAngle) * 50
    );
  } else {
    const angleAroundTank = p.ry + cameraAngleOffset;
    camera.position.x = p.x - Math.sin(angleAroundTank) * cameraDistance;
    camera.position.y = cameraHeight;
    camera.position.z = p.z - Math.cos(angleAroundTank) * cameraDistance;
    camera.lookAt(p.x, 1, p.z);
  }

  // Update bullets
  Object.keys(bullets).forEach(bid => {
    const b = bullets[bid];
    b.x += b.vx;
    b.z += b.vz;
    if (bulletMeshes[bid]) {
      bulletMeshes[bid].position.set(b.x, b.y, b.z);
    }

    // Check hits
    Object.keys(players).forEach(pid => {
      if (pid === b.owner || pid === myId) return;
      const tp = players[pid];
      const dx = b.x - tp.x, dz = b.z - tp.z;
      if (Math.sqrt(dx * dx + dz * dz) < 2.2) {
        channel.send({
          type: 'broadcast',
          event: 'hit',
          payload: { targetId: pid, shooterId: myId, shooterName: myName }
        });
        if (bulletMeshes[bid]) { scene.remove(bulletMeshes[bid]); delete bulletMeshes[bid]; }
        delete bullets[bid];

        const newHp = (players[pid].health || 100) - 25;
        if (newHp <= 0) {
          channel.send({
            type: 'broadcast',
            event: 'kill',
            payload: { killerId: myId, targetId: pid, killerName: myName }
          });
        }
      }
    });

    // Check my tank hit
    if (b.owner !== myId) {
      const dx = b.x - p.x, dz = b.z - p.z;
      if (Math.sqrt(dx * dx + dz * dz) < 2.2) {
        myHealth = Math.max(0, myHealth - 25);
        updateHealthBar();
        flashHit();
        if (bulletMeshes[bid]) { scene.remove(bulletMeshes[bid]); delete bulletMeshes[bid]; }
        delete bullets[bid];
        if (myHealth <= 0 && !isDead) die(b.ownerName || '???');
      }
    }
  });

  checkPowerupCollection();

  // Broadcast position
  const now2 = Date.now();
  if (moved && now2 - lastBroadcast > 50) {
    lastBroadcast = now2;
    channel.send({
      type: 'broadcast',
      event: 'move',
      payload: { id: myId, x: p.x, z: p.z, ry: p.ry, ty: p.ty }
    });
    
    // Update presence
    channel.track({
      id: myId,
      name: myName,
      x: p.x,
      z: p.z,
      ry: p.ry,
      ty: p.ty,
      health: myHealth,
      kills: myKills,
      color: players[myId].color
    });
  }

  // Spawn powerups (randomly)
  if (Math.random() < 0.001 && Object.keys(powerups).length < 5) {
    spawnPowerup();
  }

  // Sync other players meshes
  Object.keys(players).forEach(id => {
    if (id !== myId && !tankMeshes[id] && scene) {
      createTankMesh(id, players[id].color);
    }
    if (id !== myId) {
      syncTankMesh(id);
    }
  });

  renderMinimap();

  const fpsEl = document.getElementById('fpsCounter');
  if (fpsEl) fpsEl.textContent = fps;

  renderer.render(scene, camera);
}

function renderMinimap() {
  if (!minimapCtx || !myTank || !players[myId]) return;

  const ctx = minimapCtx;
  const size = 200;
  const mapSize = 100;
  const scale = size / mapSize;

  ctx.fillStyle = 'rgba(0, 10, 5, 0.8)';
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = '#00ff88';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, size - 2, size - 2);

  ctx.strokeStyle = 'rgba(0, 255, 136, 0.2)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const pos = (size / 4) * i;
    ctx.beginPath();
    ctx.moveTo(pos, 0);
    ctx.lineTo(pos, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, pos);
    ctx.lineTo(size, pos);
    ctx.stroke();
  }

  function toMinimap(x, z) {
    return {
      x: (x + 50) * scale,
      y: (z + 50) * scale
    };
  }

  Object.keys(players).forEach(id => {
    const p = players[id];
    const pos = toMinimap(p.x, p.z);
    const isMe = id === myId;

    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(p.ry);

    ctx.fillStyle = isMe ? '#00ff88' : p.color;
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(-4, 4);
    ctx.lineTo(4, 4);
    ctx.closePath();
    ctx.fill();

    if (isMe) {
      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.restore();

    if (!isMe) {
      ctx.fillStyle = p.color;
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(p.name.substring(0, 8), pos.x, pos.y - 10);
    }
  });

  Object.keys(bullets).forEach(bid => {
    const b = bullets[bid];
    const pos = toMinimap(b.x, b.z);
    
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 2, 0, Math.PI * 2);
    ctx.fill();
  });

  const myPos = toMinimap(players[myId].x, players[myId].z);
  ctx.fillStyle = '#00ff88';
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('YOU', myPos.x, myPos.y + 16);
}

// Shooting
document.addEventListener('click', () => {
  if (isDead || !myTank || !players[myId]) return;
  const now = Date.now();
  
  const cooldown = activePowerups.rapidFire ? 200 : 500;
  if (now - lastShotTime < cooldown) return;
  lastShotTime = now;

  if (sounds.shoot) sounds.shoot();

  const p = players[myId];
  const angle = p.ty;
  const speed = 0.7;
  const bid = myId + '_' + (bulletCounter++);

  const bullet = {
    id: bid,
    owner: myId,
    ownerName: myName,
    x: p.x + Math.sin(angle) * 2.5,
    y: 1.2,
    z: p.z + Math.cos(angle) * 2.5,
    vx: Math.sin(angle) * speed,
    vz: Math.cos(angle) * speed
  };

  bullets[bid] = bullet;
  createBulletMesh(bullet);
  
  channel.send({
    type: 'broadcast',
    event: 'bullet',
    payload: bullet
  });
  
  createExplosion(bullet.x, bullet.y, bullet.z);
});

// Input
document.addEventListener('keydown', e => { 
  keys[e.key.toLowerCase()] = true;
  
  if (e.key.toLowerCase() === 'v') {
    viewMode = (viewMode + 1) % 4;
    if (viewMode === 0) {
      cameraDistance = 18;
      cameraHeight = 12;
      cameraAngleOffset = 0;
    } else if (viewMode === 1) {
      cameraDistance = 0;
      cameraHeight = 2;
      cameraAngleOffset = 0;
    } else if (viewMode === 2) {
      cameraDistance = 5;
      cameraHeight = 35;
      cameraAngleOffset = 0;
    } else if (viewMode === 3) {
      cameraDistance = 22;
      cameraHeight = 10;
      cameraAngleOffset = Math.PI / 2;
    }
  }
});

document.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

document.addEventListener('mousemove', e => {
  mouseX = (e.clientX / innerWidth)  * 2 - 1;
  mouseY = -(e.clientY / innerHeight) * 2 + 1;

  if (isDraggingCamera) {
    const deltaX = e.clientX - lastMouseX;
    cameraAngleOffset += deltaX * 0.005;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  }
});

document.addEventListener('mousedown', e => {
  if (e.button === 2) {
    isDraggingCamera = true;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    e.preventDefault();
  }
});

document.addEventListener('mouseup', e => {
  if (e.button === 2) {
    isDraggingCamera = false;
  }
});

document.addEventListener('contextmenu', e => e.preventDefault());

document.addEventListener('wheel', e => {
  e.preventDefault();
  cameraDistance += e.deltaY * 0.02;
  cameraDistance = Math.max(5, Math.min(40, cameraDistance));
}, { passive: false });

// Mobile controls
function setupMobileControls() {
  const moveJoystick = document.getElementById('moveJoystick');
  const moveStick = document.getElementById('moveStick');
  const aimJoystick = document.getElementById('aimJoystick');
  const aimStick = document.getElementById('aimStick');
  const fireBtn = document.getElementById('fireButton');
  const viewBtn = document.getElementById('mobileViewBtn');

  moveJoystick.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = moveJoystick.getBoundingClientRect();
    joystickCenter = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
    joystickActive = true;
    joystickTouch = touch.identifier;
  });

  moveJoystick.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!joystickActive) return;
    
    const touch = Array.from(e.touches).find(t => t.identifier === joystickTouch);
    if (!touch) return;

    const dx = touch.clientX - joystickCenter.x;
    const dy = touch.clientY - joystickCenter.y;
    const distance = Math.min(Math.sqrt(dx * dx + dy * dy), 40);
    const angle = Math.atan2(dx, -dy);

    moveStick.style.transform = `translate(-50%, -50%) translate(${Math.sin(angle) * distance}px, ${-Math.cos(angle) * distance}px)`;

    if (distance > 10) {
      const forward = -Math.cos(angle) * (distance / 40);
      const turn = Math.sin(angle) * (distance / 40);

      keys['w'] = forward > 0.3;
      keys['s'] = forward < -0.3;
      keys['a'] = turn < -0.3;
      keys['d'] = turn > 0.3;
    } else {
      keys['w'] = keys['s'] = keys['a'] = keys['d'] = false;
    }
  });

  moveJoystick.addEventListener('touchend', (e) => {
    e.preventDefault();
    joystickActive = false;
    moveStick.style.transform = 'translate(-50%, -50%)';
    keys['w'] = keys['s'] = keys['a'] = keys['d'] = false;
  });

  aimJoystick.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = aimJoystick.getBoundingClientRect();
    aimJoystickCenter = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
    aimJoystickActive = true;
    aimJoystickTouch = touch.identifier;
  });

  aimJoystick.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!aimJoystickActive) return;
    
    const touch = Array.from(e.touches).find(t => t.identifier === aimJoystickTouch);
    if (!touch) return;

    const dx = touch.clientX - aimJoystickCenter.x;
    const dy = touch.clientY - aimJoystickCenter.y;
    const distance = Math.min(Math.sqrt(dx * dx + dy * dy), 40);
    const angle = Math.atan2(dx, -dy);

    aimStick.style.transform = `translate(-50%, -50%) translate(${Math.sin(angle) * distance}px, ${-Math.cos(angle) * distance}px)`;

    if (distance > 5 && myTank && players[myId]) {
      const p = players[myId];
      p.ty = p.ry + angle;
    }
  });

  aimJoystick.addEventListener('touchend', (e) => {
    e.preventDefault();
    aimJoystickActive = false;
    aimStick.style.transform = 'translate(-50%, -50%)';
  });

  fireBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (!isDead && myTank && players[myId]) {
      const now = Date.now();
      if (now - lastShotTime < 500) return;
      lastShotTime = now;

      const p = players[myId];
      const angle = p.ty;
      const speed = 0.7;
      const bid = myId + '_' + (bulletCounter++);

      const bullet = {
        id: bid,
        owner: myId,
        ownerName: myName,
        x: p.x + Math.sin(angle) * 2.5,
        y: 1.2,
        z: p.z + Math.cos(angle) * 2.5,
        vx: Math.sin(angle) * speed,
        vz: Math.cos(angle) * speed
      };

      bullets[bid] = bullet;
      createBulletMesh(bullet);
      
      channel.send({
        type: 'broadcast',
        event: 'bullet',
        payload: bullet
      });
    }
  });

  viewBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    viewMode = (viewMode + 1) % 4;
    if (viewMode === 0) {
      cameraDistance = 18;
      cameraHeight = 12;
      cameraAngleOffset = 0;
    } else if (viewMode === 1) {
      cameraDistance = 0;
      cameraHeight = 2;
      cameraAngleOffset = 0;
    } else if (viewMode === 2) {
      cameraDistance = 5;
      cameraHeight = 35;
      cameraAngleOffset = 0;
    } else if (viewMode === 3) {
      cameraDistance = 22;
      cameraHeight = 10;
      cameraAngleOffset = Math.PI / 2;
    }
  });

  document.body.addEventListener('touchmove', (e) => {
    if (e.target.closest('.mobile-controls')) {
      e.preventDefault();
    }
  }, { passive: false });
}

// HUD helpers
function updateHealthBar() {
  document.getElementById('healthBarInner').style.width = myHealth + '%';
}

function flashHit() {
  const el = document.getElementById('hitFlash');
  el.classList.add('flash');
  setTimeout(() => el.classList.remove('flash'), 150);
}

function showKillMsg(msg, color) {
  const feed = document.getElementById('killFeed');
  const el = document.createElement('span');
  el.className = 'kill-msg';
  el.style.color = color;
  el.style.textShadow = `0 0 20px ${color}`;
  el.textContent = msg;
  feed.appendChild(el);
  setTimeout(() => feed.removeChild(el), 1500);
}

function die(killerName) {
  isDead = true;
  document.getElementById('respawnOverlay').classList.add('show');
  showKillMsg('YOU WERE DESTROYED!', '#ff2244');
  
  if (sounds.explosion) sounds.explosion();
  if (myTank) {
    createExplosion(myTank.position.x, myTank.position.y + 1, myTank.position.z);
  }

  let count = 3;
  document.getElementById('respawnTimer').textContent = count;

  const interval = setInterval(() => {
    count--;
    document.getElementById('respawnTimer').textContent = count;
    if (count <= 0) {
      clearInterval(interval);
      respawn();
    }
  }, 1000);
}

function respawn() {
  isDead = false;
  myHealth = 100;
  updateHealthBar();
  document.getElementById('respawnOverlay').classList.remove('show');

  if (players[myId]) {
    players[myId].x = (Math.random() - 0.5) * 60;
    players[myId].z = (Math.random() - 0.5) * 60;
    players[myId].health = 100;
    syncTankMesh(myId);
    
    channel.track({
      id: myId,
      name: myName,
      x: players[myId].x,
      z: players[myId].z,
      ry: players[myId].ry,
      ty: players[myId].ty,
      health: 100,
      kills: myKills,
      color: players[myId].color
    });
  }
}

function updateLeaderboard() {
  const sorted = Object.entries(players)
    .sort(([, a], [, b]) => (b.kills || 0) - (a.kills || 0))
    .slice(0, 6);

  document.getElementById('leaderboardList').innerHTML = sorted.map(([id, p], i) => `
    <div class="lb-row ${id === myId ? 'me' : ''}">
      <span>${i + 1}. ${p.name || 'Tank'}</span>
      <span class="lb-kills">${p.kills || 0}</span>
    </div>
  `).join('');
}

function updatePlayerCount() {
  document.getElementById('playerCount').textContent = Object.keys(players).length;
}
