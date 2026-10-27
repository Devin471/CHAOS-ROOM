import React from 'react';
import { motion } from 'framer-motion';
import {
  Award, LockKeyhole, Timer, ArrowRight, Trophy, Star, Heart, Flame
} from 'lucide-react';
import type {
  PublicRoom, RankedAnswer, PlayerAward, PersonalityReport, AnswerTag
} from '../types.js';
import { TAG_COLORS, TAG_EMOJIS } from '../game.js';

interface ResultsProps {
  room: PublicRoom;
  myId: string;
  isHost: boolean;
  onNextRound: () => void;
  onRematch: () => void;
}

export function TagBadge({ tag }: { tag: AnswerTag }) {
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

export function ScoreBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
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

export function PersonalityCard({
  report,
  isMe,
}: {
  report: PersonalityReport;
  isMe: boolean;
}) {
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
          <div className="personality-name">
            {report.playerName} {isMe && <span className="you-pill">YOU</span>}
          </div>
          <div className="personality-archetype">
            <span className="archetype-emoji">{report.archetypeEmoji}</span>
            <span>{report.archetype}</span>
          </div>
        </div>
        <TagBadge tag={report.topTag} />
      </div>

      <p className="personality-description">{report.description}</p>

      <div className="personality-stats">
        <ScoreBar label="😂 Humor" value={vector.humor} color="#ff6b35" />
        <ScoreBar label="🔬 Logic" value={vector.logic} color="#2563eb" />
        <ScoreBar label="🎨 Creative" value={vector.creativity} color="#059669" />
        <ScoreBar label="🌪️ Chaos" value={vector.chaos} color="#dc2626" />
        <ScoreBar label="🌑 Darkness" value={vector.darkness} color="#8b5cf6" />
      </div>

      {bestPartner && (
        <div className="best-partner-match-card">
          <div className="match-card-top">
            <div className="match-badge">
              <Heart size={14} className="partner-heart" />
              <span>#1 BEST PARTNER MATCH</span>
            </div>
            <span className="match-percent">
              {bestPartner.compatibilityScore}% SYNC
            </span>
          </div>

          <div className="match-duo-row">
            <span className="duo-avatar">{bestPartner.playerAvatar}</span>
            <div>
              <strong className="duo-name">{bestPartner.playerName}</strong>
              <div className="compat-label">
                {bestPartner.compatibilityLabel}
              </div>
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

export const Results: React.FC<ResultsProps> = ({
  room,
  myId,
  isHost,
  onNextRound,
  onRematch,
}) => {
  const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);
  const personalityReports = room.personalityReports;

  return (
    <motion.main
      key="results"
      className="results-layout"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      {/* INTERMISSION SCREEN */}
      {room.status === 'intermission' && (
        <>
          <div className="results-headline-banner">
            <div className="results-emoji-burst">🤖</div>
            <div>
              <span className="splash-eyebrow">
                ⚡ ROUND {room.lastResult?.round || 1} OF {room.totalRounds || 3} — AI VERDICT ⚡
              </span>
              <h1 className="results-title">
                RANKINGS <span className="gradient-arcade-text">REVEALED!</span>
              </h1>
              <p className="results-subtitle">
                The AI judge has automatically ranked all answers. Opponent answers remain secret!
              </p>
            </div>
          </div>

          <div className="results-arcade-grid">
            <section className="results-main-area">
              {/* RANKED ANSWERS PODIUM */}
              {room.lastResult?.rankedAnswers &&
                room.lastResult.rankedAnswers.length > 0 && (
                  <div className="ranked-answers-podium-card">
                    <div className="podium-header">
                      <Award size={22} className="text-neon-yellow" />
                      <div>
                        <h2>🤖 AI JUDGE RANKINGS</h2>
                        <p>
                          Scored automatically for humor, logic, and originality. Opponent answers hidden until end game!
                        </p>
                      </div>
                    </div>

                    <div className="podium-answers-list">
                      {room.lastResult.rankedAnswers.map(
                        (item: RankedAnswer, idx: number) => {
                          const isMine = item.authors.some(a => a.id === myId);
                          return (
                            <motion.div
                              key={item.text + idx}
                              className={`podium-rank-row rank-item-${item.rank} ${
                                item.isMatch ? 'hivemind-match-row' : ''
                              }`}
                              initial={{ opacity: 0, x: -30 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.12 }}
                            >
                              <div className="podium-rank-medal">{item.medal}</div>
                              <div className="podium-answer-body">
                                {isMine ? (
                                  <div className="podium-quote podium-quote-mine">
                                    "{item.text}"{' '}
                                    <span className="your-answer-badge">
                                      YOUR SUBMISSION
                                    </span>
                                  </div>
                                ) : (
                                  <div className="podium-quote podium-quote-hidden">
                                    <LockKeyhole
                                      size={14}
                                      className="text-neon-cyan"
                                    />
                                    <span>
                                      🔒 Secret Answer · Ranked & Evaluated by AI Judge
                                    </span>
                                  </div>
                                )}

                                {/* AI Tags */}
                                <div className="podium-tags-row">
                                  {item.tags.map(tag => (
                                    <TagBadge key={tag} tag={tag} />
                                  ))}
                                </div>

                                {/* AI Reason */}
                                <div className="ai-verdict-reason">
                                  <span className="ai-bot-icon">🤖</span>
                                  <em>{item.aiReason}</em>
                                </div>

                                {/* Score stats mini pill */}
                                <div className="podium-score-pill">
                                  <span className="pts-badge">
                                    {item.pointsAwarded > 0 ? '+' : ''}
                                    {item.pointsAwarded} PTS
                                  </span>
                                  <small>
                                    Humor: {item.humorScore} · Logic: {item.logicScore} · Orig: {item.originalityScore}
                                  </small>
                                </div>
                              </div>
                            </motion.div>
                          );
                        }
                      )}
                    </div>
                  </div>
                )}

              {/* POINTS GAINED LIST */}
              {room.lastResult?.results && room.lastResult.results.length > 0 && (
                <div className="round-score-gains-card">
                  <div className="gains-header">
                    <h3>ROUND POINT BREAKDOWN</h3>
                  </div>
                  <div className="gains-list">
                    {room.lastResult.results.map((r: PlayerAward, i: number) => (
                      <div className="gains-row" key={`${r.id}-${i}`}>
                        <div className="gains-player">
                          <span className="gains-avatar">{r.avatar || '🎮'}</span>
                          <strong>{r.name}</strong>
                        </div>
                        <span className="gains-reason">{r.reason}</span>
                        <strong
                          className={
                            r.points < 0 ? 'pts-negative' : 'pts-positive'
                          }
                        >
                          {r.points > 0 ? '+' : ''}
                          {r.points} PTS
                        </strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="intermission-bottom-bar">
                <span className="auto-next-label">
                  <Timer size={16} /> Next round starts automatically…
                </span>
                {isHost && (
                  <motion.button
                    className="primary-arcade-btn btn-neon-purple"
                    onClick={onNextRound}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                  >
                    <span>NEXT ROUND NOW</span>
                    <ArrowRight size={18} />
                  </motion.button>
                )}
              </div>
            </section>

            <aside className="results-sidebar-leaderboard">
              <div className="sidebar-card-box">
                <div className="scoreboard-header">
                  <Trophy size={18} className="text-neon-yellow" />
                  <span>LEADERBOARD</span>
                </div>
                <div className="score-rows-list">
                  {sortedPlayers.map((p, i) => (
                    <div
                      className={`scoreboard-row ${
                        p.id === myId ? 'row-you' : ''
                      }`}
                      key={p.id}
                    >
                      <span className="score-rank-medal">
                        {i === 0
                          ? '🥇'
                          : i === 1
                          ? '🥈'
                          : i === 2
                          ? '🥉'
                          : `#${i + 1}`}
                      </span>
                      <span className="score-avatar-badge">{p.avatar || '🎮'}</span>
                      <div className="score-player-name">
                        <strong>{p.name}</strong>
                      </div>
                      <span className="score-points-total">
                        {p.score} <small>PTS</small>
                      </span>
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
          <span className="splash-eyebrow">
            ⚡ {room.totalRounds || 3} ROUNDS COMPLETE ⚡
          </span>
          <h1 className="champion-title">CHAOS CHAMPION CROWNED!</h1>

          <div className="winner-grand-podium">
            <motion.div
              className="winner-grand-avatar"
              animate={{ rotate: [0, -5, 5, -5, 0], scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              {room.lastResult?.winner?.avatar ||
                sortedPlayers[0]?.avatar ||
                '👑'}
            </motion.div>
            <div className="winner-grand-name">
              {room.lastResult?.winner?.name ||
                sortedPlayers[0]?.name ||
                'Champion'}
            </div>
            <div className="winner-grand-score">
              {room.lastResult?.winner?.score ??
                sortedPlayers[0]?.score ??
                0}{' '}
              TOTAL POINTS
            </div>
          </div>

          <div className="final-podium-card">
            <div className="podium-header">
              <Trophy size={20} className="text-neon-yellow" />
              <h3>FINAL LEADERBOARD</h3>
            </div>
            <div className="final-ranks-list">
              {sortedPlayers.map((p, i) => (
                <div
                  className={`final-rank-item final-place-${i + 1}`}
                  key={p.id}
                >
                  <span className="final-medal">
                    {i === 0
                      ? '🥇 1ST'
                      : i === 1
                      ? '🥈 2ND'
                      : i === 2
                      ? '🥉 3RD'
                      : `#${i + 1}`}
                  </span>
                  <span className="final-avatar">{p.avatar || '🎮'}</span>
                  <strong className="final-name">
                    {p.name} {p.id === myId && <small>(you)</small>}
                  </strong>
                  <span className="final-pts">
                    {p.score} <small>PTS</small>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* PERSONALITY REPORTS & BEST PARTNERS */}
          {personalityReports && personalityReports.length > 0 && (
            <div className="personality-board-section">
              <div className="personality-board-header">
                <Star size={24} className="text-neon-yellow" />
                <div>
                  <h2>🧠 PERSONALITY PROFILES & BEST PARTNERS</h2>
                  <p>
                    Based on your answers, the AI has analyzed your gaming personality and found your perfect match!
                  </p>
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
            <motion.button
              className="primary-arcade-btn btn-neon-pink rematch-btn"
              onClick={onRematch}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
            >
              <Flame size={20} />
              <span>PLAY AGAIN (REMATCH)</span>
            </motion.button>
          )}
        </div>
      )}
    </motion.main>
  );
};

export default Results;
