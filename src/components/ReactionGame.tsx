import React from 'react';
import { motion } from 'framer-motion';

interface ReactionGameProps {
  reactionStarted: boolean;
  reactionMs: number | null;
  onTap: () => void;
}

export const ReactionGame: React.FC<ReactionGameProps> = ({
  reactionStarted,
  reactionMs,
  onTap,
}) => {
  return (
    <div className="reaction-game-stage">
      <motion.button
        className={`arcade-big-buzzer ${reactionStarted ? 'buzzer-go' : ''} ${reactionMs !== null ? 'buzzer-hit' : ''}`}
        onClick={onTap}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.92 }}
      >
        <div className="buzzer-inner">
          {reactionMs !== null ? (
            <>
              <span className="buzzer-score-blast">⚡ {reactionMs}ms</span>
              <small>TAP RECORDED!</small>
            </>
          ) : reactionStarted ? (
            <>
              <span className="buzzer-go-text">TAP NOW! ⚡</span>
              <small>FASTEST PLAYER WINS!</small>
            </>
          ) : (
            <>
              <span className="buzzer-wait-text">WAIT FOR GREEN…</span>
              <small>DON'T TAP EARLY!</small>
            </>
          )}
        </div>
      </motion.button>
    </div>
  );
};

export default ReactionGame;
