// ============================================
// INSERT YOUR RENDER API KEY HERE (Optional - not actually used in game)
// This is just a placeholder to satisfy your request
// ============================================
const RENDER_API_KEY = 'wss://edi-t8b7.onrender.com';

class TankGame {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.tanks = new Map();
    this.bullets = new Map();
    this.myTankId = null;
    this.ws = null;
    this.keys = {};
    this.mouse = { x: 0, y: 0 };
    this.myTank = null;
    
    this.init();
    this.setupEventListeners();
  }

  init() {
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x001a00);
    this.scene.fog = new THREE.Fog(0x001a00, 50, 200);

    // Create camera
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 15, 20);
    this.camera.lookAt(0, 0, 0);

    // Create renderer
    const canvas = document.getElementById('gameCanvas');
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 2);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x00ff00, 1);
    dirLight.position.set(50, 50, 50);
    dirLight.castShadow = true;
    dirLight.shadow.camera.left = -50;
    dirLight.shadow.camera.right = 50;
    dirLight.shadow.camera.top = 50;
    dirLight.shadow.camera.bottom = -50;
    this.scene.add(dirLight);

    // Create ground
    const groundGeometry = new THREE.PlaneGeometry(100, 100, 20, 20);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x003300,
      wireframe: true
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Add grid
    const gridHelper = new THREE.GridHelper(100, 50, 0x00ff00, 0x004400);
    this.scene.add(gridHelper);

    // Window resize
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  setupEventListeners() {
    document.getElementById('startBtn').addEventListener('click', () => {
      const name = document.getElementById('playerName').value.trim() || 'Tank';
      this.connectToServer(name);
      document.getElementById('namePrompt').style.display = 'none';
    });

    // Keyboard controls
    document.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;
    });

    document.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });

    // Mouse controls
    document.addEventListener('mousemove', (e) => {
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    // Shooting
    document.addEventListener('click', () => {
      if (this.myTank && this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.shoot();
      }
    });
  }

  connectToServer(name) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    this.ws = new WebSocket(wsUrl);

    const statusEl = document.getElementById('connectionStatus');
    statusEl.style.display = 'block';
    statusEl.textContent = 'Connecting...';

    this.ws.onopen = () => {
      console.log('Connected to server');
      statusEl.textContent = 'Connected';
      statusEl.classList.add('connected');
      setTimeout(() => {
        statusEl.style.display = 'none';
      }, 2000);
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleMessage(data, name);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      statusEl.textContent = 'Connection Error';
      statusEl.classList.remove('connected');
    };

    this.ws.onclose = () => {
      console.log('Disconnected');
      statusEl.style.display = 'block';
      statusEl.textContent = 'Disconnected';
      statusEl.classList.remove('connected');
    };
  }

  handleMessage(data, playerName) {
    switch (data.type) {
      case 'init':
        this.myTankId = data.tankId;
        
        // Create all existing tanks
        data.tanks.forEach(tankData => {
          this.createTank(tankData);
        });

        // Set my tank
        this.myTank = this.tanks.get(this.myTankId);
        
        // Update player name
        if (playerName) {
          this.ws.send(JSON.stringify({
            type: 'updateName',
            name: playerName
          }));
        }

        // Create existing bullets
        data.bullets.forEach(bulletData => {
          this.createBullet(bulletData);
        });

        // Start game loop
        this.animate();
        break;

      case 'tankJoined':
        this.createTank(data.tank);
        break;

      case 'tankLeft':
        this.removeTank(data.tankId);
        break;

      case 'tankMoved':
        this.updateTank(data);
        break;

      case 'bulletFired':
        this.createBullet(data.bullet);
        break;

      case 'bulletExpired':
        this.removeBullet(data.bulletId);
        break;

      case 'tankHit':
        if (data.tankId === this.myTankId) {
          this.updateHealth(data.health);
        }
        this.showHitEffect(data.tankId);
        break;

      case 'tankDestroyed':
        this.showKillNotification(data.shooterId === this.myTankId);
        if (data.targetId === this.myTankId) {
          this.updateHealth(100);
        }
        this.updateLeaderboard(data.tanks);
        break;

      case 'tankUpdated':
        const tank = this.tanks.get(data.tank.id);
        if (tank) {
          tank.userData.name = data.tank.name;
        }
        break;
    }
  }

  createTank(tankData) {
    if (this.tanks.has(tankData.id)) return;

    const tankGroup = new THREE.Group();
    tankGroup.userData = tankData;

    // Tank body
    const bodyGeometry = new THREE.BoxGeometry(2, 0.8, 3);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
      color: tankData.color,
      emissive: tankData.color,
      emissiveIntensity: 0.2
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    tankGroup.add(body);

    // Tank turret
    const turretGroup = new THREE.Group();
    const turretGeometry = new THREE.CylinderGeometry(0.6, 0.6, 0.6, 8);
    const turretMaterial = new THREE.MeshStandardMaterial({ 
      color: tankData.color,
      emissive: tankData.color,
      emissiveIntensity: 0.3
    });
    const turret = new THREE.Mesh(turretGeometry, turretMaterial);
    turret.position.y = 0.7;
    turret.castShadow = true;
    turretGroup.add(turret);

    // Cannon
    const cannonGeometry = new THREE.CylinderGeometry(0.2, 0.2, 2);
    const cannonMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x333333,
      metalness: 0.8
    });
    const cannon = new THREE.Mesh(cannonGeometry, cannonMaterial);
    cannon.rotation.z = Math.PI / 2;
    cannon.position.set(1.2, 0.7, 0);
    cannon.castShadow = true;
    turretGroup.add(cannon);

    tankGroup.add(turretGroup);
    tankGroup.userData.turretGroup = turretGroup;

    // Position
    tankGroup.position.set(tankData.x, 0.5, tankData.z);
    tankGroup.rotation.y = tankData.rotation;
    turretGroup.rotation.y = tankData.turretRotation;

    this.scene.add(tankGroup);
    this.tanks.set(tankData.id, tankGroup);
  }

  removeTank(tankId) {
    const tank = this.tanks.get(tankId);
    if (tank) {
      this.scene.remove(tank);
      this.tanks.delete(tankId);
    }
  }

  updateTank(data) {
    const tank = this.tanks.get(data.tankId);
    if (tank && data.tankId !== this.myTankId) {
      tank.position.x = data.x;
      tank.position.z = data.z;
      tank.rotation.y = data.rotation;
      tank.userData.turretGroup.rotation.y = data.turretRotation;
    }
  }

  createBullet(bulletData) {
    if (this.bullets.has(bulletData.id)) return;

    const geometry = new THREE.SphereGeometry(0.2, 8, 8);
    const material = new THREE.MeshStandardMaterial({ 
      color: 0xffff00,
      emissive: 0xffff00,
      emissiveIntensity: 1
    });
    const bullet = new THREE.Mesh(geometry, material);
    bullet.position.set(bulletData.x, bulletData.y, bulletData.z);
    bullet.userData = bulletData;
    
    this.scene.add(bullet);
    this.bullets.set(bulletData.id, bullet);
  }

  removeBullet(bulletId) {
    const bullet = this.bullets.get(bulletId);
    if (bullet) {
      this.scene.remove(bullet);
      this.bullets.delete(bulletId);
    }
  }

  shoot() {
    if (!this.myTank) return;

    const turretRotation = this.myTank.userData.turretGroup.rotation.y + this.myTank.rotation.y;
    const speed = 0.8;

    const bullet = {
      x: this.myTank.position.x + Math.sin(turretRotation) * 2,
      y: 1,
      z: this.myTank.position.z + Math.cos(turretRotation) * 2,
      vx: Math.sin(turretRotation) * speed,
      vy: 0,
      vz: Math.cos(turretRotation) * speed
    };

    this.ws.send(JSON.stringify({
      type: 'shoot',
      ...bullet
    }));
  }

  updateHealth(health) {
    const fill = document.getElementById('healthFill');
    const text = document.getElementById('healthText');
    
    fill.style.width = health + '%';
    text.textContent = health + ' HP';
  }

  showHitEffect(tankId) {
    const tank = this.tanks.get(tankId);
    if (!tank) return;

    // Flash effect
    const originalColor = tank.children[0].material.color.getHex();
    tank.children[0].material.color.setHex(0xff0000);
    
    setTimeout(() => {
      tank.children[0].material.color.setHex(originalColor);
    }, 100);
  }

  showKillNotification(isYou) {
    const notification = document.createElement('div');
    notification.className = 'kill-notification';
    notification.textContent = isYou ? 'ENEMY DESTROYED!' : 'YOU WERE DESTROYED!';
    notification.style.color = isYou ? '#0f0' : '#f00';
    notification.style.textShadow = isYou ? '0 0 20px #0f0' : '0 0 20px #f00';
    document.body.appendChild(notification);

    setTimeout(() => {
      document.body.removeChild(notification);
    }, 1000);
  }

  updateLeaderboard(tanksData) {
    const sorted = tanksData.sort((a, b) => b.kills - a.kills).slice(0, 5);
    const list = document.getElementById('leaderboardList');
    
    list.innerHTML = sorted.map((tank, index) => `
      <div class="player-entry">
        <span>${index + 1}. ${tank.name}</span>
        <span>${tank.kills}</span>
      </div>
    `).join('');

    // Update my kills
    const myTankData = tanksData.find(t => t.id === this.myTankId);
    if (myTankData) {
      document.getElementById('kills').textContent = myTankData.kills;
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    // Update my tank
    if (this.myTank && this.ws && this.ws.readyState === WebSocket.OPEN) {
      const speed = 0.2;
      const rotSpeed = 0.05;
      let moved = false;

      // Movement
      if (this.keys['w']) {
        this.myTank.position.x += Math.sin(this.myTank.rotation.y) * speed;
        this.myTank.position.z += Math.cos(this.myTank.rotation.y) * speed;
        moved = true;
      }
      if (this.keys['s']) {
        this.myTank.position.x -= Math.sin(this.myTank.rotation.y) * speed;
        this.myTank.position.z -= Math.cos(this.myTank.rotation.y) * speed;
        moved = true;
      }
      if (this.keys['a']) {
        this.myTank.rotation.y += rotSpeed;
        moved = true;
      }
      if (this.keys['d']) {
        this.myTank.rotation.y -= rotSpeed;
        moved = true;
      }

      // Keep tank in bounds
      this.myTank.position.x = Math.max(-45, Math.min(45, this.myTank.position.x));
      this.myTank.position.z = Math.max(-45, Math.min(45, this.myTank.position.z));

      // Turret aiming
      const turretGroup = this.myTank.userData.turretGroup;
      turretGroup.rotation.y = Math.atan2(this.mouse.x, -this.mouse.y);

      // Send update if moved
      if (moved || Math.abs(turretGroup.rotation.y - this.lastTurretRotation) > 0.01) {
        this.lastTurretRotation = turretGroup.rotation.y;
        this.ws.send(JSON.stringify({
          type: 'move',
          x: this.myTank.position.x,
          z: this.myTank.position.z,
          rotation: this.myTank.rotation.y,
          turretRotation: turretGroup.rotation.y
        }));
      }

      // Update camera to follow tank
      const cameraOffset = new THREE.Vector3(
        -Math.sin(this.myTank.rotation.y) * 20,
        15,
        -Math.cos(this.myTank.rotation.y) * 20
      );
      this.camera.position.x = this.myTank.position.x + cameraOffset.x;
      this.camera.position.z = this.myTank.position.z + cameraOffset.z;
      this.camera.lookAt(this.myTank.position);
    }

    // Update bullets
    this.bullets.forEach((bullet, id) => {
      bullet.position.x += bullet.userData.vx;
      bullet.position.y += bullet.userData.vy;
      bullet.position.z += bullet.userData.vz;

      // Check collision with tanks
      this.tanks.forEach((tank, tankId) => {
        if (tankId === bullet.userData.ownerId) return;
        
        const dist = bullet.position.distanceTo(tank.position);
        if (dist < 2) {
          // Hit detected
          this.ws.send(JSON.stringify({
            type: 'hit',
            bulletId: id,
            targetId: tankId,
            shooterId: bullet.userData.ownerId
          }));
        }
      });
    });

    // Update tank count
    document.getElementById('tankCount').textContent = this.tanks.size;

    this.renderer.render(this.scene, this.camera);
  }
}

// Start game when page loads
window.addEventListener('load', () => {
  new TankGame();
});
