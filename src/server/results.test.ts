import { beforeEach, describe, expect, it } from 'vitest';
import { createPgliteDb, type Db } from './db/client';
import { getDayLeaderboard, getPlayerHistory } from './leaderboard';
import { deleteResult, renamePlayer, submitResult } from './results';

const NOW = new Date('2026-09-26T13:00:00+05:30');
const RAHUL = '550e8400-e29b-41d4-a716-446655440000';
const RAHUL_TWO = '6fa459ea-ee8a-4ca4-894e-db77e160355e';
const YASH = '9b2f1d3c-5a4e-4c7b-8d6f-1e2a3b4c5d6e';

const ac = (n: number) => {
  const row = n === 0 ? '🟥🟥🟥🟥🟥' : '🟥'.repeat(n - 1) + '🟩' + '⬜'.repeat(5 - n);
  return `🎬 ABSOLUTE CINEMA\n${row}\n${n} / 5\n\nhttps://absolute-cinema.in`;
};
const pp = (n: number, day = 1587) => {
  const row = n === 0 ? '🟥🟥🟥🟥🟥' : '🟥'.repeat(n - 1) + '🟩' + '⬛'.repeat(5 - n);
  return `Pattukunte Pattucheera Day ${day}: ${n}/5\n\n${row}\n\nhttps://pattukunte-pattucheera.netlify.app`;
};

let db: Db;
beforeEach(async () => {
  db = await createPgliteDb();
});

describe('submitResult', () => {
  it('records a pasted result against the IST day it was pasted', async () => {
    const outcome = await submitResult(db, { playerId: RAHUL, playerName: 'Rahul', text: ac(3) }, NOW);
    expect(outcome).toMatchObject({
      status: 201,
      result: { gameId: 'absolute-cinema', gameDate: '2026-09-26', won: true, attempts: 3, label: '3/5', playerName: 'Rahul' },
    });
  });

  it('uses the IST date, not the UTC one, just after midnight', async () => {
    const justAfterMidnight = new Date('2026-09-27T00:05:00+05:30');
    const outcome = await submitResult(db, { playerId: RAHUL, playerName: 'Rahul', text: ac(2) }, justAfterMidnight);
    expect(outcome).toMatchObject({ status: 201, result: { gameDate: '2026-09-27' } });
  });

  it('refuses a second, different paste for the same game and day — first result wins', async () => {
    await submitResult(db, { playerId: RAHUL, playerName: 'Rahul', text: ac(4) }, NOW);
    const second = await submitResult(db, { playerId: RAHUL, playerName: 'Rahul', text: ac(1) }, NOW);
    expect(second).toMatchObject({ status: 409, result: { attempts: 4 } });
  });

  it('treats re-sending the same result as a harmless retry, not a new row', async () => {
    await submitResult(db, { playerId: RAHUL, playerName: 'Rahul', text: ac(4) }, NOW);
    const retry = await submitResult(db, { playerId: RAHUL, playerName: 'Rahul', text: ac(4) }, NOW);
    expect(retry).toMatchObject({ status: 200, duplicate: true });
    const board = await getDayLeaderboard(db, '2026-09-26');
    expect(board.standings).toHaveLength(1);
  });

  it('allows the same game again the next day', async () => {
    await submitResult(db, { playerId: RAHUL, playerName: 'Rahul', text: ac(4) }, NOW);
    const tomorrow = new Date('2026-09-27T09:00:00+05:30');
    expect(await submitResult(db, { playerId: RAHUL, playerName: 'Rahul', text: ac(2) }, tomorrow)).toMatchObject({
      status: 201,
    });
  });

  it('keeps two players with the same name apart', async () => {
    await submitResult(db, { playerId: RAHUL, playerName: 'Rahul', text: ac(2) }, NOW);
    await submitResult(db, { playerId: RAHUL_TWO, playerName: 'Rahul', text: ac(5) }, NOW);
    const board = await getDayLeaderboard(db, '2026-09-26');
    expect(board.games.find((g) => g.gameId === 'absolute-cinema')!.results.map((r) => r.playerId)).toEqual([
      RAHUL,
      RAHUL_TWO,
    ]);
  });

  it('accepts a queued retry for yesterday but nothing older or in the future', async () => {
    const yesterday = await submitResult(
      db,
      { playerId: RAHUL, playerName: 'Rahul', text: pp(3, 1586), gameDate: '2026-09-25' },
      NOW,
    );
    expect(yesterday).toMatchObject({ status: 201, result: { gameDate: '2026-09-25' } });

    const old = await submitResult(db, { playerId: RAHUL, playerName: 'Rahul', text: ac(3), gameDate: '2026-09-20' }, NOW);
    expect(old).toMatchObject({ status: 400 });

    const future = await submitResult(
      db,
      { playerId: RAHUL, playerName: 'Rahul', text: ac(3), gameDate: '2026-09-27' },
      NOW,
    );
    expect(future).toMatchObject({ status: 400 });
  });

  it('rejects unparseable or wrong-day text with the reason', async () => {
    const outcome = await submitResult(db, { playerId: RAHUL, playerName: 'Rahul', text: pp(3, 1500) }, NOW);
    expect(outcome).toMatchObject({ status: 422, error: expect.stringMatching(/today's or yesterday's/) });
  });

  it("files a dated game under the game's own day, even when pasted after India's midnight", async () => {
    // A US friend: played Pattukunte Day 1586 (25 Sep) and pasted at 00:30 IST on the 26th.
    const justAfterMidnight = new Date('2026-09-26T00:30:00+05:30');
    const outcome = await submitResult(db, { playerId: RAHUL, playerName: 'Rahul', text: pp(3, 1586) }, justAfterMidnight);
    expect(outcome).toMatchObject({ status: 201, result: { gameDate: '2026-09-25' } });
    // …and it blocks a second paste of that same day's game, naming the day.
    const again = await submitResult(db, { playerId: RAHUL, playerName: 'Rahul', text: pp(1, 1586) }, NOW);
    expect(again).toMatchObject({ status: 409, error: expect.stringMatching(/for 25 Sep/) });
  });

  it("doesn't let a queued paste from yesterday reach back two days", async () => {
    const outcome = await submitResult(
      db,
      { playerId: RAHUL, playerName: 'Rahul', text: pp(3, 1585), gameDate: '2026-09-25' },
      NOW,
    );
    expect(outcome).toMatchObject({ status: 422 });
  });

  it('updates the display name on every submission and on rename', async () => {
    await submitResult(db, { playerId: RAHUL, playerName: 'Rahul', text: ac(2) }, NOW);
    await renamePlayer(db, RAHUL, 'Rahul K');
    const board = await getDayLeaderboard(db, '2026-09-26');
    expect(board.standings[0]!.playerName).toBe('Rahul K');
  });

  it('lets the admin delete a bad result so it can be pasted again', async () => {
    const first = await submitResult(db, { playerId: RAHUL, playerName: 'Rahul', text: ac(5) }, NOW);
    if (first.status !== 201) throw new Error('setup failed');
    expect(await deleteResult(db, first.result.id)).toBe(true);
    expect(await submitResult(db, { playerId: RAHUL, playerName: 'Rahul', text: ac(2) }, NOW)).toMatchObject({
      status: 201,
    });
  });
});

