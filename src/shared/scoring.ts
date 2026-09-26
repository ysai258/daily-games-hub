/**
 * Cross-game scoring.
 *
 * All four games share one shape: up to 5 attempts, solved on attempt N or not at
 * all. That makes a single comparable number honest without changing any game's
 * meaning: solving on the first attempt is 100%, each extra attempt costs 20%, and
 * a miss is 0%. It is exactly Absolute Cinema's own 100/80/60/40/20 table.
 *
 * Evarra's native points (which also charge for clues) are shown on its own
 * leaderboard but deliberately left out of this number — no other game has clues.
 */
export type ScoredResult = {
  won: boolean;
  attempts: number;
  maxAttempts: number;
  points: number | null;
};

export function normalizedScore(result: Pick<ScoredResult, 'won' | 'attempts' | 'maxAttempts'>): number {
  if (!result.won) return 0;
  return (result.maxAttempts + 1 - result.attempts) / result.maxAttempts;
}

/** "3/5", "X/5", or "3/5 · 340 pts" when the game has native points. */
export function resultLabel(result: ScoredResult): string {
  const base = result.won ? `${result.attempts}/${result.maxAttempts}` : `X/${result.maxAttempts}`;
  return result.points === null ? base : `${base} · ${result.points} pts`;
}

/**
 * Per-game ordering: solved beats unsolved, then native points (higher first),
 * then fewer attempts, then whoever submitted first.
 */
export function compareResults<T extends ScoredResult & { submittedAt: string }>(a: T, b: T): number {
  if (a.won !== b.won) return a.won ? -1 : 1;
  if (a.points !== null && b.points !== null && a.points !== b.points) return b.points - a.points;
  if (a.won && a.attempts !== b.attempts) return a.attempts - b.attempts;
  return a.submittedAt.localeCompare(b.submittedAt);
}

export function formatPercent(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}
