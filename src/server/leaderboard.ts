import { and, desc, eq, gte } from 'drizzle-orm';
import { addDays, istToday } from '@/shared/date';
import { ENABLED_GAMES, type GameId } from '@/shared/games';
import { compareResults } from '@/shared/scoring';
import type { DayLeaderboard, PlayerDay, RankedResult, ResultDto, Standing } from '@/shared/types';
import type { Db } from './db/client';
import { gameResults, players } from './db/schema';
import { toResultDto } from './dto';

const HISTORY_DAYS = 60;

async function selectResults(db: Db, where: ReturnType<typeof and>): Promise<ResultDto[]> {
  const rows = await db
    .select({ result: gameResults, playerName: players.name })
    .from(gameResults)
    .innerJoin(players, eq(players.id, gameResults.playerId))
    .where(where)
    .orderBy(gameResults.createdAt);
  return rows.map((row) => toResultDto(row.result, row.playerName));
}

function rank(results: ResultDto[]): RankedResult[] {
  const sorted = [...results].sort(compareResults);
  const ranked: RankedResult[] = [];
  sorted.forEach((result, i) => {
    const prev = ranked[i - 1];
    const tied =
      prev !== undefined && prev.won === result.won && prev.attempts === result.attempts && prev.points === result.points;
    ranked.push({ ...result, position: tied ? prev.position : i + 1 });
  });
  return ranked;
}

/**
 * Standings are ordered by games played, then by combined normalized score. They
 * are a "who played what" view first — see shared/scoring.ts for why the combined
 * score is comparable at all.
 */
function standings(results: ResultDto[]): Standing[] {
  const byPlayer = new Map<string, Standing & { lastAt: string }>();
  for (const r of results) {
    const s = byPlayer.get(r.playerId) ?? {
      playerId: r.playerId,
      playerName: r.playerName,
      gamesPlayed: 0,
      gamesSolved: 0,
      totalScore: 0,
      results: {},
      lastAt: r.submittedAt,
    };
    s.gamesPlayed += 1;
    s.gamesSolved += r.won ? 1 : 0;
    s.totalScore += r.normalized;
    s.results[r.gameId] = r;
    s.lastAt = r.submittedAt > s.lastAt ? r.submittedAt : s.lastAt;
    byPlayer.set(r.playerId, s);
  }
  return [...byPlayer.values()]
    .sort(
      (a, b) =>
        b.gamesPlayed - a.gamesPlayed ||
        b.totalScore - a.totalScore ||
        a.lastAt.localeCompare(b.lastAt),
    )
    .map(({ lastAt: _lastAt, ...s }) => s);
}

const enabledIds = new Set<GameId>(ENABLED_GAMES.map((g) => g.id));

export async function getDayLeaderboard(db: Db, date: string): Promise<DayLeaderboard> {
  const results = (await selectResults(db, and(eq(gameResults.gameDate, date)))).filter((r) =>
    enabledIds.has(r.gameId),
  );
  return {
    date,
    standings: standings(results),
    games: ENABLED_GAMES.map((g) => ({ gameId: g.id, results: rank(results.filter((r) => r.gameId === g.id)) })),
  };
}

export async function getPlayerDay(db: Db, playerId: string, date: string): Promise<PlayerDay> {
  const results = await selectResults(db, and(eq(gameResults.playerId, playerId), eq(gameResults.gameDate, date)));
  return { date, results };
}

export async function getPlayerHistory(db: Db, playerId: string, now: Date = new Date()): Promise<PlayerDay[]> {
  const since = addDays(istToday(now), -HISTORY_DAYS);
  const rows = await db
    .select({ result: gameResults, playerName: players.name })
    .from(gameResults)
    .innerJoin(players, eq(players.id, gameResults.playerId))
    .where(and(eq(gameResults.playerId, playerId), gte(gameResults.gameDate, since)))
    .orderBy(desc(gameResults.gameDate), gameResults.createdAt);

  const days = new Map<string, ResultDto[]>();
  for (const row of rows) {
    const dto = toResultDto(row.result, row.playerName);
    days.set(dto.gameDate, [...(days.get(dto.gameDate) ?? []), dto]);
  }
  return [...days.entries()].map(([date, results]) => ({ date, results }));
}

/** Everything for one day including the raw pasted text — admin only. */
export async function getAdminDay(db: Db, date: string) {
  const rows = await db
    .select({ result: gameResults, playerName: players.name })
    .from(gameResults)
    .innerJoin(players, eq(players.id, gameResults.playerId))
    .where(eq(gameResults.gameDate, date))
    .orderBy(desc(gameResults.createdAt));
  return rows.map((row) => ({ ...toResultDto(row.result, row.playerName), rawText: row.result.rawText }));
}
