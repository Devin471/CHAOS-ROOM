import React, { useEffect, useMemo, useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, Check, ChevronRight, Copy, Dice5, Flame,
  Gamepad2, LockKeyhole, MessageCircle, Volume2, VolumeX,
  Sparkles, Timer, Trophy, Users, Zap, Award, Brain, Heart, Star
} from 'lucide-react';
import type {
  Player, PublicRoom, PublicRound, PrivateRoundData,
  EmojiBurstData, RankedAnswer, PlayerAward, PersonalityReport, AnswerTag
} from '../../shared/types.js';
import {
  playClick, playPop, playLockIn, playTick, playEmergencyTick,
  playRoundStart, playMatch, playVictory, playBuzzer, isSoundEnabled, toggleSound
} from './sound.js';
import { launchConfetti } from './confetti.js';
import './styles.css';

const SERVER_URL = (import.meta as any).env?.VITE_SERVER_URL || 'http://localhost:3001';
const socket: Socket = io(SERVER_URL, { autoConnect: true, reconnection: true });
const AVATARS = ['🦊','🐸','🐼','🐙','🦄','🐯','🐧','🦝','🤖','👽','🦖','🍕'];
const REACTION_EMOJIS = ['🔥', '💀', '😂', '👏', '😱', '💩', '👑', '🎉'];

const TAG_COLORS: Record<AnswerTag, string> = {
  'HILARIOUS':  '#ff6b35',
  'GENIUS':     '#7c3aed',
  'LOGICAL':    '#2563eb',
  'CREATIVE':   '#059669',
  'CHAOTIC':    '#dc2626',
  'WTF?':       '#ea580c',
  'LAZY':       '#6b7280',
  'DARK HUMOR': '#1f2937',
  'HIVEMIND':   '#0284c7',
  'SAVAGE':     '#be123c',
  'POETIC':     '#7c3aed',
  'CRINGE':     '#9f1239',
  'NEGATIVE':   '#374151',
};

const TAG_EMOJIS: Record<AnswerTag, string> = {
  'HILARIOUS':  '😂',
  'GENIUS':     '🧠',
  'LOGICAL':    '🔬',
  'CREATIVE':   '🎨',
  'CHAOTIC':    '🌪️',
  'WTF?':       '🤯',
  'LAZY':       '😴',
  'DARK HUMOR': '🌑',
  'HIVEMIND':   '🤝',
  'SAVAGE':     '🗡️',
  'POETIC':     '🌸',
  'CRINGE':     '😬',
  'NEGATIVE':   '📉',
};

const ROUND_INFO: Record<string, { emoji: string; eyebrow: string; color: string }> = {
  creative: { emoji: '🧠', eyebrow: 'AI JUDGE ACTIVE', color: 'violet' },
  reaction: { emoji: '⚡', eyebrow: 'REFLEX TEST', color: 'yellow' },
  mini:     { emoji: '🎲', eyebrow: 'CHAOS PUZZLE',  color: 'green' },
  trivia:   { emoji: '❓', eyebrow: 'TRIVIA BLAST',  color: 'blue' },
  chaos:    { emoji: '🔥', eyebrow: 'FINAL CHAOS',   color: 'orange' },
};

interface FloatingEmojiItem extends EmojiBurstData {
  left: number;
  key: number;
}

// ============================================================
//  TAG BADGE COMPONENT
// ============================================================
function TagBadge({ tag }: { tag: AnswerTag }) {
  const color = TAG_COLORS[tag] || '#6b7280';
  const emoji = TAG_EMOJIS[tag] || '🏷️';
  return (
    <motion.span
      className="ai-tag-badge"
      style={{ background: color + '22', borderColor: color + '66', color }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', damping: 12 }}
    >
      {emoji} {tag}
    </motion.span>
  );
}

// ============================================================
//  SCORE BAR COMPONENT
// ============================================================
function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="ai-score-bar">
      <span className="score-bar-label">{label}</span>
      <div className="score-bar-track">
        <motion.div
          className="score-bar-fill"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(2, value)}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      <span className="score-bar-num">{value}</span>
    </div>
  );
}

