import React from 'react';
import { motion } from 'framer-motion';
import { Users, LockKeyhole, Check } from 'lucide-react';

interface VotingProps {
  answer: string;
  setAnswer: (val: string) => void;
  alreadySubmitted: boolean;
  submittedCount: number;
  totalPlayers: number;
  onSubmit: () => void;
}

export const Voting: React.FC<VotingProps> = ({
  answer,
  setAnswer,
  alreadySubmitted,
  submittedCount,
  totalPlayers,
  onSubmit,
}) => {
  return (
    <div className="arcade-input-stage">
      <div className="input-stage-top">
        <label htmlFor="answer-input">YOUR ANSWER:</label>
        <span className="live-submission-count">
          <Users size={13} /> {submittedCount} / {totalPlayers} locked in
        </span>
      </div>

      <div className="input-box-wrapper">
        <textarea
          id="answer-input"
          className="arcade-answer-textarea"
          value={answer}
          onChange={e => setAnswer(e.target.value.slice(0, 200))}
          placeholder={
            alreadySubmitted
              ? '✅ Answer locked in! AI Judge is evaluating...'
              : 'Type your funniest, weirdest, or most logical answer here... Be creative!'
          }
          maxLength={200}
          disabled={alreadySubmitted}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSubmit();
            }
          }}
        />
      </div>

      <div className="answer-submit-actions">
        <div className="char-count-pill">{answer.length} / 200</div>
        {alreadySubmitted ? (
          <div className="locked-in-stamp">
            <Check size={18} />
            <span>LOCKED IN — AI IS JUDGING 🤖</span>
          </div>
        ) : (
          <motion.button
            className="primary-arcade-btn btn-neon-green"
            disabled={!answer.trim()}
            onClick={onSubmit}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
          >
            <LockKeyhole size={18} />
            <span>LOCK IN ANSWER</span>
          </motion.button>
        )}
      </div>
    </div>
  );
};

export default Voting;
