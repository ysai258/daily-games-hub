import { addDays, daysBetween } from '../date';
import { MAX_ATTEMPTS, SCORE_MISMATCH, fail, rowMatchesScore, success, symbols, unreadable, type GameParser } from './common';

/**
 * Pattukunte Pattucheera Day 1587: 3/5          ← "0/5" for a loss
 *
 * 🟥🟥🟩⬛⬛                                      ← archive games print "(Time Travelled)" and 🟦
 *
 * The day number counts whole days since 2022-05-23 00:00 IST (the game's
 * `getDayCount`, measured from 2022-05-22T18:30Z), so it pins the result to one IST day.
 */
const HEADER = /Pattukunte Pattucheera Day (\d+)(\(Time Travelled\))?:\s*([0-5])\/5/i;
const ROW = /^[🟥🟩⬛🟦]{5}$/u;
const DAY_ZERO = '2022-05-23';

export function pattukunteDayNumber(gameDate: string): number {
  return daysBetween(DAY_ZERO, gameDate);
}

export const parsePattukunte: GameParser = (text) => {
  const header = HEADER.exec(text);
  const row = text.split('\n').find((line) => ROW.test(line.replace(/\s+/g, '')));
  if (!header || !row) return fail('pattukunte-pattucheera', unreadable('Pattukunte Pattucheera'));

  if (header[2]) {
    return fail('pattukunte-pattucheera', "This is a time-travelled game from a past day. Only today's game counts.");
  }

  const ownDate = addDays(DAY_ZERO, Number(header[1]));

  const n = Number(header[3]);
  const won = n > 0;
  const attempts = won ? n : MAX_ATTEMPTS;
  if (!rowMatchesScore(symbols(row), { won, attempts }, { hit: '🟩', miss: ['🟥'], unused: '⬛' })) {
    return fail('pattukunte-pattucheera', SCORE_MISMATCH);
  }
  return success({ gameId: 'pattukunte-pattucheera', won, attempts, maxAttempts: MAX_ATTEMPTS, points: null, ownDate });
};
