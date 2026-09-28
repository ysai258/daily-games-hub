import { and, eq, sql } from 'drizzle-orm';
import { addDays, formatDayMonth, istToday } from '@/shared/date';
import { getGame } from '@/shared/games';
import { parseShareText } from '@/shared/parse';
import type { ResultDto } from '@/shared/types';
import type { Db } from './db/client';
import { gameResults, players } from './db/schema';
import { toResultDto } from './dto';

export type SubmitInput = {
  playerId: string;
  playerName: string;
  text: string;
  gameDate?: string;
};

export type SubmitOutcome =
  | { status: 201; result: ResultDto }
  | { status: 200; result: ResultDto; duplicate: true }
  | { status: 409; error: string; result: ResultDto }
  | { status: 400 | 422; error: string };

/**
 * Records a pasted share text.
 *
 * The result is filed under the game's own date when its text states one (Aadu
 * Gajala, Evarra, Pattukunte), else under the IST day of the paste (Absolute
 * Cinema). That keeps a US friend's evening Evarra on the day of the star they
 * actually played. The client may name the day it pasted on, so a result queued
 * offline just before midnight still counts for that day. Either way only today's
 * or yesterday's game is accepted.
 *
 * Policy: the first result for (player, game, day) wins. Every game locks a day once
 * it's finished, so a different second result can only be a replay or an edit.
 * Re-sending the same result (a retry) is answered 200 without a new row.
 */
export async function submitResult(db: Db, input: SubmitInput, now: Date = new Date()): Promise<SubmitOutcome> {
  const today = istToday(now);
  const pasteDate = input.gameDate ?? today;
  if (pasteDate > today) return { status: 400, error: "That date hasn't happened yet in IST." };
  if (pasteDate < addDays(today, -1)) return { status: 400, error: 'Results can only be added for today.' };

  const parsed = parseShareText(input.text, pasteDate);
  if (!parsed.ok) return { status: 422, error: parsed.error };
  // parseShareText allows up to a day before the paste day; a queued paste from
  // yesterday must not reach back two days.
  const gameDate = parsed.result.gameDate;
  if (gameDate < addDays(today, -1)) return { status: 422, error: 'Results can only be added for today or yesterday.' };
  const game = getGame(parsed.result.gameId);
  if (!game.enabled) return { status: 422, error: `${game.name} isn't part of the hub right now.` };

  await upsertPlayer(db, input.playerId, input.playerName, now);

  const [inserted] = await db
    .insert(gameResults)
    .values({
      playerId: input.playerId,
      gameId: parsed.result.gameId,
      gameDate,
      won: parsed.result.won,
      attempts: parsed.result.attempts,
      maxAttempts: parsed.result.maxAttempts,
      points: parsed.result.points,
      source: 'share-text',
      rawText: input.text,
    })
    .onConflictDoNothing({ target: [gameResults.playerId, gameResults.gameId, gameResults.gameDate] })
    .returning();

  if (inserted) return { status: 201, result: toResultDto(inserted, input.playerName) };

  const [existing] = await db
    .select()
    .from(gameResults)
    .where(
      and(
        eq(gameResults.playerId, input.playerId),
        eq(gameResults.gameId, parsed.result.gameId),
        eq(gameResults.gameDate, gameDate),
      ),
    );
  if (!existing) throw new Error('Result conflict without an existing row');

  const existingDto = toResultDto(existing, input.playerName);
  const sameResult =
    existing.won === parsed.result.won &&
    existing.attempts === parsed.result.attempts &&
    existing.points === parsed.result.points;
  if (sameResult) return { status: 200, result: existingDto, duplicate: true };

  return {
    status: 409,
    error: `You already added ${game.name} for ${gameDate === today ? 'today' : formatDayMonth(gameDate)} (${existingDto.label}). Only the first result counts.`,
    result: existingDto,
  };
}

async function upsertPlayer(db: Db, id: string, name: string, now: Date): Promise<void> {
  await db
    .insert(players)
    .values({ id, name, createdAt: now, updatedAt: now })
    .onConflictDoUpdate({ target: players.id, set: { name, updatedAt: now } });
}

/** Renames a player everywhere — names are joined in at read time. */
export async function renamePlayer(db: Db, id: string, name: string): Promise<void> {
  await db
    .insert(players)
    .values({ id, name })
    .onConflictDoUpdate({ target: players.id, set: { name, updatedAt: sql`now()` } });
}

export async function deleteResult(db: Db, id: string): Promise<boolean> {
  const deleted = await db.delete(gameResults).where(eq(gameResults.id, id)).returning({ id: gameResults.id });
  return deleted.length > 0;
}
