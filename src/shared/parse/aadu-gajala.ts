import { addDays, dateParts } from '../date';
import { MAX_ATTEMPTS, SCORE_MISMATCH, fail, rowMatchesScore, success, symbols, unreadable, type GameParser } from './common';

/**
 * ఆడు గజాల ఆడు #26 SEP
 *
 * I guessed today's song with the 7-second clue — 3/5 attempts! 🎶   (or "… — X/5! 🎶")
 * × △ ■ □ □                ← × wrong · △ skipped · ■ correct · □ unused
 * …
 * Play now: https://aadu-gajala.vercel.app         (past days add ?date=YYYY-MM-DD)
 */
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const HEADER = /ఆడు గజాల ఆడు\s*#(\d{1,2})\s+([A-Z]{3})/;
const WIN = /\b([1-5])\/5 attempts?\b/;
const LOSS = /\bX\/5\b/;
const ROW = /^[■△×□](?:\s[■△×□]){4}$/;

/**
 * The header has a day and month but no year. Pick the most recent such date that
 * isn't more than a day past the paste day, so "#31 DEC" pasted on 1 Jan means last year.
 */
function resolveDayMonth(day: number, month: number, pasteDate: string): string | null {
  const { year } = dateParts(pasteDate);
  const latest = addDays(pasteDate, 1);
  for (const y of [year + 1, year, year - 1]) {
    const key = `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const parts = dateParts(key);
    if (parts.month !== month || parts.day !== day) return null; // e.g. 30 FEB
    if (key <= latest) return key;
  }
  return null;
}

export const parseAaduGajala: GameParser = (text, pasteDate) => {
  if (/aadu-gajala\.vercel\.app\/?\?date=/.test(text) || /\bthis song\b/.test(text)) {
    return fail('aadu-gajala', "This is a replay of a past day's song. Only today's game counts.");
  }

  const header = HEADER.exec(text);
  const row = text.split('\n').find((line) => ROW.test(line));
  const win = WIN.exec(text);
  const loss = LOSS.test(text);
  if (!header || !row || (!win && !loss)) return fail('aadu-gajala', unreadable('Aadu Gajala'));

  const ownDate = resolveDayMonth(Number(header[1]), MONTHS.indexOf(header[2]!) + 1, pasteDate);
  if (!ownDate) return fail('aadu-gajala', unreadable('Aadu Gajala'));

  const won = win !== null;
  const attempts = win ? Number(win[1]) : MAX_ATTEMPTS;
  if (!rowMatchesScore(symbols(row), { won, attempts }, { hit: '■', miss: ['×', '△'], unused: '□' })) {
    return fail('aadu-gajala', SCORE_MISMATCH);
  }
  return success({ gameId: 'aadu-gajala', won, attempts, maxAttempts: MAX_ATTEMPTS, points: null, ownDate });
};
