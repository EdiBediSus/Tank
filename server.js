const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

// Game state
const tanks = new Map();
const bullets = new Map();
let bulletIdCounter = 0;

// Serve static files
app.use(express.static('public'));

// WebSocket connection handling
wss.on('connection', (ws) => {
  const tankId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
  
  console.log(`Tank ${tankId} connected`);
  
  // Initialize new tank
  tanks.set(tankId, {
    id: tankId,
    x: Math.random() * 80 - 40,
    z: Math.random() * 80 - 40,
    rotation: Math.random() * Math.PI * 2,
    turretRotation: 0,
    health: 100,
    kills: 0,
    name: `Tank ${Math.floor(Math.random() * 1000)}`,
    color: `hsl(${Math.random() * 360}, 70%, 50%)`
  });

  // Send initial state to new player
  ws.send(JSON.stringify({
    type: 'init',
    tankId: tankId,
    tanks: Array.from(tanks.values()),
    bullets: Array.from(bullets.values())
  }));

  // Broadcast new tank to all players
  broadcast({
    type: 'tankJoined',
    tank: tanks.get(tankId)
  }, ws);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'move':
          handleMove(tankId, data);
          break;
        case 'shoot':
          handleShoot(tankId, data);
          break;
        case 'updateName':
          handleUpdateName(tankId, data);
          break;
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  });

  ws.on('close', () => {
    console.log(`Tank ${tankId} disconnected`);
    tanks.delete(tankId);
    
    broadcast({
      type: 'tankLeft',
      tankId: tankId
    });
  });
});

function handleMove(tankId, data) {
  const tank = tanks.get(tankId);
  if (!tank) return;

  tank.x = data.x;
  tank.z = data.z;
  tank.rotation = data.rotation;
  tank.turretRotation = data.turretRotation;

  broadcast({
    type: 'tankMoved',
    tankId: tankId,
    x: tank.x,
    z: tank.z,
    rotation: tank.rotation,
    turretRotation: tank.turretRotation
  });
}

function handleShoot(tankId, data) {
  const tank = tanks.get(tankId);
  if (!tank) return;

  const bulletId = `bullet_${bulletIdCounter++}`;
  
  bullets.set(bulletId, {
    id: bulletId,
    ownerId: tankId,
    x: data.x,
    y: data.y,
    z: data.z,
    vx: data.vx,
    vy: data.vy,
    vz: data.vz,
    createdAt: Date.now()
  });

  broadcast({
    type: 'bulletFired',
    bullet: bullets.get(bulletId)
  });

  // Remove bullet after 5 seconds
  setTimeout(() => {
    bullets.delete(bulletId);
    broadcast({
      type: 'bulletExpired',
      bulletId: bulletId
    });
  }, 5000);
}

function handleUpdateName(tankId, data) {
  const tank = tanks.get(tankId);
  if (!tank) return;

  tank.name = data.name;
  
  broadcast({
    type: 'tankUpdated',
    tank: tank
  });
}

// Handle bullet hits (called from client)
wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'hit') {
        handleHit(data.bulletId, data.targetId, data.shooterId);
      }
    } catch (error) {
      // Already handled in main message handler
    }
  });
});

function handleHit(bulletId, targetId, shooterId) {
  const target = tanks.get(targetId);
  const shooter = tanks.get(shooterId);
  
  if (!target || !shooter) return;

  target.health -= 20;
  
  if (target.health <= 0) {
    target.health = 100;
    target.x = Math.random() * 80 - 40;
    target.z = Math.random() * 80 - 40;
    shooter.kills++;
    
    broadcast({
      type: 'tankDestroyed',
      targetId: targetId,
      shooterId: shooterId,
      tanks: Array.from(tanks.values())
    });
  } else {
    broadcast({
      type: 'tankHit',
      tankId: targetId,
      health: target.health
    });
  }

  bullets.delete(bulletId);
  broadcast({
    type: 'bulletExpired',
    bulletId: bulletId
  });
}

function broadcast(message, exclude = null) {
  const data = JSON.stringify(message);
  
  wss.clients.forEach(client => {
    if (client !== exclude && client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

// Game loop for cleanup
setInterval(() => {
  const now = Date.now();
  
  // Clean up old bullets
  bullets.forEach((bullet, id) => {
    if (now - bullet.createdAt > 5000) {
      bullets.delete(id);
    }
  });
}, 1000);

server.listen(PORT, () => {
  console.log(`Tank Battle server running on port ${PORT}`);
});
