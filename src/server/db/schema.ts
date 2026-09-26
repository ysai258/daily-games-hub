import { sql } from 'drizzle-orm';
import { boolean, date, index, integer, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

/** A browser that has entered a name. The id lives in that browser's localStorage. */
export const players = pgTable('players', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/** One player's result for one game on one IST day — the first one pasted wins. */
export const gameResults = pgTable(
  'game_results',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    playerId: uuid('player_id')
      .notNull()
      .references(() => players.id, { onDelete: 'cascade' }),
    gameId: text('game_id').notNull(),
    gameDate: date('game_date', { mode: 'string' }).notNull(),
    won: boolean('won').notNull(),
    attempts: integer('attempts').notNull(),
    maxAttempts: integer('max_attempts').notNull(),
    /** The game's native points, where it has them (Evarra). */
    points: integer('points'),
    /** How the result reached the hub. Today always 'share-text' (self-reported). */
    source: text('source').notNull(),
    rawText: text('raw_text').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('game_results_player_game_date').on(t.playerId, t.gameId, t.gameDate),
    index('idx_game_results_date_game').on(t.gameDate, t.gameId),
    index('idx_game_results_date_player').on(t.gameDate, t.playerId),
  ],
);

/** Fixed-window request counters for rate limiting (serverless has no shared memory). */
export const rateLimits = pgTable('rate_limits', {
  key: text('key').primaryKey(),
  windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
  count: integer('count').notNull(),
});
