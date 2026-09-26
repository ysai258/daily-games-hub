import type { GameId } from '../games';

export type ParsedResult = {
  gameId: GameId;
  won: boolean;
  /** Attempts used. A miss uses all of them. */
  attempts: number;
  maxAttempts: number;
  /** The game's own points, for games that have them (Evarra). */
  points: number | null;
};

export type ParseOutcome = { ok: true; result: ParsedResult } | { ok: false; error: string; gameId?: GameId };

export type GameParser = (text: string, gameDate: string) => ParseOutcome;

export const MAX_ATTEMPTS = 5;

/**
 * Share text travels through WhatsApp, notes apps and clipboards that each add their
 * own noise: CRLF endings, emoji variation selectors (U+FE0F), curly apostrophes and
 * stray whitespace. Parsers only ever see the cleaned form.
 */
export function normalizeShareText(raw: string): string {
  return raw
    .replace(/\r\n?/g, '\n')
    .replace(/[︎️​]/g, '')
    .replace(/[‘’]/g, "'")
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .trim();
}

export function fail(gameId: GameId, error: string): ParseOutcome {
  return { ok: false, error, gameId };
}

export function success(result: ParsedResult): ParseOutcome {
  return { ok: true, result };
}

/** Splits an emoji row into its symbols, ignoring the spaces some games put between them. */
export function symbols(row: string): string[] {
  return Array.from(row.replace(/\s+/g, ''));
}

/**
 * Every game prints one symbol per attempt: misses, then the hit (for a win), then
 * unused slots. The claimed score must agree with that row, which catches typos and
 * casual edits to the number.
 */
export function rowMatchesScore(
  cells: string[],
  outcome: { won: boolean; attempts: number },
  alphabet: { hit: string; miss: readonly string[]; unused: string },
): boolean {
  if (cells.length !== MAX_ATTEMPTS) return false;
  return cells.every((cell, i) => {
    if (!outcome.won) return alphabet.miss.includes(cell);
    if (i < outcome.attempts - 1) return alphabet.miss.includes(cell);
    if (i === outcome.attempts - 1) return cell === alphabet.hit;
    return cell === alphabet.unused;
  });
}

export const SCORE_MISMATCH = "The score doesn't match the result grid — paste the text exactly as the game shared it.";

export function unreadable(name: string): string {
  return `Couldn't read this ${name} result — paste the whole text exactly as the game shared it.`;
}
