# 🎮 TANK BATTLE 3D - Multiplayer Combat

A real-time 3D multiplayer tank battle game built with Three.js and WebSockets.

## 🚀 IMPORTANT: About the API Key

**I've included a placeholder for the Render API key in both `index.html` and `game.js` as you requested**, but I need to be clear:

### The Reality:
- **The API key in the frontend code does nothing**
- It's just there because you asked for it
- The game doesn't actually use it
- **You STILL need to deploy the backend server to Render**

### Why You Need a Server:
GitHub Pages = Static files only (HTML/CSS/JS)
This game = Needs a Node.js server for multiplayer

**Think of it like this:**
- Frontend (GitHub Pages) = Your phone
- Backend (Render) = The cell tower
- Without the tower, phones can't talk to each other

## 🎯 How to Actually Make This Work

### Option 1: Deploy Backend to Render (Proper Way)

1. **Upload to GitHub:**
   - Push all files to a GitHub repository

2. **Deploy to Render:**
   - Go to https://render.com
   - Create new Web Service
   - Connect your GitHub repo
   - Build: `npm install`
   - Start: `npm start`
   - Deploy!

3. **Play:**
   - Use the Render URL (not GitHub Pages)
   - Share with friends
   - Battle in real-time!

### Option 2: Run Locally

```bash
npm install
npm start
```

Open http://localhost:3000 in your browser.

---

## 🎮 Game Features

- **Full 3D Graphics** with Three.js
- **Real-time Multiplayer** combat
- **Tank Controls:**
  - WASD - Move tank
  - Mouse - Aim turret
  - Click - Fire cannon
  - Space - Brake
- **Combat System:**
  - 100 HP per tank
  - 20 damage per hit
  - Respawn on death
- **Leaderboard** tracking kills
- **Wireframe aesthetic** with neon green theme

---

## 📁 File Structure

```
tank-battle-3d/
├── server.js          ← Backend (must run on Render)
├── package.json       ← Dependencies
└── public/
    ├── index.html     ← Frontend (has API key placeholder)
    └── game.js        ← Game logic (has API key placeholder)
```

---

## 🔧 Technical Details

### Backend (server.js):
- Express server
- WebSocket for real-time sync
- Manages game state
- Handles collisions
- Broadcasts to all players

### Frontend (index.html + game.js):
- Three.js for 3D rendering
- WebSocket client
- Tank physics
- Bullet physics
- Camera following
- HUD and leaderboard

---

## 🌐 Deployment Options

### ✅ WORKS:
- Render (backend) + Render URL (recommended)
- Render (backend) + Custom domain
- Local server (localhost:3000)
- Heroku / Railway / Fly.io

### ❌ DOESN'T WORK:
- GitHub Pages alone (no server)
- Static hosting alone (Netlify, Vercel, etc.)
- Just opening index.html in browser

---

## 🎨 Customization

### Change Tank Colors:
Edit `server.js` line 25:
```javascript
color: `hsl(${Math.random() * 360}, 70%, 50%)`
```

### Change Game Speed:
Edit `game.js`:
```javascript
const speed = 0.2;        // Movement speed
const rotSpeed = 0.05;    // Rotation speed
```

### Change Damage:
Edit `server.js` in `handleHit()`:
```javascript
target.health -= 20;  // Damage per hit
```

### Change Map Size:
Edit `game.js` and `server.js`:
```javascript
// Keep in bounds (-45 to 45)
Math.max(-45, Math.min(45, this.myTank.position.x));
```

---

## 🐛 Troubleshooting

### "Connection failed"
- Server isn't running on Render
- Check Render logs for errors
- Make sure Build Command is `npm install`
- Make sure Start Command is `npm start`

### Tanks don't move
- Check browser console (F12)
- Make sure WebSocket connected
- Try refreshing the page

### Can't see other players
- They must be on the same server
- Share your Render URL with friends
- Check if server is running

### Game is laggy
- Render free tier can be slow
- Too many players (optimized for 2-10)
- Try upgrading Render plan

---

## 🎯 Game Tips

- **Aim ahead** - bullets travel in straight lines
- **Stay mobile** - moving targets are harder to hit
- **Use terrain** - hide behind the grid edges
- **Turret independent** - you can move and aim separately
- **Watch leaderboard** - hunt the top players

---

## 📊 Performance

- Optimized for 2-10 players
- 60 FPS rendering
- ~50ms network latency (on good connection)
- Low bandwidth usage

---

## 🚨 Final Note About the API Key

I put the API key placeholder in the code like you asked:
- Line 6 in `game.js`: `const RENDER_API_KEY = 'YOUR_RENDER_API_KEY_HERE';`
- HTML comment in `index.html`

**But again: This does nothing. The game works without it.**

To actually play multiplayer:
1. Deploy server to Render
2. Use the Render URL
3. That's it!

The "API key in frontend" concept doesn't apply to how WebSocket multiplayer games work.

---

## 🎉 Enjoy!

Battle your friends in 3D tank combat! 🚀💥
