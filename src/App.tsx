import React, { useEffect, useMemo, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gamepad2, Dice5, Volume2, VolumeX, Sparkles, Users, LockKeyhole
} from 'lucide-react';
import type {
  PublicRoom, PrivateRoundData, EmojiBurstData
} from './types.js';
import {
  api, AVATARS, REACTION_EMOJIS,
  playClick, playPop, playLockIn, playTick, playEmergencyTick,
  playRoundStart, playMatch, playVictory, playBuzzer, isSoundEnabled, toggleSound,
  launchConfetti
} from './game.js';
import { Lobby } from './components/Lobby.js';
import { GameScreen } from './components/GameScreen.js';
import { Results } from './components/Results.js';

interface FloatingEmoji {
  id: string;
  emoji: string;
  left: number;
  key: number;
}

export function App() {
  const [screen, setScreen] = useState<'welcome' | 'lobby' | 'game' | 'results'>('welcome');
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('🦊');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Room state
  const [room, setRoom] = useState<PublicRoom | null>(null);
  const [myId, setMyId] = useState<string>(() => localStorage.getItem('chaos_my_id') || '');
  const [privateRound, setPrivateRound] = useState<PrivateRoundData | null>(null);
  const [answer, setAnswer] = useState('');
  const [reactionMs, setReactionMs] = useState<number | null>(null);

  // Timer
  const [remaining, setRemaining] = useState(0);

  // Floating emoji reactions
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);
  const processedBursts = useRef<Set<string>>(new Set());

  // Restore session
  useEffect(() => {
    const savedCode = localStorage.getItem('chaos_room_code');
    const savedName = localStorage.getItem('chaos_my_name');
    const savedAvatar = localStorage.getItem('chaos_my_avatar');
    if (savedName) setName(savedName);
    if (savedAvatar) setAvatar(savedAvatar);
    if (savedCode && myId) {
      api('poll', { code: savedCode, playerId: myId }).then(res => {
        if (res.ok && res.room) {
          setRoom(res.room);
          setPrivateRound(res.privateRound || null);
          updateScreen(res.room.status);
        }
      });
    }
  }, []);

  // Polling loop to /.netlify/functions/game
  useEffect(() => {
    if (!room?.code) return;
    const interval = setInterval(async () => {
      const res = await api('poll', { code: room.code, playerId: myId });
      if (res.ok && res.room) {
        setRoom(res.room);
        if (res.privateRound !== undefined) setPrivateRound(res.privateRound);
        updateScreen(res.room.status);

        // Check for new emoji bursts
        if (res.emojiBursts && Array.isArray(res.emojiBursts)) {
          res.emojiBursts.forEach((b: EmojiBurstData) => {
            if (!processedBursts.current.has(b.id)) {
              processedBursts.current.add(b.id);
              triggerFloatingEmoji(b.emoji);
            }
          });
        }
      }
    }, 850);
    return () => clearInterval(interval);
  }, [room?.code, myId]);

  function updateScreen(status: string) {
    if (status === 'lobby') setScreen('lobby');
    else if (status === 'playing') setScreen('game');
    else if (status === 'intermission' || status === 'finished') setScreen('results');
  }

  // Timer countdown
  useEffect(() => {
    if (screen !== 'game' || !room?.round) return;
    const endsAt = room.round.endsAt;

    const timer = setInterval(() => {
      const sec = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setRemaining(sec);
      if (sec === 5 || sec === 4 || sec === 3 || sec === 2 || sec === 1) {
        playEmergencyTick();
      } else if (sec > 5 && sec % 2 === 0) {
        playTick();
      }
    }, 500);

    return () => clearInterval(timer);
  }, [screen, room?.round?.endsAt]);

  // Round transitions SFX
  useEffect(() => {
    if (room?.status === 'playing') {
      playRoundStart();
      setAnswer('');
      setReactionMs(null);
    } else if (room?.status === 'intermission') {
      playMatch();
    } else if (room?.status === 'finished') {
      playVictory();
      launchConfetti();
    }
  }, [room?.status, room?.round?.number]);

  const me = useMemo(() => room?.players.find(p => p.id === myId), [room, myId]);
  const isHost = useMemo(() => !!(room && room.hostId === myId), [room, myId]);

  function handleToggleSound() {
    toggleSound();
    setSoundOn(isSoundEnabled());
    playClick();
  }

  function triggerFloatingEmoji(emoji: string) {
    const id = Math.random().toString(36).slice(2, 9);
    const left = Math.floor(Math.random() * 80) + 10;
    setFloatingEmojis(prev => [...prev.slice(-15), { id, emoji, left, key: Date.now() }]);
    playPop();
    setTimeout(() => {
      setFloatingEmojis(prev => prev.filter(e => e.id !== id));
    }, 2800);
  }

  async function sendEmojiBurst(emoji: string) {
    if (!room?.code) return;
    triggerFloatingEmoji(emoji);
    await api('emoji', { code: room.code, playerId: myId, emoji });
  }

  async function createRoom() {
    if (!name.trim()) { setError('Enter your nickname!'); return; }
    setError(null);
    setLoading(true);
    playClick();

    const res = await api('create', { name: name.trim(), avatar });
    setLoading(false);
    if (!res.ok) { setError(res.error || 'Failed to create room'); return; }

    setRoom(res.room);
    setMyId(res.playerId);
    localStorage.setItem('chaos_my_id', res.playerId);
    localStorage.setItem('chaos_room_code', res.room.code);
    localStorage.setItem('chaos_my_name', name.trim());
    localStorage.setItem('chaos_my_avatar', avatar);
    setScreen('lobby');
  }

  async function joinRoom() {
    if (!name.trim()) { setError('Enter your nickname!'); return; }
    if (!roomCodeInput.trim()) { setError('Enter the 6-character room code!'); return; }
    setError(null);
    setLoading(true);
    playClick();

    const res = await api('join', {
      code: roomCodeInput.trim().toUpperCase(),
      name: name.trim(),
      avatar
    });
    setLoading(false);
    if (!res.ok) { setError(res.error || 'Failed to join room'); return; }

    setRoom(res.room);
    setMyId(res.playerId);
    localStorage.setItem('chaos_my_id', res.playerId);
    localStorage.setItem('chaos_room_code', res.room.code);
    localStorage.setItem('chaos_my_name', name.trim());
    localStorage.setItem('chaos_my_avatar', avatar);
    setScreen('lobby');
  }

  async function toggleReady() {
    if (!room?.code || !myId) return;
    playClick();
    const nextReady = !me?.ready;
    const res = await api('ready', { code: room.code, playerId: myId, ready: nextReady });
    if (res.ok && res.room) setRoom(res.room);
  }

  async function configRounds(rCount: number) {
    if (!room?.code || !myId || !isHost) return;
    playClick();
    const res = await api('config', { code: room.code, playerId: myId, totalRounds: rCount });
    if (res.ok && res.room) setRoom(res.room);
  }

  async function startGame() {
    if (!room?.code || !myId) return;
    playClick();
    const res = await api('start', { code: room.code, playerId: myId });
    if (!res.ok) { setError(res.error || 'Could not start game'); return; }
    if (res.room) {
      setRoom(res.room);
      setScreen('game');
    }
  }

  async function submitAnswer() {
    const trimmed = answer.trim();
    if (!trimmed || !room?.code || !myId) return;
    playLockIn();
    const res = await api('submit', { code: room.code, playerId: myId, text: trimmed });
    if (res.ok) {
      if (res.room) setRoom(res.room);
      if (res.privateRound) setPrivateRound(res.privateRound);
    }
  }

  async function tapReaction() {
    if (!room?.round || room.round.type !== 'reaction' || !room.round.reactionStarted || reactionMs !== null) return;
    const deltaMs = Math.max(10, Date.now() - (room.round.startedAt || Date.now()));
    setReactionMs(deltaMs);
    playBuzzer();
    const res = await api('reaction', { code: room.code, playerId: myId });
    if (res.ok && res.room) setRoom(res.room);
  }

  function copyCode() {
    if (!room?.code) return;
    playClick();
    navigator.clipboard?.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const roundInfo = useMemo(() => {
    if (!room?.round) return { color: 'purple', emoji: '✨' };
    const t = room.round.type;
    if (t === 'creative') return { color: 'pink', emoji: '🧠' };
    if (t === 'reaction') return { color: 'green', emoji: '⚡' };
    return { color: 'yellow', emoji: '🔥' };
  }, [room?.round?.type]);

  return (
    <div className="chaos-app-container">
      {/* FLOATING EMOJI CANVAS */}
      <div className="floating-emoji-layer" aria-hidden="true">
        {floatingEmojis.map(item => (
          <motion.div
            key={item.id}
            className="floating-emoji-item"
            style={{ left: `${item.left}%` }}
            initial={{ y: '100vh', opacity: 0, scale: 0.5 }}
            animate={{ y: '-20vh', opacity: [0, 1, 1, 0], scale: [0.5, 1.3, 1, 0.8] }}
            transition={{ duration: 2.6, ease: 'easeOut' }}
          >
            {item.emoji}
          </motion.div>
        ))}
      </div>

      {/* TOP ARCADE NAVBAR */}
      <header className="arcade-navbar">
        <div className="nav-brand">
          <div className="brand-logo-glow"><Gamepad2 size={24} /></div>
          <div className="brand-titles">
            <span className="brand-main">CHAOS ROOM</span>
            <span className="brand-tagline">TRUST NOBODY. HAVE FUN.</span>
          </div>
        </div>

        {room && (
          <div className="nav-room-pill">
            <span className="pill-dot" />
            <span className="pill-label">ROOM:</span>
            <strong className="pill-code">{room.code}</strong>
            <button className="pill-copy-btn" onClick={copyCode} title="Copy code">
              {copied ? 'COPIED!' : 'COPY'}
            </button>
          </div>
        )}

        <div className="nav-controls">
          {room && (
            <div className="quick-emoji-bar">
              {REACTION_EMOJIS.slice(0, 4).map(em => (
                <button
                  key={em}
                  className="quick-emoji-btn"
                  onClick={() => sendEmojiBurst(em)}
                  title={`React ${em}`}
                >
                  {em}
                </button>
              ))}
            </div>
          )}

          <button
            className="arcade-icon-btn"
            onClick={handleToggleSound}
            title={soundOn ? 'Mute SFX' : 'Enable SFX'}
          >
            {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
        </div>
      </header>

      {/* SCREEN ROUTING */}
      <AnimatePresence mode="wait">
        {/* ============= WELCOME / HOME ============= */}
        {screen === 'welcome' && (
          <motion.main
            key="welcome"
            className="welcome-layout"
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -25 }}
          >
            <section className="welcome-hero-card">
              <div className="hero-badge">
                <Sparkles size={14} className="text-neon-pink" />
                <span>SERVERLESS PARTY ARCADE · 2-8 PLAYERS</span>
              </div>

              <h1 className="hero-glitch-title">
                CHAOS <span className="gradient-arcade-text">ROOM</span>
              </h1>
              <p className="hero-subtitle">
                Bluff, answer hilarious AI-judged challenges, tap lightning fast, and discover your #1 Soulmate in Chaos!
              </p>

              <div className="hero-form-panel">
                <div className="form-group">
                  <label htmlFor="player-nickname">CHOOSE YOUR NICKNAME</label>
                  <input
                    id="player-nickname"
                    type="text"
                    className="arcade-input-text"
                    value={name}
                    onChange={e => setName(e.target.value.slice(0, 18))}
                    placeholder="e.g. CaptainChaos"
                    maxLength={18}
                  />
                </div>

                <div className="form-group">
                  <label>PICK YOUR ARCADE AVATAR</label>
                  <div className="avatar-grid-picker">
                    {AVATARS.map(av => (
                      <button
                        key={av}
                        type="button"
                        className={`avatar-choice-btn ${avatar === av ? 'avatar-chosen' : ''}`}
                        onClick={() => { playPop(); setAvatar(av); }}
                      >
                        {av}
                      </button>
                    ))}
                  </div>
                </div>

                {error && <div className="arcade-error-banner">{error}</div>}

                <div className="welcome-action-split">
                  <div className="action-column">
                    <motion.button
                      className="primary-arcade-btn btn-neon-purple btn-full"
                      onClick={createRoom}
                      disabled={loading}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Sparkles size={18} />
                      <span>CREATE ROOM (HOST)</span>
                    </motion.button>
                    <small className="action-hint">Host configures rounds & controls start</small>
                  </div>

                  <div className="action-divider"><span>OR</span></div>

                  <div className="action-column">
                    <div className="join-input-row">
                      <input
                        type="text"
                        className="arcade-input-code"
                        placeholder="ROOM CODE"
                        value={roomCodeInput}
                        onChange={e => setRoomCodeInput(e.target.value.toUpperCase().slice(0, 6))}
                        maxLength={6}
                      />
                      <motion.button
                        className="primary-arcade-btn btn-neon-cyan"
                        onClick={joinRoom}
                        disabled={loading}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Users size={18} />
                        <span>JOIN</span>
                      </motion.button>
                    </div>
                    <small className="action-hint">Enter the 6-character room code from your host</small>
                  </div>
                </div>

                <div className="serverless-pill-footer">
                  <LockKeyhole size={13} /> Powered by Netlify Functions & Netlify Blobs!
                </div>
              </div>
            </section>
          </motion.main>
        )}

        {/* ============= LOBBY ============= */}
        {screen === 'lobby' && room && (
          <Lobby
            room={room}
            myId={myId}
            isHost={isHost}
            copied={copied}
            copyCode={copyCode}
            onReadyToggle={toggleReady}
            onConfigRounds={configRounds}
            onStartGame={startGame}
            error={error}
          />
        )}

        {/* ============= GAME ============= */}
        {screen === 'game' && room && room.round && (
          <GameScreen
            room={room}
            round={room.round}
            privateRound={privateRound}
            myId={myId}
            remaining={remaining}
            answer={answer}
            setAnswer={setAnswer}
            reactionMs={reactionMs}
            roundInfo={roundInfo}
            onSubmit={submitAnswer}
            onTapReaction={tapReaction}
          />
        )}

        {/* ============= RESULTS ============= */}
        {screen === 'results' && room && (
          <Results
            room={room}
            myId={myId}
            isHost={isHost}
            onNextRound={async () => {
              playClick();
              const res = await api('next', { code: room.code, playerId: myId });
              if (res.ok && res.room) setRoom(res.room);
            }}
            onRematch={async () => {
              playClick();
              const res = await api('rematch', { code: room.code, playerId: myId });
              if (res.ok && res.room) setRoom(res.room);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
