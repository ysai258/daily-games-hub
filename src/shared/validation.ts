import { z } from 'zod';
import { isValidDateKey } from './date';
import { MAX_SHARE_TEXT_LENGTH } from './parse';

export const MAX_NAME_LENGTH = 30;

/**
 * Trims, collapses inner whitespace and drops control characters. Names are always
 * rendered as text (React escapes them), so HTML in a name shows up literally
 * rather than running.
 */
export function cleanPlayerName(raw: string): string {
  return raw
    .replace(/[\u0000-\u001F\u007F-\u009F​-‏‪-‮⁦-⁩]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export const playerNameSchema = z
  .string()
  .transform(cleanPlayerName)
  .pipe(
    z
      .string()
      .min(1, 'Enter a name.')
      .max(MAX_NAME_LENGTH, `Keep your name to ${MAX_NAME_LENGTH} characters.`),
  );

export const playerIdSchema = z.uuid({ message: 'Invalid player id.' });

export const dateKeySchema = z.string().refine(isValidDateKey, 'Dates look like 2026-09-26.');

export const submitResultSchema = z.object({
  playerId: playerIdSchema,
  playerName: playerNameSchema,
  text: z.string().min(1).max(MAX_SHARE_TEXT_LENGTH, 'That text is too long to be a game result.'),
  /** The IST day the player pasted on (differs from "now" only for a queued retry). */
  gameDate: dateKeySchema.optional(),
});

export const renamePlayerSchema = z.object({ name: playerNameSchema });

export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Invalid request.';
}
