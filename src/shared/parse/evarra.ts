import { DateTime } from 'luxon';
import { HUB_ZONE, formatDayMonth } from '../date';
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
 */
const DATE_LINE = /^([A-Z][a-z]+ \d{1,2}, \d{4})$/m;
const SCORE = /^([1-5]|X)\/5\s*[·•.]\s*(\d+) points$/m;
const GRID = /^([⬜🟩▫](?:\s*[⬜🟩▫]){4})(?:\s+(🟨*))?$/mu;

const MAX_SCORE = 500;
const STAGE_PENALTY = 80;
const MIN_WINNING_SCORE = 100;

export const parseEvarra: GameParser = (text, gameDate) => {
  if (/^MULTIPLAYER$/m.test(text)) {
    return fail('evarra', "That's a multiplayer room result. Paste the daily game's result instead.");
  }

  const dateLine = DATE_LINE.exec(text);
  const score = SCORE.exec(text);
  const grid = GRID.exec(text);
  if (!dateLine || !score || !grid) return fail('evarra', unreadable('Evarra'));

  const claimed = DateTime.fromFormat(dateLine[1]!, 'LLLL d, yyyy', { zone: HUB_ZONE, locale: 'en' });
  if (!claimed.isValid) return fail('evarra', unreadable('Evarra'));
  const claimedKey = claimed.toISODate()!;
  if (claimedKey !== gameDate) {
    return fail('evarra', `This result is for ${formatDayMonth(claimedKey)}, but today's game is ${formatDayMonth(gameDate)}.`);
  }

  const won = score[1] !== 'X';
  const attempts = won ? Number(score[1]) : MAX_ATTEMPTS;
  const points = Number(score[2]);
  if (!rowMatchesScore(symbols(grid[1]!), { won, attempts }, { hit: '🟩', miss: ['⬜'], unused: '▫' })) {
    return fail('evarra', SCORE_MISMATCH);
  }

  const ceiling = MAX_SCORE - (attempts - 1) * STAGE_PENALTY;
  const pointsValid = won ? points >= MIN_WINNING_SCORE && points <= ceiling && points % 5 === 0 : points === 0;
  if (!pointsValid) return fail('evarra', `${points} points isn't possible for that result.`);

  return success({ gameId: 'evarra', won, attempts, maxAttempts: MAX_ATTEMPTS, points });
};
