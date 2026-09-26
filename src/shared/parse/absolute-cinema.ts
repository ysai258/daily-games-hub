import { MAX_ATTEMPTS, SCORE_MISMATCH, fail, rowMatchesScore, success, symbols, unreadable, type GameParser } from './common';

/**
 * 🎬 ABSOLUTE CINEMA
 * 🟥🟥🟩⬜⬜
 * 3 / 5            ← "0 / 5" for a loss
 *
 * The text carries no date or puzzle number, so the hub's own IST day is the only
 * date there is, and a Time Machine replay of an old day cannot be told apart.
 */
const ROW = /^[🟥🟩⬜]{5}$/u;
const SCORE = /^([0-5])\s*\/\s*5$/;

export const parseAbsoluteCinema: GameParser = (text) => {
  const lines = text.split('\n');
  const row = lines.find((line) => ROW.test(line.replace(/\s+/g, '')));
  const score = lines.map((line) => SCORE.exec(line)).find((m) => m !== null);
  if (!row || !score) return fail('absolute-cinema', unreadable('Absolute Cinema'));

  const n = Number(score[1]);
  const won = n > 0;
  const attempts = won ? n : MAX_ATTEMPTS;
  if (!rowMatchesScore(symbols(row), { won, attempts }, { hit: '🟩', miss: ['🟥'], unused: '⬜' })) {
    return fail('absolute-cinema', SCORE_MISMATCH);
  }
  return success({ gameId: 'absolute-cinema', won, attempts, maxAttempts: MAX_ATTEMPTS, points: null });
};
