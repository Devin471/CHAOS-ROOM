// =========================================================
// CHAOS ROOM — SHARED TYPES v3.0 (AUTO-RANK + PERSONALITY)
// =========================================================

export type Avatar = '🦊'|'🐸'|'🐼'|'🐙'|'🦄'|'🐯'|'🐧'|'🦝'|'🤖'|'👽'|'🦖'|'🍕';

export type RoundType = 'creative' | 'reaction' | 'mini' | 'trivia' | 'chaos';

export type RoundPhase = 'submitting';

export type RoomStatus = 'lobby' | 'playing' | 'intermission' | 'finished';

export type SecretRole = 'TRICKSTER' | 'CREW';

// Auto-ranking tags assigned by the AI engine
export type AnswerTag =
  | 'HILARIOUS'
  | 'GENIUS'
  | 'LOGICAL'
  | 'CREATIVE'
  | 'CHAOTIC'
  | 'WTF?'
  | 'LAZY'
  | 'DARK HUMOR'
  | 'HIVEMIND'
  | 'SAVAGE'
  | 'POETIC'
  | 'CRINGE'
  | 'NEGATIVE';

// Personality archetype derived from answers
export type PersonalityType =
  | 'The Comedian'
  | 'The Genius'
  | 'The Chaotic One'
  | 'The Poet'
  | 'The Savage'
  | 'The Logical Mind'
  | 'The Wild Card'
  | 'The Philosopher';

export interface Player {
  id: string;
  name: string;
  avatar: string;
  ready: boolean;
  score: number;
  connected: boolean;
}

export interface PersonalityVector {
  humor: number;
  logic: number;
  creativity: number;
  chaos: number;
  darkness: number;
  laziness: number;
}

export interface AuthorInfo {
  id: string;
  name: string;
  avatar: string;
}

export interface RankedAnswer {
  rank: number;
  medal: string;
  text: string;
  authors: AuthorInfo[];
  isMatch: boolean;
  pointsAwarded: number;
  tags: AnswerTag[];
  aiReason: string;
  humorScore: number;
  logicScore: number;
  originalityScore: number;
}

export interface PlayerAward {
  id: string;
  name: string;
  avatar: string;
  points: number;
  reason: string;
  rank?: number;
  medal?: string;
  isMatch?: boolean;
  answer?: string;
  tags?: AnswerTag[];
}

export interface RoundChallenge {
  prompt: string;
  question?: string;
  answer?: string;
  scramble?: string;
  hint?: string;
}

export interface PublicRound {
  type: RoundType;
  name: string;
  icon: string;
  subtitle: string;
  prompt: string;
  number: number;
  seconds: number;
  phase: RoundPhase;
  endsAt: number;
  startedAt: number;
  reactionStarted: boolean;
  challenge: RoundChallenge | null;
  submittedCount: number;
  questionIndex: number;
  totalQuestions: number;
}

export interface FeedItem {
  id: string;
  text: string;
  at: number;
}

export interface RoundReveal {
  prompt: string;
  challenge: RoundChallenge | null;
}

export interface RoundResultData {
  round: number;
  questionIndex: number;
  name: string;
  type: RoundType;
  results: PlayerAward[];
  rankedAnswers: RankedAnswer[] | null;
  reveal: RoundReveal;
  winner?: {
    id: string;
    name: string;
    avatar: string;
    score: number;
  } | null;
}

export interface PartnerMatch {
  playerId: string;
  playerName: string;
  playerAvatar: string;
  compatibilityScore: number;
  compatibilityLabel: string;
  sharedTags: AnswerTag[];
  reason: string;
}

export interface PersonalityReport {
  playerId: string;
  playerName: string;
  playerAvatar: string;
  archetype: PersonalityType;
  archetypeEmoji: string;
  description: string;
  topTag: AnswerTag;
  vector: PersonalityVector;
  bestPartners: PartnerMatch[];
}

export interface PublicRoom {
  code: string;
  hostId: string;
  status: RoomStatus;
  players: Player[];
  roundIndex: number;
  questionsPerRound: number;
  round: PublicRound | null;
  lastResult: RoundResultData | null;
  feed: FeedItem[];
  personalityReports?: PersonalityReport[] | null;
}

export interface PrivateRoundData {
  type: RoundType;
  phase: RoundPhase;
  prompt: string;
  role: SecretRole | null;
  myAnswer: string | null;
  alreadySubmitted: boolean;
  reactionStarted: boolean;
}

export interface EmojiBurstData {
  id: string;
  emoji: string;
  senderName: string;
  senderAvatar: string;
}

export interface DBPlayerRecord {
  id?: number;
  socket_id?: string;
  nickname: string;
  avatar: string;
  games_played: number;
  wins: number;
  highest_score: number;
  created_at?: Date;
  updated_at?: Date;
}

export interface DBMatchRecord {
  id?: number;
  room_code: string;
  player_count: number;
  winner_name: string;
  winner_avatar: string;
  winner_score: number;
  rounds_played: number;
  created_at?: Date;
}
