import type { GameId } from '@/shared/games';
import { normalizedScore, resultLabel } from '@/shared/scoring';
import type { ResultDto } from '@/shared/types';
import type { gameResults } from './db/schema';

type ResultRow = typeof gameResults.$inferSelect;

export function toResultDto(row: ResultRow, playerName: string): ResultDto {
  return {
    id: row.id,
    playerId: row.playerId,
    playerName,
    gameId: row.gameId as GameId,
    gameDate: row.gameDate,
    won: row.won,
    attempts: row.attempts,
    maxAttempts: row.maxAttempts,
    points: row.points,
    label: resultLabel(row),
    normalized: normalizedScore(row),
    source: 'share-text',
    submittedAt: row.createdAt.toISOString(),
  };
}
