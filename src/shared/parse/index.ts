import { addDays, formatDayMonth } from '../date';
import { GAMES, type GameId } from '../games';
import { parseAaduGajala } from './aadu-gajala';
import { parseAbsoluteCinema } from './absolute-cinema';
import { normalizeShareText, type GameParser, type ParseOutcome } from './common';
import { parseEvarra } from './evarra';
import { parsePattukunte } from './pattukunte-pattucheera';

export type { ParsedResult, ParseOutcome } from './common';
export { normalizeShareText } from './common';

export const MAX_SHARE_TEXT_LENGTH = 2000;

const PARSERS: Record<GameId, GameParser> = {
  'absolute-cinema': parseAbsoluteCinema,
  'aadu-gajala': parseAaduGajala,
  evarra: parseEvarra,
  'pattukunte-pattucheera': parsePattukunte,
};

/**
 * The title each game prints, for when a phone's share sheet sends the text without
 * its link (Absolute Cinema's `navigator.share` passes the URL separately).
 */
const TITLE_MARKERS: Record<GameId, RegExp> = {
  'absolute-cinema': /ABSOLUTE CINEMA/i,
  'aadu-gajala': /ఆడు గజాల ఆడు|#AaduGajalaAadu/,
  evarra: /EVARRA\?/,
  'pattukunte-pattucheera': /Pattukunte Pattucheera Day/i,
};

export type DetectOutcome = { ok: true; gameId: GameId } | { ok: false; error: string };

/** Decides which game a share text came from — by its link first, then its title. */
export function detectGame(rawText: string): DetectOutcome {
  const text = normalizeShareText(rawText).toLowerCase();
  const byUrl = GAMES.filter((g) => g.shareUrlMarkers.some((m) => text.includes(m.toLowerCase())));
  const byTitle = GAMES.filter((g) => TITLE_MARKERS[g.id].test(normalizeShareText(rawText)));
  const found = new Set([...byUrl, ...byTitle].map((g) => g.id));

  if (found.size === 1) return { ok: true, gameId: [...found][0]! };
  if (found.size > 1) return { ok: false, error: 'That looks like more than one result. Paste one game at a time.' };
  return {
    ok: false,
    error: `That doesn't look like a result from ${GAMES.map((g) => g.name).join(', ')}. Use the game's Share or Copy button, then paste here.`,
  };
}

/**
 * Turns a pasted share text into a result. Runs on both sides: the browser for an
 * instant preview, the server as the check that counts.
 *
 * The result is filed under the game's own date when its text has one, else under
 * `pasteDate` (the IST day of the paste). Only today's or yesterday's game (IST) is
 * accepted. Yesterday is needed because days don't line up: a friend in the US is
 * still playing the 27th's Evarra after India has moved on to the 28th, and anyone
 * who finishes at 11:55 pm IST and pastes at 12:05 am is a day behind the hub.
 */
export function parseShareText(rawText: string, pasteDate: string): ParseOutcome {
  if (rawText.trim() === '') return { ok: false, error: "Paste your game's share text first." };
  if (rawText.length > MAX_SHARE_TEXT_LENGTH) {
    return { ok: false, error: 'That text is too long to be a game result.' };
  }

  const detected = detectGame(rawText);
  if (!detected.ok) return detected;
  const parsed = PARSERS[detected.gameId](normalizeShareText(rawText), pasteDate);
  if (!parsed.ok) return parsed;

  const { ownDate, ...rest } = parsed.result;
  const gameDate = ownDate ?? pasteDate;
  const gameId = detected.gameId;
  if (gameDate > pasteDate) {
    return {
      ok: false,
      gameId,
      error: `This result is for ${formatDayMonth(gameDate)}, which hasn't started in India yet. Add it after midnight IST.`,
    };
  }
  if (gameDate < addDays(pasteDate, -1)) {
    return {
      ok: false,
      gameId,
      error: `This result is for ${formatDayMonth(gameDate)}. Only today's or yesterday's game can be added.`,
    };
  }
  return { ok: true, result: { ...rest, gameDate } };
}
