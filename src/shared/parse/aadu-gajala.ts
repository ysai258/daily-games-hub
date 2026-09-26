import { dateParts, formatDayMonth } from '../date';
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

export const parseAaduGajala: GameParser = (text, gameDate) => {
  if (/aadu-gajala\.vercel\.app\/?\?date=/.test(text) || /\bthis song\b/.test(text)) {
    return fail('aadu-gajala', "This is a replay of a past day's song. Only today's game counts.");
  }

  const header = HEADER.exec(text);
  const row = text.split('\n').find((line) => ROW.test(line));
  const win = WIN.exec(text);
  const loss = LOSS.test(text);
  if (!header || !row || (!win && !loss)) return fail('aadu-gajala', unreadable('Aadu Gajala'));

  const day = Number(header[1]);
  const month = MONTHS.indexOf(header[2]!) + 1;
  const today = dateParts(gameDate);
  if (day !== today.day || month !== today.month) {
    const claimed = `${day} ${header[2]![0]}${header[2]!.slice(1).toLowerCase()}`;
    return fail('aadu-gajala', `This result is for ${claimed}, but today's game is ${formatDayMonth(gameDate)}.`);
  }

  const won = win !== null;
  const attempts = win ? Number(win[1]) : MAX_ATTEMPTS;
  if (!rowMatchesScore(symbols(row), { won, attempts }, { hit: '■', miss: ['×', '△'], unused: '□' })) {
    return fail('aadu-gajala', SCORE_MISMATCH);
  }
  return success({ gameId: 'aadu-gajala', won, attempts, maxAttempts: MAX_ATTEMPTS, points: null });
};