describe('getDayLeaderboard', () => {
  it('orders standings by games played, then combined score', async () => {
    await submitResult(db, { playerId: RAHUL, playerName: 'Rahul', text: ac(1) }, NOW);
    await submitResult(db, { playerId: YASH, playerName: 'Yashwanth', text: ac(3) }, NOW);
    await submitResult(db, { playerId: YASH, playerName: 'Yashwanth', text: pp(0) }, NOW);

    const board = await getDayLeaderboard(db, '2026-09-26');
    expect(board.standings.map((s) => [s.playerName, s.gamesPlayed, s.gamesSolved])).toEqual([
      ['Yashwanth', 2, 1],
      ['Rahul', 1, 1],
    ]);
    expect(board.standings[0]!.totalScore).toBeCloseTo(0.6);

    const acBoard = board.games.find((g) => g.gameId === 'absolute-cinema')!;
    expect(acBoard.results.map((r) => [r.playerName, r.position, r.label])).toEqual([
      ['Rahul', 1, '1/5'],
      ['Yashwanth', 2, '3/5'],
    ]);
  });

  it('gives tied results the same position', async () => {
    await submitResult(db, { playerId: RAHUL, playerName: 'Rahul', text: ac(2) }, NOW);
    await submitResult(db, { playerId: YASH, playerName: 'Yashwanth', text: ac(2) }, NOW);
    const board = await getDayLeaderboard(db, '2026-09-26');
    expect(board.games.find((g) => g.gameId === 'absolute-cinema')!.results.map((r) => r.position)).toEqual([1, 1]);
  });
});

describe('getPlayerHistory', () => {
  it('groups a player’s results by day, newest first', async () => {
    await submitResult(db, { playerId: RAHUL, playerName: 'Rahul', text: pp(3, 1586), gameDate: '2026-09-25' }, NOW);
    await submitResult(db, { playerId: RAHUL, playerName: 'Rahul', text: ac(2) }, NOW);
    await submitResult(db, { playerId: RAHUL, playerName: 'Rahul', text: pp(1) }, NOW);
    const history = await getPlayerHistory(db, RAHUL);
    expect(history.map((d) => [d.date, d.results.length])).toEqual([
      ['2026-09-26', 2],
      ['2026-09-25', 1],
    ]);
  });
});
