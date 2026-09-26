import { api, isRetryable } from './api';
import { readLocal, writeLocal } from './storage';

/**
 * A pasted result that couldn't be saved (offline, server down). It is kept here and
 * re-sent when the browser comes back online or the dashboard opens, so a finished
 * game is never lost to a flaky connection. The server's unique key makes re-sending
 * safe: a repeat is answered as a duplicate, not stored twice.
 */
export const PENDING_KEY = 'daily_games_pending_results';

export type PendingSubmission = {
  playerId: string;
  playerName: string;
  text: string;
  /** The IST day the player pasted on — kept so a retry after midnight still counts for it. */
  gameDate: string;
  gameId: string;
  queuedAt: string;
};

export function readPending(): PendingSubmission[] {
  try {
    const parsed: unknown = JSON.parse(readLocal(PENDING_KEY) ?? '[]');
    return Array.isArray(parsed) ? (parsed as PendingSubmission[]) : [];
  } catch {
    return [];
  }
}

function writePending(items: PendingSubmission[]): void {
  writeLocal(PENDING_KEY, JSON.stringify(items));
}

export function queuePending(item: PendingSubmission): void {
  const others = readPending().filter((p) => !(p.gameId === item.gameId && p.gameDate === item.gameDate));
  writePending([...others, item]);
}

export type FlushReport = { saved: number; failed: { gameId: string; error: string }[]; remaining: number };

/** Sends every queued result once. Permanent failures are dropped and reported. */
export async function flushPending(): Promise<FlushReport> {
  const report: FlushReport = { saved: 0, failed: [], remaining: 0 };
  const keep: PendingSubmission[] = [];
  for (const item of readPending()) {
    const res = await api.submit(item);
    if (res.ok) report.saved += 1;
    else if (isRetryable(res.status)) keep.push(item);
    else report.failed.push({ gameId: item.gameId, error: res.error });
  }
  writePending(keep);
  report.remaining = keep.length;
  return report;
}
