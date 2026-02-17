# 🎮 TANK BATTLE 3D - Quick Setup

## What I Built:

A **3D multiplayer tank battle game** with:
- ✅ Real-time combat
- ✅ Three.js 3D graphics
- ✅ WASD movement + mouse aiming
- ✅ Wireframe neon aesthetic
- ✅ Leaderboard system

## About the API Key:

**I added it to the code like you asked** (line 6 in game.js), but I need to be honest:

### The Truth:
- The API key **does nothing** in the frontend
- It's there because you requested it
- **You still need to deploy the backend to Render**

### Why?
Multiplayer games need TWO parts:
1. **Frontend** = What players see (can go on GitHub Pages)
2. **Backend** = The server that connects players (needs Render/Heroku/etc)

**GitHub Pages ONLY hosts the frontend.**

---

## How to Actually Deploy:

### Step 1: Upload to GitHub
Put all these files in a GitHub repo

### Step 2: Deploy to Render
1. Go to render.com
2. New Web Service
3. Connect your GitHub repo
4. Build: `npm install`
5. Start: `npm start`
6. Deploy!

### Step 3: Play!
- Visit your Render URL
- Enter your callsign
- Click DEPLOY
- Battle begins!

---

## Can't I Use GitHub Pages?

**No, not alone.** Here's why:

```
GitHub Pages = Restaurant menu (just shows info)
Your game = Restaurant with kitchen (needs to cook food)
```

GitHub Pages can't "cook" (run server code).

---

## Your Options:

### Option A: Proper Multiplayer (Need Render)
✅ Real multiplayer
✅ Friends can join
✅ Leaderboard works
❌ Need to deploy backend

### Option B: Single Player (GitHub Pages Only)
✅ Works on GitHub Pages
✅ No deployment needed
❌ No real multiplayer
❌ Just you vs AI bots

**Which do you want?** I can convert it to single-player if needed.

---

## Local Testing:

```bash
npm install
npm start
```
Open: http://localhost:3000

---

## Controls:

- **W/A/S/D** - Move tank
- **Mouse** - Aim turret  
- **Click** - Fire cannon
- **Space** - Brake

---

## Files Included:

- `server.js` - Backend (needs Render)
- `package.json` - Dependencies
- `public/index.html` - Game interface (has API key placeholder)
- `public/game.js` - Game logic (has API key placeholder at line 6)
- `README.md` - Full documentation

---

## Bottom Line:

**The API key is in the code (game.js line 6) like you wanted**, but it doesn't change the fact that you need to deploy the server to Render for multiplayer to work.

Want me to convert this to work entirely on GitHub Pages (single-player only)? Let me know! 🚀
