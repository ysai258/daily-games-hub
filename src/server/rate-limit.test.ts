import { beforeEach, describe, expect, it } from 'vitest';
import { createPgliteDb, type Db } from './db/client';
import { hitRateLimit } from './rate-limit';

let db: Db;
beforeEach(async () => {
  db = await createPgliteDb();
});

describe('hitRateLimit', () => {
  const rule = { limit: 3, windowMs: 60_000 };
  const t0 = new Date('2026-09-26T10:00:00Z');

  it('allows up to the limit, then blocks', async () => {
    const hits = [];
    for (let i = 0; i < 4; i += 1) hits.push(await hitRateLimit(db, 'ip:1', rule, t0));
    expect(hits).toEqual([false, false, false, true]);
  });

  it('starts a fresh window once the old one has passed', async () => {
    for (let i = 0; i < 4; i += 1) await hitRateLimit(db, 'ip:1', rule, t0);
    expect(await hitRateLimit(db, 'ip:1', rule, new Date(t0.getTime() + 61_000))).toBe(false);
  });

  it('counts each key separately', async () => {
    for (let i = 0; i < 4; i += 1) await hitRateLimit(db, 'ip:1', rule, t0);
    expect(await hitRateLimit(db, 'ip:2', rule, t0)).toBe(false);
  });
});
