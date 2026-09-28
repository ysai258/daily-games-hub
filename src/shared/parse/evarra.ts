import { DateTime } from 'luxon';
import { HUB_ZONE } from '../date';
import { MAX_ATTEMPTS, SCORE_MISMATCH, fail, rowMatchesScore, success, symbols, unreadable, type GameParser } from './common';

/**
 * EVARRA? 🎬
 * September 26, 2026
 *
 * ⬜ 🟩 ▫️ ▫️ ▫️  🟨🟨       ← ⬜ wrong · 🟩 correct · ▫️ unused, then one 🟨 per clue
 *
 * 2/5 · 390 points         ← "X/5 · 0 points" for a loss
 *
 * Scoring (evarra src/engine/scoring.ts): a win is worth 500 − 80 per extra stage
 * − 15 per clue, never below 100. Only the upper bound is enforced here, so a
 * future tweak to the clue cost doesn't start rejecting real results.
 *
 * Evarra's day starts at the player's own midnight, not IST's. A friend in the US is
 * still on the 27th's star while India is on the 28th, so the result is filed under
 * the date it prints, not the day it was pasted.
 */
const DATE_LINE = /^([A-Z][a-z]+ \d{1,2}, \d{4})$/m;
const SCORE = /^([1-5]|X)\/5\s*[·•.]\s*(\d+) points$/m;
const GRID = /^([⬜🟩▫](?:\s*[⬜🟩▫]){4})(?:\s+(🟨*))?$/mu;

const MAX_SCORE = 500;
const STAGE_PENALTY = 80;
const MIN_WINNING_SCORE = 100;

export const parseEvarra: GameParser = (text) => {
  if (/^MULTIPLAYER$/m.test(text)) {
    return fail('evarra', "That's a multiplayer room result. Paste the daily game's result instead.");
  }

  const dateLine = DATE_LINE.exec(text);
  const score = SCORE.exec(text);
  const grid = GRID.exec(text);
  if (!dateLine || !score || !grid) return fail('evarra', unreadable('Evarra'));

  const claimed = DateTime.fromFormat(dateLine[1]!, 'LLLL d, yyyy', { zone: HUB_ZONE, locale: 'en' });
  if (!claimed.isValid) return fail('evarra', unreadable('Evarra'));
  const ownDate = claimed.toISODate()!;

  const won = score[1] !== 'X';
  const attempts = won ? Number(score[1]) : MAX_ATTEMPTS;
  const points = Number(score[2]);
  if (!rowMatchesScore(symbols(grid[1]!), { won, attempts }, { hit: '🟩', miss: ['⬜'], unused: '▫' })) {
    return fail('evarra', SCORE_MISMATCH);
  }

  const ceiling = MAX_SCORE - (attempts - 1) * STAGE_PENALTY;
  const pointsValid = won ? points >= MIN_WINNING_SCORE && points <= ceiling && points % 5 === 0 : points === 0;
  if (!pointsValid) return fail('evarra', `${points} points isn't possible for that result.`);

  return success({ gameId: 'evarra', won, attempts, maxAttempts: MAX_ATTEMPTS, points, ownDate });
};
