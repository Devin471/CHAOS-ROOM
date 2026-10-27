# 🎭 CHAOS ROOM — Netlify Serverless Edition

A real-time multiplayer party game featuring AI Auto-Ranking, personality archetype profiling, soulmate matchmaking, and fast-paced party minigames.

Built to be **100% Netlify-Ready** for instant **Drag-and-Drop Publishing** with zero terminal commands, zero external databases, and zero API keys required.

---

## 🚀 How to Publish to Netlify (Drag & Drop)

### Option A: Drag-and-Drop ZIP on Netlify
1. Log in to [app.netlify.com](https://app.netlify.com/).
2. Navigate to **Sites** (or **Deploy** tab).
3. Drag and drop `netlify-ready-game.zip` into the Netlify upload area.
4. Netlify will instantly deploy your frontend and automatically package `/.netlify/functions/game` with Netlify Blobs!

### Option B: Drag-and-Drop the Project Folder or Git Deploy
- **Build Command**: `npm run build`
- **Publish Directory**: `dist`
- **Functions Directory**: `netlify/functions`
- **No environment variables, API keys, or database setup required.**

---

## ⚡ Serverless Architecture & Netlify Blobs

- **Netlify Function**: `netlify/functions/game.ts`
  - Replaces traditional continuous long-running Node/Socket.IO servers.
  - Exported as standard Netlify Functions v2 handler calling `/.netlify/functions/game` directly.
- **Netlify Blobs**:
  - Uses `@netlify/blobs` with strong consistency (`consistency: 'strong'`).
  - Uses conditional atomic writes (`onlyIfNew: true` for room creation, `onlyIfMatch: etag` for updates).
  - Includes optimistic locking retry loops to eliminate race conditions between concurrent players.
  - Auto-falls back to high-performance in-memory store in local / offline test environments.
- **Frontend**:
  - Pure React + TypeScript + Vite bundled into `dist/`.
  - Zero external polling dependencies; calls `/.netlify/functions/game` directly.
  - Real-time sound engine using Web Audio API (zero audio file assets required).
  - Built-in canvas particle confetti engine.

---

## 🎮 Game Rules & Gameplay

1. **Host Controls**: Only the room host can create rooms, change configurations, start rounds, or launch rematches.
2. **Hidden Opponent Answers**: In creative rounds, players submit privately. Opponent submissions remain secret and masked (`🔒 Secret Answer`) until all answers are in and the round finishes.
3. **AI Auto-Ranking Engine**: Automatically evaluates submissions based on:
   - **Humor (45%)**: Wit, absurdity, wordplay, and punchline timing.
   - **Logic (25%)**: Clever reasoning, structured argumentation, and problem solving.
   - **Originality (30%)**: Uniqueness, avoidance of cliches, and creativity.
   - **Negative Penalty**: Detects lazy gibberish ('idk', keyboard mashing) and docks points.
4. **3 Core Rounds**:
   - **Round 1: Chaos Brainstorm** (Creative open-ended challenges).
   - **Round 2: Quick Hands** (High-speed reaction tap minigame).
   - **Round 3: FINAL CHAOS SHOWDOWN** (Double chaos points).
5. **Grand Finale & Personality Matchmaking**:
   - Calculates dynamic personality vectors for each player (Humor, Logic, Creativity, Chaos, Darkness).
   - Computes compatibility synergies and pairs players with their **Best Soulmate in Chaos**.

---

## 🧪 Local Testing & Build Commands

- **Run Dev Server**: `npm run dev` (Vite dev server routes `/.netlify/functions/game` locally).
- **Run Production Build**: `npm run build` (Outputs optimized production bundle to `dist/`).
- **Run 3-Round 2-Player Test**: `npm test` (Runs end-to-end automated simulation test `scripts/test-game.mjs`).
