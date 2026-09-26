import { lt, sql } from 'drizzle-orm';
import type { Db } from './db/client';
import { rateLimits } from './db/schema';

export type RateLimitRule = { limit: number; windowMs: number };

/** Paste submissions: generous for a friend group, tight enough to stop a loop. */
export const SUBMIT_LIMIT: RateLimitRule = { limit: 30, windowMs: 10 * 60_000 };

/**
 * Fixed-window counter in Postgres, because serverless instances share no memory.
 * One atomic upsert per request: a stale window restarts at 1, otherwise it counts up.
 */
export async function hitRateLimit(db: Db, key: string, rule: RateLimitRule, now: Date = new Date()): Promise<boolean> {
  const windowFloor = new Date(now.getTime() - rule.windowMs);
  const [row] = await db
    .insert(rateLimits)
    .values({ key, windowStart: now, count: 1 })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`case when ${rateLimits.windowStart} < ${windowFloor.toISOString()} then 1 else ${rateLimits.count} + 1 end`,
        windowStart: sql`case when ${rateLimits.windowStart} < ${windowFloor.toISOString()} then ${now.toISOString()}::timestamptz else ${rateLimits.windowStart} end`,
      },
    })
    .returning({ count: rateLimits.count });

  // Occasionally sweep counters nobody has touched for a day.
  if (Math.random() < 0.01) {
    await db.delete(rateLimits).where(lt(rateLimits.windowStart, new Date(now.getTime() - 86_400_000)));
  }
  return (row?.count ?? 0) > rule.limit;
}

export function clientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || headers.get('x-real-ip') || 'unknown';
}
