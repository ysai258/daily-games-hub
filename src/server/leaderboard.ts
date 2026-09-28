import { and, countDistinct, desc, eq, gte, inArray, min, sql } from 'drizzle-orm';
import { addDays, istToday } from '@/shared/date';
import { ENABLED_GAMES, type GameId } from '@/shared/games';
import { compareResults } from '@/shared/scoring';
import type {
  AllTimeGameEntry,
  AllTimeLeaderboard,
  AllTimeStanding,
  DayLeaderboard,
  PlayerDay,
  RankedResult,
  ResultDto,
  Standing,
} from '@/shared/types';
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

/**
 * Hub points for one result, in SQL: 100 for a first-try solve, 20 fewer per extra
 * try, 0 for a miss. The same rule as `normalizedScore` in shared/scoring.ts, × 100.
 */
const hubPoints = sql<number>`round(case when ${gameResults.won} then (${gameResults.maxAttempts} + 1 - ${gameResults.attempts}) * 100.0 / ${gameResults.maxAttempts} else 0 end)`;
const asInt = (expr: ReturnType<typeof sql>) => sql<number>`coalesce(${expr}, 0)::int`.mapWith(Number);

/** Positions where equal records share a place: 1, 1, 3, … */
function withPositions<T>(sorted: T[], same: (a: T, b: T) => boolean): (T & { position: number })[] {
  const out: (T & { position: number })[] = [];
  sorted.forEach((item, i) => {
    const prev = out[i - 1];
    out.push({ ...item, position: prev && same(prev, item) ? prev.position : i + 1 });
  });
  return out;
}

/**
 * Every result ever recorded, added up.
 *
 * Ranking is by total points, so turning up every day counts as well as solving
 * early. An average would crown whoever played once and got lucky. Ties go to
 * more solves, then to whoever needed fewer games.
 */
export async function getAllTimeLeaderboard(db: Db): Promise<AllTimeLeaderboard> {
  const enabled = ENABLED_GAMES.map((g) => g.id);
  const inEnabled = inArray(gameResults.gameId, enabled);

  const rows = await db
    .select({
      playerId: gameResults.playerId,
      playerName: players.name,
      gameId: gameResults.gameId,
      played: asInt(sql`count(*)`),
      solved: asInt(sql`sum(case when ${gameResults.won} then 1 else 0 end)`),
      solvedAttempts: asInt(sql`sum(case when ${gameResults.won} then ${gameResults.attempts} else 0 end)`),
      nativePoints: asInt(sql`sum(${gameResults.points})`),
      hubPoints: asInt(sql`sum(${hubPoints})`),
    })
    .from(gameResults)
    .innerJoin(players, eq(players.id, gameResults.playerId))
    .where(inEnabled)
    .groupBy(gameResults.playerId, players.name, gameResults.gameId);

  const days = await db
    .select({ playerId: gameResults.playerId, days: countDistinct(gameResults.gameDate).mapWith(Number) })
    .from(gameResults)
    .where(inEnabled)
    .groupBy(gameResults.playerId);
  const daysByPlayer = new Map(days.map((d) => [d.playerId, d.days]));

  const [first] = await db.select({ since: min(gameResults.gameDate) }).from(gameResults).where(inEnabled);

  const games = ENABLED_GAMES.map((game) => {
    const usesNativePoints = game.hasNativePoints;
    const entries = rows
      .filter((r) => r.gameId === game.id)
      .map((r): Omit<AllTimeGameEntry, 'position'> => ({
        playerId: r.playerId,
        playerName: r.playerName,
        played: r.played,
        solved: r.solved,
        avgAttempts: r.solved > 0 ? Math.round((r.solvedAttempts / r.solved) * 10) / 10 : null,
        points: usesNativePoints ? r.nativePoints : r.hubPoints,
      }))
      .sort(
        (a, b) =>
          b.points - a.points ||
          b.solved - a.solved ||
          (a.avgAttempts ?? Infinity) - (b.avgAttempts ?? Infinity) ||
          a.played - b.played ||
          a.playerName.localeCompare(b.playerName),
      );
    return {
      gameId: game.id,
      usesNativePoints,
      entries: withPositions(
        entries,
        (a, b) => a.points === b.points && a.solved === b.solved && a.avgAttempts === b.avgAttempts && a.played === b.played,
      ),
    };
  });

  const byPlayer = new Map<string, Omit<AllTimeStanding, 'position'>>();
  for (const r of rows) {
    const s = byPlayer.get(r.playerId) ?? {
      playerId: r.playerId,
      playerName: r.playerName,
      daysPlayed: daysByPlayer.get(r.playerId) ?? 0,
      played: 0,
      solved: 0,
      points: 0,
      perGame: {},
    };
    s.played += r.played;
    s.solved += r.solved;
    s.points += r.hubPoints;
    s.perGame[r.gameId as GameId] = { played: r.played, solved: r.solved, points: r.hubPoints };
    byPlayer.set(r.playerId, s);
  }
  const standings = withPositions(
    [...byPlayer.values()].sort(
      (a, b) =>
        b.points - a.points || b.solved - a.solved || a.played - b.played || a.playerName.localeCompare(b.playerName),
    ),
    (a, b) => a.points === b.points && a.solved === b.solved && a.played === b.played,
  );

  return { since: first?.since ?? null, standings, games };
}
