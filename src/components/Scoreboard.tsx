import React from 'react';
import { Trophy, Users } from 'lucide-react';
import type { PlayerSummary } from '../types.js';

interface ScoreboardProps {
  players: PlayerSummary[];
  myId: string;
  title?: string;
}

export const Scoreboard: React.FC<ScoreboardProps> = ({
  players,
  myId,
  title = 'CURRENT SCORES',
}) => {
  const sorted = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="sidebar-card-box">
      <div className="sidebar-box-header">
        <Trophy size={16} className="text-neon-yellow" />
        <span>{title}</span>
      </div>
      <div className="live-score-list">
        {sorted.map((p, i) => (
          <div
            className={`live-score-item ${p.id === myId ? 'item-you' : ''}`}
            key={p.id}
          >
            <span className="item-rank">{i === 0 ? '👑' : `#${i + 1}`}</span>
            <span className="item-avatar">{p.avatar || '🎮'}</span>
            <div className="item-name-col">
              <strong>
                {p.name} {p.id === myId && <small>(you)</small>}
              </strong>
              <small className="item-ready-text">{p.score} PTS</small>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Scoreboard;
