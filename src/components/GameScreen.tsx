import React from 'react';
import { motion } from 'framer-motion';
import { Timer, Brain } from 'lucide-react';
import type { PublicRoom, PublicRound, PrivateRoundData } from '../types.js';
import { Voting } from './Voting.js';
import { ReactionGame } from './ReactionGame.js';
import { Scoreboard } from './Scoreboard.js';

interface GameScreenProps {
  room: PublicRoom;
  round: PublicRound;
  privateRound: PrivateRoundData | null;
  myId: string;
  remaining: number;
  answer: string;
  setAnswer: (val: string) => void;
  reactionMs: number | null;
  roundInfo: { color: string; emoji: string };
  onSubmit: () => void;
  onTapReaction: () => void;
}

export const GameScreen: React.FC<GameScreenProps> = ({
  room,
  round,
  privateRound,
  myId,
  remaining,
  answer,
  setAnswer,
  reactionMs,
  roundInfo,
  onSubmit,
  onTapReaction,
}) => {
  return (
    <motion.main
      key="game"
      className="game-layout"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Top HUD */}
      <div className="game-hud-bar">
        <div className="hud-round-indicator">
          <span className="hud-round-label">
            ROUND {round.number} OF {room.totalRounds || 3}
          </span>
          <div className="round-progress-pills">
            {Array.from({ length: room.totalRounds || 3 }, (_, i) => (
              <span
                key={i}
                className={`hud-pill ${
                  i + 1 === round.number
                    ? 'pill-active'
                    : i + 1 < round.number
                    ? 'pill-completed'
                    : ''
                }`}
              />
            ))}
          </div>
        </div>

        <div className="hud-phase-chip">
          <span className="live-pulsar" />
          <span>🤖 AI JUDGE WATCHING</span>
        </div>

        <div
          className={`arcade-timer-display ${
            remaining <= 5 ? 'timer-emergency' : ''
          }`}
        >
          <Timer size={18} className="timer-icon-spin" />
          <span className="timer-seconds">
            00:{String(remaining).padStart(2, '0')}
          </span>
        </div>
      </div>

      <div className="game-main-area">
        <div className={`arcade-stage-card theme-${roundInfo.color}`}>
          <div className="stage-header">
            <div className="stage-eyebrow">
              <span>{roundInfo.emoji}</span>
              <span>
                ROUND {round.number} OF {room.totalRounds || 3}
              </span>
              {round.number === (room.totalRounds || 3) && (
                <span className="double-points-ribbon">🔥 DOUBLE POINTS</span>
              )}
            </div>
            <h1 className="stage-title">{round.name}</h1>
            <p className="stage-subtitle">{round.subtitle}</p>
          </div>

          {/* QUESTION BILLBOARD */}
          <div className="arcade-prompt-billboard">
            <div className="billboard-badge">
              <Brain size={14} /> THE CHALLENGE
            </div>
            <p className="billboard-question">
              {privateRound?.prompt || round.prompt || 'Get ready for the challenge…'}
            </p>
          </div>

          {/* ANSWER SUBMISSION — Creative Rounds */}
          {round.type !== 'reaction' && (
            <Voting
              answer={answer}
              setAnswer={setAnswer}
              alreadySubmitted={!!privateRound?.alreadySubmitted}
              submittedCount={round.submittedCount || 0}
              totalPlayers={room.players.length}
              onSubmit={onSubmit}
            />
          )}

          {/* REACTION ROUND */}
          {round.type === 'reaction' && (
            <ReactionGame
              reactionStarted={!!round.reactionStarted}
              reactionMs={reactionMs}
              onTap={onTapReaction}
            />
          )}
        </div>

        {/* Sidebar Scores */}
        <aside className="game-sidebar-players">
          <Scoreboard players={room.players} myId={myId} />
        </aside>
      </div>
    </motion.main>
  );
};

export default GameScreen;
