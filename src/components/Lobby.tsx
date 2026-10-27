import React from 'react';
import { motion } from 'framer-motion';
import { Check, Copy, Sparkles, Flame, ArrowRight, Brain, Zap } from 'lucide-react';
import type { PublicRoom } from '../types.js';

interface LobbyProps {
  room: PublicRoom;
  myId: string;
  isHost: boolean;
  copied: boolean;
  copyCode: () => void;
  onReadyToggle: () => void;
  onConfigRounds: (rounds: number) => void;
  onStartGame: () => void;
  error?: string | null;
}

export const Lobby: React.FC<LobbyProps> = ({
  room,
  myId,
  isHost,
  copied,
  copyCode,
  onReadyToggle,
  onConfigRounds,
  onStartGame,
  error,
}) => {
  const me = room.players.find(p => p.id === myId);

  return (
    <motion.main
      key="lobby"
      className="lobby-layout"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div className="lobby-game-banner">
        <div className="lobby-title-left">
          <div className="game-badge-chip">
            <span className="live-pulsar" />
            <span>MULTIPLAYER LOBBY</span>
          </div>
          <h1 className="arcade-lobby-title">
            READY UP, <span className="gradient-arcade-text">CREW!</span>
          </h1>
          <p className="lobby-subtitle">
            Share room code below. 3 core rounds · AI Judge ready.
          </p>
        </div>
        <div className="big-room-code-box">
          <span className="code-label">ROOM CODE</span>
          <strong className="code-value">{room.code}</strong>
          <motion.button
            className="copy-arcade-btn"
            onClick={copyCode}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
          >
            {copied ? <Check size={16} className="text-neon-green" /> : <Copy size={16} />}
            <span>{copied ? 'COPIED!' : 'COPY'}</span>
          </motion.button>
        </div>
      </div>

      <div className="lobby-content-columns">
        <section className="lobby-players-column">
          <div className="players-grid-header">
            <h3>PLAYERS IN ROOM ({room.players.length}/8)</h3>
          </div>

          <div className="player-slots-grid">
            {room.players.map(p => {
              const isYou = p.id === myId;
              const isRoomHost = p.id === room.hostId;
              return (
                <motion.div
                  key={p.id}
                  className={`player-card-slot ${isYou ? 'slot-you' : ''}`}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  layout
                >
                  <div className="slot-avatar">{p.avatar || '🦊'}</div>
                  <div className="slot-info">
                    <div className="slot-name-row">
                      <strong>{p.name}</strong>
                      {isYou && <span className="you-pill">YOU</span>}
                      {isRoomHost && <span className="host-pill">HOST</span>}
                    </div>
                    <small>{p.score} PTS</small>
                  </div>
                  <div
                    className={`ready-badge-chip ${
                      p.ready ? 'chip-ready' : 'chip-waiting'
                    }`}
                  >
                    {p.ready ? (
                      <>
                        <Check size={14} /> READY
                      </>
                    ) : (
                      'WAITING'
                    )}
                  </div>
                </motion.div>
              );
            })}
            {Array.from(
              { length: Math.max(0, 4 - room.players.length) },
              (_, i) => (
                <div className="player-card-slot slot-empty" key={`empty-${i}`}>
                  <div className="slot-avatar slot-avatar-empty">+</div>
                  <div className="slot-info">
                    <strong>Waiting…</strong>
                    <small>Share code: {room.code}</small>
                  </div>
                </div>
              )
            )}
          </div>

          {/* Host Control for Game Settings */}
          {isHost ? (
            <div className="host-config-panel">
              <div className="config-label">
                <Sparkles size={14} className="text-neon-cyan" />
                <span>HOST CONTROL: GAME ROUNDS</span>
              </div>
              <div className="config-button-group">
                {[3, 5, 7].map(rCount => (
                  <button
                    key={rCount}
                    type="button"
                    className={`config-pill-btn ${
                      (room.totalRounds || 3) === rCount ? 'config-pill-active' : ''
                    }`}
                    onClick={() => onConfigRounds(rCount)}
                  >
                    {rCount} Rounds
                  </button>
                ))}
              </div>
              <div className="config-subtext">
                Default: <b>3 Rounds</b> (Standard) · 100% Netlify Serverless!
              </div>
            </div>
          ) : (
            <div className="non-host-config-badge">
              <span>
                👑 Host configured: {room.totalRounds || 3} Rounds · AI Judge Ready
              </span>
            </div>
          )}

          <div className="lobby-ready-action-bar">
            {isHost ? (
              <motion.button
                className="primary-arcade-btn btn-neon-green btn-large"
                onClick={onStartGame}
                disabled={
                  room.players.length < 2 || room.players.some(p => !p.ready)
                }
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
              >
                <Flame size={20} />
                <span>LAUNCH CHAOS ROOM 🚀</span>
              </motion.button>
            ) : (
              <motion.button
                className={`primary-arcade-btn btn-large ${
                  me?.ready ? 'btn-neon-pink' : 'btn-neon-green'
                }`}
                onClick={onReadyToggle}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
              >
                {me?.ready ? <Check size={20} /> : <ArrowRight size={20} />}
                <span>
                  {me?.ready ? 'READY! (CLICK TO CANCEL)' : 'I AM READY!'}
                </span>
              </motion.button>
            )}
            <div className="lobby-status-hint">
              {isHost
                ? room.players.length < 2
                  ? '⚡ Need 2+ players to start!'
                  : room.players.some(p => !p.ready)
                  ? '⏳ Waiting for everyone to ready up...'
                  : '✨ All players ready! Click LAUNCH!'
                : '⏳ Game will begin when host launches!'}
            </div>
          </div>
          {error && <div className="arcade-error-banner">{error}</div>}
        </section>

        <aside className="arcade-sidebar">
          <div className="sidebar-card-box">
            <div className="sidebar-box-header">
              <Brain size={16} />
              <span>🤖 AI JUDGE SYSTEM</span>
            </div>
            <div className="ai-judge-explainer">
              <div className="ai-feature-row">
                <span className="ai-feat-icon">😂</span>
                <div>
                  <strong>Humor Score</strong>
                  <small>Funny answers get ranked higher</small>
                </div>
              </div>
              <div className="ai-feature-row">
                <span className="ai-feat-icon">🔬</span>
                <div>
                  <strong>Logic Score</strong>
                  <small>Coherent answers earn respect</small>
                </div>
              </div>
              <div className="ai-feature-row">
                <span className="ai-feat-icon">🎨</span>
                <div>
                  <strong>Originality</strong>
                  <small>Unique answers beat clichés</small>
                </div>
              </div>
              <div className="ai-feature-row">
                <span className="ai-feat-icon">📉</span>
                <div>
                  <strong>Lazy Penalty</strong>
                  <small>Short/blank = negative points</small>
                </div>
              </div>
            </div>
          </div>

          <div className="sidebar-card-box">
            <div className="sidebar-box-header">
              <Zap size={16} />
              <span>LIVE ACTIVITY</span>
            </div>
            <div className="mini-feed-list">
              {room.feed.map(f => (
                <div className="mini-feed-item" key={f.id}>
                  <span className="feed-dot" />
                  <span>{f.text}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </motion.main>
  );
};

export default Lobby;
