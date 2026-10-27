import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || null;

let pool: pg.Pool | null = null;
let isConnected = false;

// In-memory fallback if PostgreSQL is not currently running or configured
const memoryStats = {
  matches: [] as any[],
  players: new Map<string, { nickname: string; avatar: string; games_played: number; wins: number; highest_score: number; total_score: number }>()
};

export async function initDatabase(): Promise<boolean> {
  if (!connectionString) {
    console.log('ℹ️ [PostgreSQL] No DATABASE_URL provided. Operating in fast in-memory mode. (Set DATABASE_URL to persist to PostgreSQL on Railway/Render/Neon/Local).');
    return false;
  }

  try {
    pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
      connectionTimeoutMillis: 4000
    });

    const client = await pool.connect();
    console.log('✅ [PostgreSQL] Connected successfully to database!');

    // Initialize tables if they do not exist
    await client.query(`
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

      CREATE TABLE IF NOT EXISTS match_scores (
        id SERIAL PRIMARY KEY,
        match_id INT REFERENCES matches(id) ON DELETE CASCADE,
        player_name VARCHAR(50) NOT NULL,
        player_avatar VARCHAR(10),
        final_score INT NOT NULL,
        placement INT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    client.release();
    isConnected = true;
    return true;
  } catch (err: any) {
    console.warn('⚠️ [PostgreSQL] Database connection failed or timed out:', err.message);
    console.log('ℹ️ Running in memory mode. All party features work seamlessly.');
    isConnected = false;
    return false;
  }
}

export async function saveMatchResult(
  roomCode: string,
  winner: { name: string; avatar: string; score: number } | null,
  players: { name: string; avatar: string; score: number }[],
  roundsPlayed: number = 7
) {
  // Update in-memory tracker
  memoryStats.matches.push({
    roomCode,
    winner,
    players,
    completedAt: new Date()
  });

  players.forEach((p, idx) => {
    const isWinner = winner && winner.name === p.name;
    const existing = memoryStats.players.get(p.name) || {
      nickname: p.name,
      avatar: p.avatar,
      games_played: 0,
      wins: 0,
      highest_score: 0,
      total_score: 0
    };
    existing.games_played++;
    if (isWinner) existing.wins++;
    existing.highest_score = Math.max(existing.highest_score, p.score);
    existing.total_score += p.score;
    existing.avatar = p.avatar;
    memoryStats.players.set(p.name, existing);
  });

  // If connected to PostgreSQL, insert records
  if (isConnected && pool) {
    try {
      const matchRes = await pool.query(
        `INSERT INTO matches (room_code, player_count, winner_name, winner_avatar, winner_score, rounds_played)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [
          roomCode,
          players.length,
          winner?.name || 'Nobody',
          winner?.avatar || '👑',
          winner?.score || 0,
          roundsPlayed
        ]
      );
      const matchId = matchRes.rows[0]?.id;

      for (let i = 0; i < players.length; i++) {
        const p = players[i];
        const isWinner = winner && winner.name === p.name;

        // Record individual match placement
        await pool.query(
          `INSERT INTO match_scores (match_id, player_name, player_avatar, final_score, placement)
           VALUES ($1, $2, $3, $4, $5)`,
          [matchId, p.name, p.avatar, p.score, i + 1]
        );

        // Upsert player career record
        await pool.query(
          `INSERT INTO players (nickname, avatar, games_played, wins, highest_score, total_score, updated_at)
           VALUES ($1, $2, 1, $3, $4, $5, CURRENT_TIMESTAMP)
           ON CONFLICT (nickname) DO UPDATE SET
             avatar = EXCLUDED.avatar,
             games_played = players.games_played + 1,
             wins = players.wins + EXCLUDED.wins,
             highest_score = GREATEST(players.highest_score, EXCLUDED.highest_score),
             total_score = players.total_score + EXCLUDED.total_score,
             updated_at = CURRENT_TIMESTAMP`,
          [p.name, p.avatar, isWinner ? 1 : 0, p.score, p.score]
        );
      }
      console.log(`💾 [PostgreSQL] Match ${roomCode} archived successfully.`);
    } catch (dbErr: any) {
      console.error('⚠️ [PostgreSQL] Error saving match to DB:', dbErr.message);
    }
  }
}

export async function getTopPlayers(): Promise<any[]> {
  if (isConnected && pool) {
    try {
      const res = await pool.query(
        `SELECT nickname, avatar, wins, games_played, highest_score, total_score
         FROM players
         ORDER BY wins DESC, highest_score DESC
         LIMIT 10`
      );
      return res.rows;
    } catch {
      // Fallback to memory
    }
  }
  return [...memoryStats.players.values()]
    .sort((a, b) => b.wins !== a.wins ? b.wins - a.wins : b.highest_score - a.highest_score)
    .slice(0, 10);
}
