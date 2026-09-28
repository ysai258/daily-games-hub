import type { GameId } from './games';

/** A recorded result as the API returns it. */
export type ResultDto = {
  id: string;
  playerId: string;
  playerName: string;
  gameId: GameId;
  gameDate: string;
  won: boolean;
  attempts: number;
  maxAttempts: number;
  points: number | null;
  /** "3/5", "X/5", "2/5 · 390 pts" */
  label: string;
  /** 0–1, comparable across games (see shared/scoring.ts). */
  normalized: number;
  source: 'share-text';
  submittedAt: string;
};

export type RankedResult = ResultDto & { position: number };

export type Standing = {
  playerId: string;
  playerName: string;
  gamesPlayed: number;
  gamesSolved: number;
  /** Sum of normalized scores; out of `gamesPlayed`. */
  totalScore: number;
  results: Partial<Record<GameId, ResultDto>>;
};

export type DayLeaderboard = {
  date: string;
  standings: Standing[];
  games: { gameId: GameId; results: RankedResult[] }[];
};

export type PlayerDay = {
  date: string;
  results: ResultDto[];
};

export type ApiError = { error: string };

/** One player's all-time record in one game. */
export type AllTimeGameEntry = {
  playerId: string;
  playerName: string;
  position: number;
  played: number;
  solved: number;
  /** Average attempts over solved games only; null when none were solved. */
  avgAttempts: number | null;
  /** The number the board is ranked by: the game's own points if it has them, else hub points. */
  points: number;
};

/** One player's all-time record across every game. */
export type AllTimeStanding = {
  playerId: string;
  playerName: string;
  position: number;
  daysPlayed: number;
  played: number;
  solved: number;
  /** Hub points: 100 for a first-try solve, −20 per extra try, 0 for a miss. */
  points: number;
  perGame: Partial<Record<GameId, { played: number; solved: number; points: number }>>;
};

export type AllTimeLeaderboard = {
  /** First day anyone recorded a result, or null before any results exist. */
  since: string | null;
  standings: AllTimeStanding[];
  games: { gameId: GameId; usesNativePoints: boolean; entries: AllTimeGameEntry[] }[];
};
