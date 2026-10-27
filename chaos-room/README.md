# CHAOS ROOM 🎮🔥

The ultimate real-time multiplayer party game for 2–8 players. Friends join instantly on their phones or laptops with a 6-character room code and battle through 7 high-energy rounds of secret roles, bluffing, reflex taps, answer rankings, and hilarious chaos!

---

## ⚡ The Modern Stack

| Layer | Technology | Why It Excels |
| :--- | :--- | :--- |
| 🎨 **Frontend** | **React + TypeScript + Vite** | Fast, responsive, type-safe interactive game UI |
| 🎭 **Animations** | **Framer Motion** | Silky-smooth spring physics, card reveals, and transitions |
| ⚡ **Real-time** | **Node.js + Socket.IO + TypeScript** | Sub-millisecond multiplayer synchronization |
| 🧠 **Shared Types** | **TypeScript (`shared/types.ts`)** | End-to-end contract between server and client |
| 💾 **Database** | **PostgreSQL (`pg` / `schema.sql`)** | Persistent match history, player wins, and career stats |
| 🔊 **Audio FX** | **Web Audio API Synthesizer** | Procedural 8-bit / arcade sound effects (zero audio assets needed) |
| 🚀 **Deployment** | **Vercel (Client) + Railway / Render (Server)** | One-click deployment with persistent WebSockets |

---

## 🚀 Run Locally

### 1. Requirements
* Node.js 18+
* npm

### 2. Install & Start
From the project root:

```bash
npm run install:all
npm run dev
```

* **Frontend**: `http://localhost:5173`
* **Real-time Server**: `http://localhost:3001`
* **Health Check**: `http://localhost:3001/health`
* **PostgreSQL Leaderboard API**: `http://localhost:3001/api/leaderboard`

> **Note on Database**: If `DATABASE_URL` is not set, Chaos Room automatically runs with its built-in in-memory tracker, allowing full local gameplay out of the box with zero setup required. Whenever you connect a PostgreSQL database, it automatically creates tables and stores match records!

---

## 🏆 Game Rules & Features

* **2–8 Players**: Zero accounts, zero app downloads. Play on any phone, tablet, or PC browser.
* **Ranked Answers Engine**:
  * In question rounds (*Bluff Master*, *Word Trap*, *Secret Mission*), all answers are voted on and ranked on an official podium.
  * **🤝 Hivemind Match (+25 PTS)**: If two or more players write matching answers, they both score the Hivemind bonus!
  * **🥇 1st Place**: +35 PTS · **🥈 2nd Place**: +25 PTS · **🥉 3rd Place**: +15 PTS (+15 PTS per vote received).
* **7 Chaos Rounds**:
  1. 🕵️ **Secret Mission**: Blend into the answers without getting caught.
  2. 📝 **Word Trap**: One player gets a different prompt—spot the odd answer out.
  3. 😂 **Bluff Master**: Submit the most ridiculous bluffs; vote and rank the best.
  4. ⚡ **Quick Hands**: High-tension reflex test when the buzzer turns green.
  5. 🗳️ **Who Did It?**: Accuse the Trickster and score big points.
  6. 🎲 **Chaos Mini-Game**: Rapid-fire puzzle showdown.
  7. 🔥 **Final Chaos**: Double points grand finale.
* **Real-Time Floating Emoji Cannon**: Spam `🔥, 💀, 😂, 👏, 😱, 💩, 👑, 🎉` across all players' screens anytime.
* **Procedural Sound FX & Confetti**: Audio toggles for SFX and canvas-driven particle celebration confetti.

---

## 📦 Deployment Guide

### Deploy Frontend (Client) on Vercel
1. Push this repository to GitHub.
2. Import the project in [Vercel](https://vercel.com).
3. Set **Root Directory** to `client`.
4. Add environment variable:
   * `VITE_SERVER_URL` = Your backend URL (e.g. `https://your-server.railway.app` or `https://your-server.onrender.com`).
5. Deploy! (Includes `vercel.json` rewrite rules).

### Deploy Backend (Server) on Railway or Render
* **Render**: Connect the repository to [Render](https://render.com) using `server/render.yaml` (automatically creates both the persistent Node.js web service and a managed PostgreSQL database).
* **Railway**: Create a new project from your repo, add a PostgreSQL service, set `DATABASE_URL`, and deploy using the provided `server/Dockerfile`.
