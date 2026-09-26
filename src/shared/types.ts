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
