-- =========================================================
-- CHAOS ROOM — POSTGRESQL DATABASE SCHEMA
-- Compatible with Railway, Render, Supabase, Neon & Local Postgres
-- =========================================================

-- 1. Players & Career Stats Table
CREATE TABLE IF NOT EXISTS players (
  id SERIAL PRIMARY KEY,
  nickname VARCHAR(50) UNIQUE NOT NULL,
  avatar VARCHAR(10) DEFAULT '🦊',
  games_played INT DEFAULT 0,
  wins INT DEFAULT 0,
  highest_score INT DEFAULT 0,
  total_score INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Matches History Table
CREATE TABLE IF NOT EXISTS matches (
  id SERIAL PRIMARY KEY,
  room_code VARCHAR(10) NOT NULL,
  player_count INT NOT NULL,
  winner_name VARCHAR(50),
  winner_avatar VARCHAR(10),
  winner_score INT DEFAULT 0,
  rounds_played INT DEFAULT 7,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Match Scores per Player
CREATE TABLE IF NOT EXISTS match_scores (
  id SERIAL PRIMARY KEY,
  match_id INT REFERENCES matches(id) ON DELETE CASCADE,
  player_name VARCHAR(50) NOT NULL,
  player_avatar VARCHAR(10),
  final_score INT NOT NULL,
  placement INT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Answers Archive (Ranked Prompts & Hivemind Matches)
CREATE TABLE IF NOT EXISTS answer_archive (
  id SERIAL PRIMARY KEY,
  match_id INT REFERENCES matches(id) ON DELETE CASCADE,
  round_number INT NOT NULL,
  round_type VARCHAR(20) NOT NULL,
  prompt TEXT NOT NULL,
  answer_text TEXT NOT NULL,
  author_name VARCHAR(50) NOT NULL,
  is_hivemind_match BOOLEAN DEFAULT FALSE,
  votes_received INT DEFAULT 0,
  rank_position INT DEFAULT 1,
  points_awarded INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for lightning-fast leaderboard queries
CREATE INDEX IF NOT EXISTS idx_players_wins ON players(wins DESC);
CREATE INDEX IF NOT EXISTS idx_players_highest_score ON players(highest_score DESC);
CREATE INDEX IF NOT EXISTS idx_matches_room_code ON matches(room_code);