// ============================================================
//  PERSONALITY RADAR COMPONENT
// ============================================================
function PersonalityCard({ report, isMe }: { report: PersonalityReport; isMe: boolean }) {
  const { vector } = report;
  const bestPartner = report.bestPartners[0];

  return (
    <motion.div
      className={`personality-card ${isMe ? 'personality-card-me' : ''}`}
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', damping: 14 }}
    >
      <div className="personality-card-header">
        <span className="personality-avatar">{report.playerAvatar}</span>
        <div>
          <div className="personality-name">{report.playerName} {isMe && <span className="you-pill">YOU</span>}</div>
          <div className="personality-archetype">
            <span className="archetype-emoji">{report.archetypeEmoji}</span>
            <span>{report.archetype}</span>
          </div>
        </div>
        <TagBadge tag={report.topTag} />
      </div>

      <p className="personality-description">{report.description}</p>

      <div className="personality-stats">
        <ScoreBar label="😂 Humor"     value={vector.humor}      color="#ff6b35" />
        <ScoreBar label="🔬 Logic"     value={vector.logic}      color="#2563eb" />
        <ScoreBar label="🎨 Creative"  value={vector.creativity} color="#059669" />
        <ScoreBar label="🌪️ Chaos"    value={vector.chaos}      color="#dc2626" />
        <ScoreBar label="🌑 Darkness"  value={vector.darkness}   color="#8b5cf6" />
      </div>

      {bestPartner && (
        <div className="best-partner-match-card">
          <div className="match-card-top">
            <div className="match-badge">
              <Heart size={14} className="partner-heart" />
              <span>#1 BEST PARTNER MATCH</span>
            </div>
            <span className="match-percent">{bestPartner.compatibilityScore}% SYNC</span>
          </div>

          <div className="match-duo-row">
            <span className="duo-avatar">{bestPartner.playerAvatar}</span>
            <div>
              <strong className="duo-name">{bestPartner.playerName}</strong>
              <div className="compat-label">{bestPartner.compatibilityLabel}</div>
            </div>
          </div>

          <div className="match-why-box">
            <div className="why-label">🤝 WHY YOU THINK ALIKE IN GAMING:</div>
            <p className="why-text">{bestPartner.reason}</p>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ============================================================
//  MAIN APP
// ============================================================
function App() {
  const [connected, setConnected] = useState<boolean>(socket.connected);
  const [screen, setScreen] = useState<'home' | 'lobby' | 'game' | 'results'>('home');
  const [name, setName] = useState<string>('');
  const [selectedAvatar, setSelectedAvatar] = useState<string>(AVATARS[0]);
  const [joinCode, setJoinCode] = useState<string>('');
  const [room, setRoom] = useState<PublicRoom | null>(null);
  const [myId, setMyId] = useState<string>(socket.id || '');
  const [privateRound, setPrivateRound] = useState<PrivateRoundData | null>(null);
  const [error, setError] = useState<string>('');
  const [answer, setAnswer] = useState<string>('');
  const [remaining, setRemaining] = useState<number>(0);
  const [reactionState, setReactionState] = useState<'waiting' | 'go'>('waiting');
  const [reactionMs, setReactionMs] = useState<number | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [soundOn, setSoundOn] = useState<boolean>(isSoundEnabled());
  const [roundSplash, setRoundSplash] = useState<PublicRound | null>(null);
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmojiItem[]>([]);
  const [personalityReports, setPersonalityReports] = useState<PersonalityReport[] | null>(null);
  const prevRoundNumberRef = useRef<number | null>(null);
  const prevRemainingRef = useRef<number | null>(null);

  useEffect(() => {
    const onConnect = () => { setConnected(true); setMyId(socket.id || ''); };
    const onDisconnect = () => setConnected(false);
    const onRoom = (data: PublicRoom) => {
      setRoom(data);
      if (data.personalityReports) setPersonalityReports(data.personalityReports);
      if (data.status === 'lobby') setScreen('lobby');
      else if (data.status === 'playing') { setScreen('game'); setAnswer(''); }
      else if (data.status === 'intermission' || data.status === 'finished') setScreen('results');
    };
    const onJoined = ({ code, id }: { code: string; id: string }) => {
      setMyId(id);
      setError('');
      setScreen('lobby');
      playPop();
    };
    const onError = (message: string) => { setError(message); playBuzzer(); };
    const onPrivate = (data: PrivateRoundData) => {
      setPrivateRound(data);
      if (data.type === 'reaction') setReactionState(data.reactionStarted ? 'go' : 'waiting');
    };
    const onReactionWait = () => { setReactionState('waiting'); setReactionMs(null); };
    const onReactionGo = () => { setReactionState('go'); playPop(); };
    const onEmojiBurst = (item: EmojiBurstData) => {
      setFloatingEmojis(prev => [...prev.slice(-15), { ...item, left: 10 + Math.random() * 80, key: Math.random() }]);
      playPop();
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('room:update', onRoom);
    socket.on('room:joined', onJoined);
    socket.on('game:error', onError);
    socket.on('round:private', onPrivate);
    socket.on('reaction:wait', onReactionWait);
    socket.on('reaction:go', onReactionGo);
    socket.on('emoji:burst', onEmojiBurst);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('room:update', onRoom);
      socket.off('room:joined', onJoined);
      socket.off('game:error', onError);
      socket.off('round:private', onPrivate);
      socket.off('reaction:wait', onReactionWait);
      socket.off('reaction:go', onReactionGo);
      socket.off('emoji:burst', onEmojiBurst);
    };
  }, []);

  // Timer
  useEffect(() => {
    if (!room?.round?.endsAt || room.status !== 'playing') { setRemaining(0); return; }
    const tick = () => {
      const left = Math.max(0, Math.ceil((room.round!.endsAt - Date.now()) / 1000));
      setRemaining(left);
      if (left !== prevRemainingRef.current) {
        prevRemainingRef.current = left;
        if (left <= 5 && left > 0) playEmergencyTick();
        else if (left > 0 && left % 5 === 0) playTick();
      }
    };
    tick();
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [room?.round?.endsAt, room?.status]);

  // Round splash
  useEffect(() => {
    if (room?.round?.number && room.round.number !== prevRoundNumberRef.current) {
      prevRoundNumberRef.current = room.round.number;
      setRoundSplash(room.round);
      playRoundStart();
      const t = setTimeout(() => setRoundSplash(null), 2600);
      return () => clearTimeout(t);
    }
  }, [room?.round?.number]);

  // Celebrations
  useEffect(() => {
    if (room?.status === 'finished') { playVictory(); launchConfetti(5000); }
    else if (room?.status === 'intermission') {
      const hasMatch = room.lastResult?.rankedAnswers?.some((a: RankedAnswer) => a.isMatch);
      if (hasMatch) { playMatch(); launchConfetti(2200); } else playPop();
    }
  }, [room?.status, room?.lastResult]);

  const me = room?.players?.find(p => p.id === myId);
  const isHost = room?.hostId === myId || room?.hostId === socket.id;
  const sortedPlayers = useMemo(() => [...(room?.players || [])].sort((a, b) => b.score - a.score), [room?.players]);
  const round = room?.round;
  const roundInfo = ROUND_INFO[round?.type || 'creative'] || ROUND_INFO.creative;

  const handleToggleSound = () => { const s = toggleSound(); setSoundOn(s); };
  const randomizeAvatar = () => {
    playClick();
    const next = pickDifferentAvatar(selectedAvatar);
    setSelectedAvatar(next);
    if (room) socket.emit('player:avatar', { avatar: next });
  };
  const selectAvatar = (a: string) => {
    playClick();
    setSelectedAvatar(a);
    if (room) socket.emit('player:avatar', { avatar: a });
  };
  const sendEmojiReaction = (emoji: string) => { playClick(); socket.emit('reaction:emoji', { emoji }); };
  const submit = () => {
    if (!answer.trim()) return;
    playLockIn();
    socket.emit('round:submit', { text: answer.trim() });
  };
  const createRoomFn = () => {
    playClick();
    setError('');
    socket.emit('room:create', { name: name.trim() || 'Player', avatar: selectedAvatar });
  };
  const joinRoom = () => {
    playClick();
    setError('');
    socket.emit('room:join', { code: joinCode, name: name.trim() || 'Player', avatar: selectedAvatar });
  };
  const copyCode = async () => {
    playClick();
    if (!room) return;
    try { await navigator.clipboard.writeText(room.code); setCopied(true); setTimeout(() => setCopied(false), 1600); }
    catch { setError('Room code: ' + room.code); }
  };
  const tapReaction = () => {
    if (reactionState !== 'go' || privateRound?.alreadySubmitted || reactionMs !== null) return;
    playLockIn();
    setReactionMs(1);
    socket.emit('reaction:tap');
  };
  const startGame = () => { playClick(); setError(''); socket.emit('game:start'); };

  return (
    <div className="app-shell">
      <div className="ambient ambient-one"/>
      <div className="ambient ambient-two"/>
      <div className="ambient ambient-three"/>
      <div className="arcade-scanlines" />

      {/* Floating Emojis */}
      <div className="floating-emojis-container">
        <AnimatePresence>
          {floatingEmojis.map(item => (
            <motion.div key={item.key} className="floating-emoji" style={{ left: `${item.left}%` }}
              initial={{ opacity: 0, y: 0, scale: 0.5 }}
              animate={{ opacity: 1, y: -240, scale: 1.2 }}
              exit={{ opacity: 0, y: -460 }}
              transition={{ duration: 2.8, ease: 'easeOut' }}
            >
              <span className="emoji-char">{item.emoji}</span>
              <span className="emoji-sender">{item.senderAvatar} {item.senderName}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Round Splash Banner */}
      <AnimatePresence>
        {roundSplash && (
          <motion.div className="round-splash-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="round-splash-card"
              initial={{ scale: 0.5, y: 50, rotateX: -30 }}
              animate={{ scale: 1, y: 0, rotateX: 0 }}
              exit={{ scale: 0.7, y: -60 }}
              transition={{ type: 'spring', damping: 14 }}
            >
              <span className="splash-eyebrow">⚡ ROUND {roundSplash.number} OF 7 ⚡</span>
              <div className="splash-icon">{roundSplash.icon}</div>
              <h1 className="splash-title">{roundSplash.name}</h1>
              <p className="splash-sub">{roundSplash.subtitle}</p>
              <div className="splash-ai-badge">🤖 AI JUDGE ACTIVATED</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Bar */}
      <header className="topbar">
        <motion.button className="brand" onClick={() => { if (!room) setScreen('home'); }} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <span className="brand-mark"><Flame size={22} fill="currentColor"/></span>
          <span>CHAOS<span className="brand-light">ROOM</span></span>
        </motion.button>
        <div className="topbar-right">
          <motion.button className={`sound-toggle-btn ${soundOn ? 'sound-active' : ''}`} onClick={handleToggleSound} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}>
            {soundOn ? <Volume2 size={16}/> : <VolumeX size={16}/>}
            <span>{soundOn ? 'SFX' : 'MUTED'}</span>
          </motion.button>
          <span className={`connection ${connected ? 'online' : ''}`}>
            <span className="connection-dot"/>
            {connected ? 'LIVE' : 'OFFLINE'}
          </span>
          {room && (
            <motion.button className="room-pill-btn" onClick={copyCode} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <span className="tiny-dot"/>
              <span>ROOM: <b>{room.code}</b></span>
              <Copy size={12}/>
            </motion.button>
          )}
        </div>
      </header>

      <AnimatePresence mode="wait">

        {/* ============= HOME ============= */}
        {screen === 'home' && (
          <motion.main key="home" className="home-layout" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
            <section className="hero-copy">
              <div className="game-badge-chip">
                <Sparkles size={14} className="spin-slow" />
                <span>🤖 AI-POWERED PARTY GAME</span>
              </div>
              <h1 className="game-main-title">
                ANSWER. COMPETE.<br/>
                <span className="gradient-arcade-text">LET AI JUDGE.</span>
              </h1>
              <p className="hero-description">
                A wild multiplayer game where an AI judge automatically scores your answers for humor, creativity, and logic.
                No voting. No bias. Just pure algorithmic chaos across 7 rounds!
              </p>

              <div className="arcade-perks-row">
                <span className="perk-tag"><Brain size={14}/> AI Auto-Ranking</span>
                <span className="perk-tag"><Zap size={14}/> 300+ Questions</span>
                <span className="perk-tag"><Users size={14}/> 2–8 Players</span>
                <span className="perk-tag"><Heart size={14}/> Partner Matching</span>
                <span className="perk-tag"><Gamepad2 size={14}/> Instant Play</span>
              </div>

              <div className="character-preview-card">
                <div className="preview-label">PICK YOUR BATTLE AVATAR:</div>
                <div className="avatar-selection-bar">
                  {AVATARS.map(a => (
                    <motion.button key={a} className={`avatar-choice-btn ${selectedAvatar === a ? 'selected-avatar' : ''}`}
                      onClick={() => selectAvatar(a)} whileHover={{ scale: 1.18 }} whileTap={{ scale: 0.88 }}>
                      {a}
                    </motion.button>
                  ))}
                  <motion.button className="dice-random-btn" onClick={randomizeAvatar} title="Random" whileHover={{ scale: 1.1, rotate: 45 }} whileTap={{ scale: 0.9 }}>
                    <Dice5 size={18} />
                  </motion.button>
                </div>
              </div>
            </section>

            <section className="join-panel-wrap">
              <div className="arcade-console-card">
                <div className="console-header">
                  <div className="console-screen-badge">PLAYER SETUP</div>
                  <motion.div className="avatar-giant-preview" key={selectedAvatar}
                    initial={{ scale: 0.6, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', damping: 10 }}>
                    {selectedAvatar}
                  </motion.div>
                </div>
                <div className="console-body">
                  <label className="arcade-field-label" htmlFor="nickname">YOUR GAMER NICKNAME</label>
                  <input id="nickname" className="arcade-text-input" value={name}
                    onChange={e => setName(e.target.value.slice(0, 18))}
                    placeholder="e.g. ChaosMaster" maxLength={18}
                    onKeyDown={e => e.key === 'Enter' && createRoomFn()}
                  />

                  <motion.button className="primary-arcade-btn btn-neon-purple" onClick={createRoomFn} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}>
                    <Gamepad2 size={18} />
                    <span>CREATE ROOM (HOST)</span>
                    <ArrowRight size={18} />
                  </motion.button>

                  <div className="console-divider"><span>OR JOIN EXISTING ROOM</span></div>

                  <div className="join-console-row">
                    <input aria-label="Room code" className="arcade-text-input code-input"
                      value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                      placeholder="ROOM CODE" maxLength={6}
                      onKeyDown={e => e.key === 'Enter' && joinRoom()}
                    />
                    <motion.button className="secondary-arcade-btn" disabled={joinCode.length < 4} onClick={joinRoom} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.94 }}>
                      <span>JOIN</span>
                      <ChevronRight size={18} />
                    </motion.button>
                  </div>

                  {error && <div className="arcade-error-banner">{error}</div>}
                </div>
                <div className="console-footer-note">
                  <LockKeyhole size={13}/> No installs · Share room code with friends to join!
                </div>
              </div>
            </section>
          </motion.main>
        )}

        {/* ============= LOBBY ============= */}
        {screen === 'lobby' && room && (
          <motion.main key="lobby" className="lobby-layout" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="lobby-game-banner">
              <div className="lobby-title-left">
                <div className="game-badge-chip"><span className="live-pulsar"/><span>MULTIPLAYER LOBBY</span></div>
                <h1 className="arcade-lobby-title">READY UP, <span className="gradient-arcade-text">CREW!</span></h1>
                <p className="lobby-subtitle">Share the room code below with friends. 7 rounds · 300+ questions · AI Judge ready.</p>
              </div>
              <div className="big-room-code-box">
                <span className="code-label">ROOM CODE</span>
                <strong className="code-value">{room.code}</strong>
                <motion.button className="copy-arcade-btn" onClick={copyCode} whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}>
                  <Copy size={15}/>
                  <span>{copied ? 'COPIED!' : 'COPY'}</span>
                </motion.button>
              </div>
            </div>

            <div className="lobby-arcade-grid">
              <section className="arcade-main-card">
                <div className="card-top-bar">
                  <h2>PLAYER ROSTER <span className="arcade-badge">{room.players.length} / 8</span></h2>
                  <div className="avatar-changer-mini">
                    <span>Avatar:</span>
                    <div className="mini-avatar-picker">
                      {AVATARS.slice(0, 6).map(a => (
                        <button key={a} className={`mini-avatar-btn ${me?.avatar === a ? 'mini-selected' : ''}`} onClick={() => selectAvatar(a)}>{a}</button>
                      ))}
                      <button className="mini-avatar-btn" onClick={randomizeAvatar}>🎲</button>
                    </div>
                  </div>
                </div>

                <div className="player-arcade-roster">
                  {room.players.map(p => {
                    const isYou = p.id === myId;
                    const pIsHost = p.id === room.hostId;
                    return (
                      <motion.div className={`player-card-slot ${isYou ? 'slot-you' : ''} ${p.ready ? 'slot-ready' : ''}`} key={p.id}
                        initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring' }}>
                        <div className="slot-avatar">{p.avatar || '🎮'}</div>
                        <div className="slot-info">
                          <strong>{p.name} {isYou && <span className="you-pill">YOU</span>}</strong>
                          <small>{pIsHost ? '👑 PARTY HOST' : p.ready ? '🔥 READY' : '⏳ Not ready'}</small>
                        </div>
                        <div className={`ready-badge-chip ${p.ready ? 'chip-ready' : 'chip-waiting'}`}>
                          {p.ready ? <><Check size={14}/> READY</> : 'WAITING'}
                        </div>
                      </motion.div>
                    );
                  })}
                  {Array.from({ length: Math.max(0, 4 - room.players.length) }, (_, i) => (
                    <div className="player-card-slot slot-empty" key={`empty-${i}`}>
                      <div className="slot-avatar slot-avatar-empty">+</div>
                      <div className="slot-info"><strong>Waiting…</strong><small>Share code: {room.code}</small></div>
                    </div>
                  ))}
                </div>

                {/* Question count configuration */}
                {isHost ? (
                  <div className="host-config-panel">
                    <div className="config-label">
                      <Sparkles size={14} className="text-neon-cyan" />
                      <span>HOST CONTROL: QUESTIONS PER ROUND (7 ROUNDS TOTAL)</span>
                    </div>
                    <div className="config-button-group">
                      {[7, 8, 9, 10].map(count => (
                        <button
                          key={count}
                          type="button"
                          className={`config-pill-btn ${(room.questionsPerRound || 7) === count ? 'config-pill-active' : ''}`}
                          onClick={() => { playClick(); socket.emit('room:config', { questionsPerRound: count }); }}
                        >
                          {count} Questions
                        </button>
                      ))}
                    </div>
                    <div className="config-subtext">
                      Total match questions: <b>{(room.questionsPerRound || 7) * 7} questions</b> · 100% unique & procedural!
                    </div>
                  </div>
                ) : (
                  <div className="non-host-config-badge">
                    <span>👑 Host set: 7 Rounds · {room.questionsPerRound || 7} Questions per Round ({(room.questionsPerRound || 7) * 7} Questions Total)</span>
                  </div>
                )}

                <div className="lobby-ready-action-bar">
                  {isHost ? (
                    <motion.button className="primary-arcade-btn btn-neon-green btn-large" onClick={startGame}
                      disabled={room.players.length < 2 || room.players.some(p => !p.ready)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                      <Flame size={20} />
                      <span>LAUNCH CHAOS ROOM 🚀</span>
                    </motion.button>
                  ) : (
                    <motion.button className={`primary-arcade-btn btn-large ${me?.ready ? 'btn-neon-pink' : 'btn-neon-green'}`}
                      onClick={() => { playClick(); socket.emit('player:ready', { ready: !me?.ready }); }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                      {me?.ready ? <Check size={20}/> : <ArrowRight size={20}/>}
                      <span>{me?.ready ? 'READY! (CLICK TO CANCEL)' : 'I AM READY!'}</span>
                    </motion.button>
                  )}
                  <div className="lobby-status-hint">
                    {isHost
                      ? room.players.length < 2 ? '⚡ Need 2+ players to start!'
                      : room.players.some(p => !p.ready) ? '⏳ Waiting for everyone to ready up...'
                      : '✨ All players ready! Click LAUNCH!'
                      : '⏳ Game will begin when host launches!'}
                  </div>
                </div>
                {error && <div className="arcade-error-banner">{error}</div>}
              </section>

              <aside className="arcade-sidebar">
                <div className="sidebar-card-box">
                  <div className="sidebar-box-header"><Brain size={16}/><span>🤖 AI JUDGE SYSTEM</span></div>
                  <div className="ai-judge-explainer">
                    <div className="ai-feature-row"><span className="ai-feat-icon">😂</span><div><strong>Humor Score</strong><small>Funny answers get ranked higher</small></div></div>
                    <div className="ai-feature-row"><span className="ai-feat-icon">🔬</span><div><strong>Logic Score</strong><small>Coherent answers earn respect</small></div></div>
                    <div className="ai-feature-row"><span className="ai-feat-icon">🎨</span><div><strong>Originality</strong><small>Unique answers beat clichés</small></div></div>
                    <div className="ai-feature-row"><span className="ai-feat-icon">📉</span><div><strong>Lazy Penalty</strong><small>Short/blank = negative points</small></div></div>
                    <div className="ai-feature-row"><span className="ai-feat-icon">🤝</span><div><strong>Hivemind Bonus</strong><small>Same answer as others = +20 pts</small></div></div>
                  </div>
                </div>
                <div className="sidebar-card-box pro-tip-box">
                  <div className="tip-header">🌟 END-GAME REVEAL</div>
                  <p>After 7 rounds, discover your <b>Personality Archetype</b> and <b>Best Partner</b> based on how you answered!</p>
                </div>
              </aside>
            </div>
          </motion.main>
        )}

        {/* ============= GAME ============= */}
        {screen === 'game' && room && round && (
          <motion.main key="game" className="game-layout" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            {/* HUD Bar */}
            <div className="game-hud-bar">
              <div className="hud-round-badge">
                <span className="hud-round-label">ROUND {round.number} OF 7</span>
                <div className="round-progress-pills">
                  {Array.from({ length: 7 }, (_, i) => (
                    <span key={i} className={`hud-pill ${i + 1 === round.number ? 'pill-active' : i + 1 < round.number ? 'pill-completed' : ''}`}/>
                  ))}
                </div>
              </div>

              <div className="hud-phase-chip">
                <span className="live-pulsar"/>
                <span>🤖 AI JUDGE WATCHING</span>
              </div>

              <div className={`arcade-timer-display ${remaining <= 5 ? 'timer-emergency' : ''}`}>
                <Timer size={18} className="timer-icon-spin" />
                <span className="timer-seconds">00:{String(remaining).padStart(2, '0')}</span>
              </div>
            </div>

            <div className="game-main-area">
              <div className={`arcade-stage-card theme-${roundInfo.color}`}>
                <div className="stage-header">
                  <div className="stage-eyebrow">
                    <span>{roundInfo.emoji}</span>
                    <span>{roundInfo.eyebrow}</span>
                    {round.number === 7 && <span className="double-points-ribbon">🔥 DOUBLE POINTS</span>}
                  </div>
                  <h1 className="stage-title">{round.name}</h1>
                  <p className="stage-subtitle">{round.subtitle}</p>
                </div>

                {/* QUESTION BILLBOARD */}
                <div className="arcade-prompt-billboard">
                  <div className="billboard-badge">
                    <Brain size={14}/> THE CHALLENGE
                  </div>
                  <p className="billboard-question">
                    {privateRound?.prompt || round.prompt || 'Get ready for the challenge…'}
                  </p>
                  {round.type === 'mini' && round.challenge?.question && (
                    <div className="billboard-puzzle-box">
                      <span>PUZZLE:</span> <b>{round.challenge.question}</b>
                    </div>
                  )}
                </div>

                {/* ANSWER SUBMISSION — Creative/Mini Rounds */}
                {['creative', 'mini', 'chaos', 'trivia'].includes(round.type) && (
                  <div className="arcade-input-stage">
                    <div className="input-stage-top">
                      <label htmlFor="answer-input">YOUR ANSWER:</label>
                      <span className="live-submission-count">
                        <Users size={13}/> {room.round?.submittedCount || 0} / {room.players.length} locked in
                      </span>
                    </div>
                    <div className="input-box-wrapper">
                      <textarea
                        id="answer-input"
                        className="arcade-answer-textarea"
                        value={answer}
                        onChange={e => setAnswer(e.target.value.slice(0, 200))}
                        placeholder={privateRound?.alreadySubmitted
                          ? '✅ Answer locked in! AI Judge is evaluating...'
                          : 'Type your funniest, weirdest, or most logical answer here... Be creative!'}
                        maxLength={200}
                        disabled={privateRound?.alreadySubmitted}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
                      />
                    </div>
                    <div className="answer-submit-actions">
                      <div className="char-count-pill">{answer.length} / 200</div>
                      {privateRound?.alreadySubmitted ? (
                        <div className="locked-in-stamp">
                          <Check size={18}/>
                          <span>LOCKED IN — AI IS JUDGING 🤖</span>
                        </div>
                      ) : (
                        <motion.button className="primary-arcade-btn btn-neon-green" disabled={!answer.trim()} onClick={submit} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}>
                          <LockKeyhole size={18}/>
                          <span>LOCK IN ANSWER</span>
                        </motion.button>
                      )}
                    </div>
                  </div>
                )}

                {/* REACTION ROUND */}
                {round.type === 'reaction' && (
                  <div className="reaction-game-stage">
                    <motion.button
                      className={`arcade-big-buzzer ${reactionState === 'go' ? 'buzzer-go' : ''} ${reactionMs !== null ? 'buzzer-hit' : ''}`}
                      onClick={tapReaction}
                      disabled={reactionState !== 'go' || privateRound?.alreadySubmitted || reactionMs !== null}
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}
                    >
                      <div className="buzzer-content">
                        <span className="buzzer-icon">{reactionMs !== null ? '⚡' : reactionState === 'go' ? '💥' : '✋'}</span>
                        <strong className="buzzer-text">{reactionMs !== null ? 'TAP RECORDED!' : reactionState === 'go' ? 'TAP NOW!!' : 'WAIT FOR GREEN…'}</strong>
                        <small className="buzzer-hint">{reactionState === 'go' ? 'QUICKEST REFLEXES WIN' : 'Do not jump the gun!'}</small>
                      </div>
                    </motion.button>
                  </div>
                )}

                {/* Stage Footer */}
                <div className="stage-footer">
                  <div className="footer-player-avatars">
                    {room.players.map(p => (
                      <span key={p.id} className="foot-avatar-circle" title={p.name}>{p.avatar || '🎮'}</span>
                    ))}
                    <span className="foot-player-count">{room.players.length} players in the chaos</span>
                  </div>
                  <div className="live-indicator-chip"><span className="live-pulsar"/> LIVE</div>
                </div>
              </div>

              {/* Sidebar Scoreboard */}
              <aside className="game-sidebar-hud">
                <div className="sidebar-card-box">
                  <div className="scoreboard-header"><Trophy size={18} className="text-neon-yellow"/><span>STANDINGS</span></div>
                  <div className="score-rows-list">
                    {sortedPlayers.map((p, i) => (
                      <div className={`scoreboard-row ${p.id === myId ? 'row-you' : ''}`} key={p.id}>
                        <span className="score-rank-medal">{i === 0 ? '👑' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</span>
                        <span className="score-avatar-badge">{p.avatar || '🎮'}</span>
                        <div className="score-player-name"><strong>{p.name} {p.id === myId && <small>(you)</small>}</strong></div>
                        <span className="score-points-total">{p.score} <small>PTS</small></span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="sidebar-card-box reactions-launcher-box">
                  <div className="reactions-box-title"><MessageCircle size={14}/><span>REACTIONS:</span></div>
                  <div className="emoji-reaction-bar">
                    {REACTION_EMOJIS.map(em => (
                      <motion.button key={em} className="reaction-cannon-btn" onClick={() => sendEmojiReaction(em)} whileHover={{ scale: 1.3 }} whileTap={{ scale: 0.8 }}>{em}</motion.button>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
          </motion.main>
        )}

        {/* ============= RESULTS ============= */}
        {screen === 'results' && room && (
          <motion.main key="results" className="results-layout" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>

            {/* INTERMISSION */}
            {room.status === 'intermission' && (
              <>
                <div className="results-headline-banner">
                  <div className="results-emoji-burst">🤖</div>
                  <div>
                    <span className="splash-eyebrow">
                      ⚡ ROUND {room.lastResult?.round || 1} OF 7 · QUESTION {room.lastResult?.questionIndex || 1} OF {room.questionsPerRound || 7} — AI VERDICT ⚡
                    </span>
                    <h1 className="results-title">RANKINGS <span className="gradient-arcade-text">REVEALED!</span></h1>
                    <p className="results-subtitle">The AI judge has automatically ranked all answers. Opponent answers remain secret!</p>
                  </div>
                </div>

                <div className="results-arcade-grid">
                  <section className="results-main-area">
                    {/* RANKED ANSWERS PODIUM */}
                    {room.lastResult?.rankedAnswers && room.lastResult.rankedAnswers.length > 0 && (
                      <div className="ranked-answers-podium-card">
                        <div className="podium-header">
                          <Award size={22} className="text-neon-yellow"/>
                          <div>
                            <h2>🤖 AI JUDGE RANKINGS</h2>
                            <p>Scored automatically for humor, logic, and originality. Opponent answers hidden until end game!</p>
                          </div>
                        </div>

                        <div className="podium-answers-list">
                          {room.lastResult.rankedAnswers.map((item: RankedAnswer, idx: number) => {
                            const isMine = item.authors.some(a => a.id === myId || a.id === socket.id);
                            return (
                              <motion.div
                                key={item.text + idx}
                                className={`podium-rank-row rank-item-${item.rank} ${item.isMatch ? 'hivemind-match-row' : ''}`}
                                initial={{ opacity: 0, x: -30 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.12 }}
                              >
                                <div className="podium-rank-medal">{item.medal}</div>
                                <div className="podium-answer-body">
                                  {isMine ? (
                                    <div className="podium-quote podium-quote-mine">
                                      "{item.text}" <span className="your-answer-badge">YOUR SUBMISSION</span>
                                    </div>
                                  ) : (
                                    <div className="podium-quote podium-quote-hidden">
                                      <LockKeyhole size={14} className="text-neon-cyan" />
                                      <span>🔒 Secret Answer · Ranked & Evaluated by AI Judge</span>
                                    </div>
                                  )}

                                  {/* AI Tags */}
                                  <div className="podium-tags-row">
                                    {item.tags.map(tag => <TagBadge key={tag} tag={tag} />)}
                                  </div>

                                  {/* AI Reason */}
                                  <div className="ai-verdict-reason">
                                    <span className="ai-bot-icon">🤖</span>
                                    <em>{item.aiReason}</em>
                                  </div>

                                  {/* Score bars */}
                                  <div className="mini-score-bars">
                                    <ScoreBar label="😂 Humor" value={item.humorScore} color="#ff6b35" />
                                    <ScoreBar label="🔬 Logic" value={item.logicScore} color="#2563eb" />
                                    <ScoreBar label="🎨 Originality" value={item.originalityScore} color="#059669" />
                                  </div>

                                  <div className="podium-authors-row">
                                    <span className="submitted-by-label">Submitted by:</span>
                                    {item.authors.map(a => (
                                      <span key={a.id} className="author-pill">{a.avatar} {a.name}</span>
                                    ))}
                                    {item.isMatch && <span className="hivemind-bonus-tag">🤝 HIVEMIND BONUS +20</span>}
                                  </div>
                                </div>
                                <div className={`podium-points-badge ${item.pointsAwarded < 0 ? 'pts-badge-negative' : ''}`}>
                                  {item.pointsAwarded > 0 ? '+' : ''}{item.pointsAwarded} <small>PTS</small>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Round Score Gains */}
                    {room.lastResult?.results && room.lastResult.results.length > 0 && (
                      <div className="round-score-gains-card">
                        <div className="gains-header"><h3>QUESTION POINT BREAKDOWN</h3></div>
                        <div className="gains-list">
                          {room.lastResult.results.map((r: PlayerAward, i: number) => (
                            <div className="gains-row" key={`${r.id}-${i}`}>
                              <div className="gains-player">
                                <span className="gains-avatar">{r.avatar || '🎮'}</span>
                                <strong>{r.name}</strong>
                              </div>
                              <span className="gains-reason">{r.reason}</span>
                              <strong className={r.points < 0 ? 'pts-negative' : 'pts-positive'}>
                                {r.points > 0 ? '+' : ''}{r.points} PTS
                              </strong>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="intermission-bottom-bar">
                      <span className="auto-next-label">
                        <Timer size={16}/> Next {(room.lastResult?.questionIndex || 1) >= (room.questionsPerRound || 7) ? 'round' : 'question'} starts automatically…
                      </span>
                      {isHost && (
                        <motion.button className="primary-arcade-btn btn-neon-purple" onClick={() => { playClick(); socket.emit('game:next'); }} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                          <span>{(room.lastResult?.questionIndex || 1) >= (room.questionsPerRound || 7) ? 'NEXT ROUND NOW' : 'NEXT QUESTION NOW'}</span>
                          <ArrowRight size={18}/>
                        </motion.button>
                      )}
                    </div>
                  </section>

                  <aside className="results-sidebar-leaderboard">
                    <div className="sidebar-card-box">
                      <div className="scoreboard-header"><Trophy size={18} className="text-neon-yellow"/><span>LEADERBOARD</span></div>
                      <div className="score-rows-list">
                        {sortedPlayers.map((p, i) => (
                          <div className={`scoreboard-row ${p.id === myId ? 'row-you' : ''}`} key={p.id}>
                            <span className="score-rank-medal">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</span>
                            <span className="score-avatar-badge">{p.avatar || '🎮'}</span>
                            <div className="score-player-name"><strong>{p.name}</strong></div>
                            <span className="score-points-total">{p.score} <small>PTS</small></span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </aside>
                </div>
              </>
            )}

            {/* FINAL WINNER SHOWDOWN */}
            {room.status === 'finished' && (
              <div className="championship-showdown">
                <div className="winner-crown-blast">🏆</div>
                <span className="splash-eyebrow">⚡ 7 ROUNDS COMPLETE ⚡</span>
                <h1 className="champion-title">CHAOS CHAMPION CROWNED!</h1>

                <div className="winner-grand-podium">
                  <motion.div className="winner-grand-avatar"
                    animate={{ rotate: [0, -5, 5, -5, 0], scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}>
                    {room.lastResult?.winner?.avatar || sortedPlayers[0]?.avatar || '👑'}
                  </motion.div>
                  <div className="winner-grand-name">{room.lastResult?.winner?.name || sortedPlayers[0]?.name || 'Champion'}</div>
                  <div className="winner-grand-score">{room.lastResult?.winner?.score ?? sortedPlayers[0]?.score ?? 0} TOTAL POINTS</div>
                </div>

                <div className="final-podium-card">
                  <div className="podium-header"><Trophy size={20} className="text-neon-yellow"/><h3>FINAL LEADERBOARD</h3></div>
                  <div className="final-ranks-list">
                    {sortedPlayers.map((p, i) => (
                      <div className={`final-rank-item final-place-${i + 1}`} key={p.id}>
                        <span className="final-medal">{i === 0 ? '🥇 1ST' : i === 1 ? '🥈 2ND' : i === 2 ? '🥉 3RD' : `#${i + 1}`}</span>
                        <span className="final-avatar">{p.avatar || '🎮'}</span>
                        <strong className="final-name">{p.name} {p.id === myId && <small>(you)</small>}</strong>
                        <span className="final-pts">{p.score} <small>PTS</small></span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* PERSONALITY REPORTS */}
                {personalityReports && personalityReports.length > 0 && (
                  <div className="personality-board-section">
                    <div className="personality-board-header">
                      <Star size={24} className="text-neon-yellow"/>
                      <div>
                        <h2>🧠 PERSONALITY PROFILES & BEST PARTNERS</h2>
                        <p>Based on your answers, the AI has analyzed your gaming personality and found your perfect match!</p>
                      </div>
                    </div>
                    <div className="personality-cards-grid">
                      {personalityReports.map(report => (
                        <PersonalityCard
                          key={report.playerId}
                          report={report}
                          isMe={report.playerId === myId}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {isHost && (
                  <motion.button className="primary-arcade-btn btn-neon-pink rematch-btn"
                    onClick={() => { playClick(); socket.emit('game:rematch'); }} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}>
                    <Flame size={20}/>
                    <span>PLAY AGAIN (REMATCH)</span>
                  </motion.button>
                )}
              </div>
            )}
          </motion.main>
        )}

      </AnimatePresence>

      {/* Bottom Dock */}
      <footer className="arcade-bottom-dock">
        <div className="dock-left"><Gamepad2 size={15}/><span>CHAOS ROOM · 🤖 AI JUDGE EDITION</span></div>
        <div className="dock-emojis">
          {REACTION_EMOJIS.map(em => (
            <motion.button key={em} className="dock-emoji-btn" onClick={() => sendEmojiReaction(em)} whileHover={{ scale: 1.3 }} whileTap={{ scale: 0.8 }}>{em}</motion.button>
          ))}
        </div>
      </footer>
    </div>
  );
}

function pickDifferentAvatar(current: string): string {
  const others = AVATARS.filter(a => a !== current);
  return others[Math.floor(Math.random() * others.length)];
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
