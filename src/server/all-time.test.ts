import { beforeEach, describe, expect, it } from 'vitest';
import { createPgliteDb, type Db } from './db/client';
import { getAllTimeLeaderboard } from './leaderboard';
import { deleteResult, submitResult } from './results';

const RAHUL = '550e8400-e29b-41d4-a716-446655440000';
const YASH = '9b2f1d3c-5a4e-4c7b-8d6f-1e2a3b4c5d6e';
const MANU = '6fa459ea-ee8a-4ca4-894e-db77e160355e';

const on = (date: string) => new Date(`${date}T12:00:00+05:30`);
const ac = (n: number) => {
  const row = n === 0 ? '🟥🟥🟥🟥🟥' : '🟥'.repeat(n - 1) + '🟩' + '⬜'.repeat(5 - n);
  return `🎬 ABSOLUTE CINEMA\n${row}\n${n} / 5\nhttps://absolute-cinema.in`;
};
const ev = (date: string, n: number, points: number) => {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const [y, m, d] = date.split('-').map(Number);
  const cells = Array.from({ length: 5 }, (_, i) => (i < n - 1 ? '⬜' : i === n - 1 ? '🟩' : '▫️'));
  return `EVARRA? 🎬\n${months[m! - 1]} ${d}, ${y}\n\n${cells.join(' ')}\n\n${n}/5 · ${points} points\nhttps://ysai258.github.io/evarra/`;
};

let db: Db;
beforeEach(async () => {
  db = await createPgliteDb();
});

async function add(player: string, name: string, text: string, date: string) {
  const outcome = await submitResult(db, { playerId: player, playerName: name, text }, on(date));
  if (outcome.status !== 201) throw new Error(`setup failed: ${JSON.stringify(outcome)}`);
  return outcome.result;
}

describe('getAllTimeLeaderboard', () => {
  it('is empty before anyone plays', async () => {
    const board = await getAllTimeLeaderboard(db);
    expect(board.since).toBeNull();
    expect(board.standings).toEqual([]);
    expect(board.games.every((g) => g.entries.length === 0)).toBe(true);
  });

  it('adds up every day, rewarding turning up as well as solving early', async () => {
    // Rahul: three days of Absolute Cinema, 3rd try each time = 60 × 3 = 180.
    await add(RAHUL, 'Rahul', ac(3), '2026-09-26');
    await add(RAHUL, 'Rahul', ac(3), '2026-09-27');
    await add(RAHUL, 'Rahul', ac(3), '2026-09-28');
    // Yash: one perfect day = 100.
    await add(YASH, 'Yash', ac(1), '2026-09-28');

    const board = await getAllTimeLeaderboard(db);
    expect(board.since).toBe('2026-09-26');
    expect(board.standings.map((s) => [s.playerName, s.position, s.points, s.daysPlayed, s.played])).toEqual([
      ['Rahul', 1, 180, 3, 3],
      ['Yash', 2, 100, 1, 1],
    ]);
  });

  it('counts a miss as played but worth nothing, and averages tries over solves only', async () => {
    await add(MANU, 'Manu', ac(2), '2026-09-26');
    await add(MANU, 'Manu', ac(0), '2026-09-27');
    await add(MANU, 'Manu', ac(4), '2026-09-28');

    const acBoard = (await getAllTimeLeaderboard(db)).games.find((g) => g.gameId === 'absolute-cinema')!;
    expect(acBoard.entries[0]).toMatchObject({ played: 3, solved: 2, avgAttempts: 3, points: 80 + 0 + 40 });
  });

  it("ranks Evarra by its own points, and the overall board by hub points", async () => {
    // Rahul solves Evarra on try 1 with 3 clues (455). Yash on try 2 with none (420).
    await add(RAHUL, 'Rahul', ev('2026-09-28', 1, 455), '2026-09-28');
    await add(YASH, 'Yash', ev('2026-09-28', 2, 420), '2026-09-28');

    const board = await getAllTimeLeaderboard(db);
    const evBoard = board.games.find((g) => g.gameId === 'evarra')!;
    expect(evBoard.usesNativePoints).toBe(true);
    expect(evBoard.entries.map((e) => [e.playerName, e.points])).toEqual([
      ['Rahul', 455],
      ['Yash', 420],
    ]);
    // Overall uses the same 100/80/… scale for every game, so clues don't matter there.
    expect(board.standings.map((s) => [s.playerName, s.points])).toEqual([
      ['Rahul', 100],
      ['Yash', 80],
    ]);
    expect(board.standings[0]!.perGame.evarra).toEqual({ played: 1, solved: 1, points: 100 });
  });

  it('gives equal records the same position', async () => {
    await add(RAHUL, 'Rahul', ac(2), '2026-09-28');
    await add(YASH, 'Yash', ac(2), '2026-09-28');
    const board = await getAllTimeLeaderboard(db);
    expect(board.standings.map((s) => s.position)).toEqual([1, 1]);
    expect(board.games.find((g) => g.gameId === 'absolute-cinema')!.entries.map((e) => e.position)).toEqual([1, 1]);
  });

  it('breaks a points tie by solves, then by fewer games needed', async () => {
    // Both on 100 points: Rahul in one game, Yash in two games (60 + 40). Rahul ranks higher.
    await add(RAHUL, 'Rahul', ac(1), '2026-09-27');
    await add(YASH, 'Yash', ac(3), '2026-09-27');
    await add(YASH, 'Yash', ac(4), '2026-09-28');
    const board = await getAllTimeLeaderboard(db);
    // Yash has more solves (2 vs 1), which is the first tie-breaker.
    expect(board.standings.map((s) => s.playerName)).toEqual(['Yash', 'Rahul']);
  });

  it('shows current names and forgets deleted results', async () => {
    const r = await add(RAHUL, 'Rahul', ac(1), '2026-09-27');
    await add(RAHUL, 'Rahul K', ac(2), '2026-09-28');
    await deleteResult(db, r.id);
    const board = await getAllTimeLeaderboard(db);
    expect(board.standings).toEqual([expect.objectContaining({ playerName: 'Rahul K', points: 80, played: 1 })]);
  });
});
