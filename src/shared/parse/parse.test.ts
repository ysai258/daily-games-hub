import { describe, expect, it } from 'vitest';
import { istToday } from '../date';
import { detectGame, parseShareText } from './index';

// Share texts below are the games' real templates, reconstructed from their shipped
// source (see FEASIBILITY.md). The hub's day for these tests is 2026-09-26 (IST).
const DAY = '2026-09-26';

const AC_WIN = `🎬 ABSOLUTE CINEMA
🟥🟥🟩⬜⬜
3 / 5

I guessed today's movie in 3 attempt(s)! Can you beat me?
https://absolute-cinema.in`;

const AC_LOSS = `🎬 ABSOLUTE CINEMA
🟥🟥🟥🟥🟥
0 / 5

Can you guess today's movie?
https://absolute-cinema.in`;

const AG_WIN = `ఆడు గజాల ఆడు #26 SEP

I guessed today’s song with the 7-second clue — 3/5 attempts! 🎶
× △ ■ □ □

Can you beat my score? 👀
Play now: https://aadu-gajala.vercel.app
#AaduGajalaAadu`;

const AG_LOSS = `ఆడు గజాల ఆడు #26 SEP

I couldn't guess today's song — X/5! 🎶
× × △ × ×

Can you guess it? 👀
Play now: https://aadu-gajala.vercel.app
#AaduGajalaAadu`;

const EV_WIN = `EVARRA? 🎬
September 26, 2026

⬜ 🟩 ▫️ ▫️ ▫️  🟨🟨

2/5 · 390 points

Can you beat me?
https://ysai258.github.io/evarra/`;

const EV_LOSS = `EVARRA? 🎬
September 26, 2026

⬜ ⬜ ⬜ ⬜ ⬜

X/5 · 0 points

Can you beat me?
https://ysai258.github.io/evarra/`;

const PP_WIN = `Pattukunte Pattucheera Day 1587: 3/5

🟥🟥🟩⬛⬛

https://pattukunte-pattucheera.netlify.app
#PattukuntePattuCheera`;

const PP_LOSS = `Pattukunte Pattucheera Day 1587: 0/5

🟥🟥🟥🟥🟥

https://pattukunte-pattucheera.netlify.app
#PattukuntePattuCheera`;

function ok(text: string, day = DAY) {
  const outcome = parseShareText(text, day);
  if (!outcome.ok) throw new Error(`expected ok, got: ${outcome.error}`);
  return outcome.result;
}

function err(text: string, day = DAY) {
  const outcome = parseShareText(text, day);
  if (outcome.ok) throw new Error('expected an error');
  return outcome.error;
}

describe('detectGame', () => {
  it('identifies each game from the URL in its share text', () => {
    expect(detectGame(AC_WIN)).toEqual({ ok: true, gameId: 'absolute-cinema' });
    expect(detectGame(AG_WIN)).toEqual({ ok: true, gameId: 'aadu-gajala' });
    expect(detectGame(EV_WIN)).toEqual({ ok: true, gameId: 'evarra' });
    expect(detectGame(PP_WIN)).toEqual({ ok: true, gameId: 'pattukunte-pattucheera' });
  });

  it('falls back to the title when the share sheet dropped the URL', () => {
    const noUrl = AC_WIN.replace('\nhttps://absolute-cinema.in', '');
    expect(detectGame(noUrl)).toEqual({ ok: true, gameId: 'absolute-cinema' });
  });

  it('rejects text from no known game', () => {
    expect(detectGame('Wordle 1,234 3/6')).toMatchObject({ ok: false });
  });

  it('rejects two results pasted together', () => {
    expect(detectGame(`${AC_WIN}\n\n${PP_WIN}`)).toMatchObject({ ok: false, error: expect.stringMatching(/one/i) });
  });
});

describe('Absolute Cinema', () => {
  it('parses a win', () => {
    expect(ok(AC_WIN)).toEqual({ gameId: 'absolute-cinema', won: true, attempts: 3, maxAttempts: 5, points: null, gameDate: DAY });
  });

  it('parses a loss', () => {
    expect(ok(AC_LOSS)).toMatchObject({ won: false, attempts: 5 });
  });

  it('tolerates emoji variation selectors and CRLF line endings from other apps', () => {
    const mangled = AC_WIN.replace(/⬜/g, '⬜\uFE0F').replace(/\n/g, '\r\n');
    expect(ok(mangled)).toMatchObject({ won: true, attempts: 3 });
  });

  it('rejects a score that disagrees with its tiles', () => {
    expect(err(AC_WIN.replace('3 / 5', '1 / 5'))).toMatch(/doesn't match/i);
  });

  it('rejects text missing the tiles', () => {
    expect(err(AC_WIN.replace('🟥🟥🟩⬜⬜\n', ''))).toMatch(/couldn't read/i);
  });
});

describe('Aadu Gajala', () => {
  it('parses a win', () => {
    expect(ok(AG_WIN)).toEqual({ gameId: 'aadu-gajala', won: true, attempts: 3, maxAttempts: 5, points: null, gameDate: DAY });
  });

  it('parses a loss', () => {
    expect(ok(AG_LOSS)).toMatchObject({ won: false, attempts: 5 });
  });

  it("files yesterday's song under yesterday, and refuses anything older", () => {
    expect(ok(AG_WIN.replace('#26 SEP', '#25 SEP'))).toMatchObject({ gameDate: '2026-09-25' });
    expect(err(AG_WIN.replace('#26 SEP', '#24 SEP'))).toMatch(/24 Sep.*today's or yesterday's/);
  });

  it('works out the year across New Year', () => {
    const newYearsEve = AG_WIN.replace('#26 SEP', '#31 DEC');
    expect(ok(newYearsEve, '2027-01-01')).toMatchObject({ gameDate: '2026-12-31' });
  });

  it('rejects a replay of a past day', () => {
    const replay = AG_WIN.replace('today’s song', 'this song').replace(
      'https://aadu-gajala.vercel.app',
      'https://aadu-gajala.vercel.app/?date=2026-09-20',
    );
    expect(err(replay)).toMatch(/past day/i);
  });

  it('rejects a score that disagrees with its symbols', () => {
    expect(err(AG_WIN.replace('× △ ■ □ □', '■ □ □ □ □'))).toMatch(/doesn't match/i);
  });
});

describe('Evarra', () => {
  it('parses a win with its native points', () => {
    expect(ok(EV_WIN)).toEqual({ gameId: 'evarra', won: true, attempts: 2, maxAttempts: 5, points: 390, gameDate: DAY });
  });

  it('parses a loss', () => {
    expect(ok(EV_LOSS)).toMatchObject({ won: false, attempts: 5, points: 0 });
  });

  it('rejects a day that is too old', () => {
    expect(err(EV_WIN.replace('September 26, 2026', 'September 20, 2026'))).toMatch(/20 Sep/);
  });

  it('rejects impossible points', () => {
    expect(err(EV_WIN.replace('390 points', '9000 points'))).toMatch(/points/i);
    expect(err(EV_LOSS.replace('0 points', '200 points'))).toMatch(/points/i);
  });

  it('rejects a multiplayer result', () => {
    const mp = `EVARRA? 🎬\nMULTIPLAYER\n\n10 questions · 3 players\n\n🥇 1st place\nhttps://ysai258.github.io/evarra/`;
    expect(err(mp)).toMatch(/multiplayer/i);
  });
});

describe('Pattukunte Pattucheera', () => {
  it('parses a win', () => {
    expect(ok(PP_WIN)).toEqual({
      gameId: 'pattukunte-pattucheera',
      won: true,
      attempts: 3,
      maxAttempts: 5,
      points: null, gameDate: DAY
    });
  });

  it('parses a loss', () => {
    expect(ok(PP_LOSS)).toMatchObject({ won: false, attempts: 5 });
  });

  it('files the result under the day its number stands for', () => {
    expect(ok(PP_WIN.replace('Day 1587', 'Day 1588'), '2026-09-27')).toMatchObject({ gameDate: '2026-09-27' });
    expect(ok(PP_WIN.replace('Day 1587', 'Day 1586'))).toMatchObject({ gameDate: '2026-09-25' });
    expect(err(PP_WIN.replace('Day 1587', 'Day 1585'))).toMatch(/24 Sep/);
  });

  it('rejects a time-travelled game', () => {
    const tt = PP_WIN.replace('Day 1587:', 'Day 1500(Time Travelled):').replace('🟥🟥🟩', '🟦🟦🟩');
    expect(err(tt)).toMatch(/past day/i);
  });

  it('rejects a score that disagrees with its squares', () => {
    expect(err(PP_WIN.replace(': 3/5', ': 2/5'))).toMatch(/doesn't match/i);
  });
});

describe('friends outside India', () => {
  // New York is 9½ hours behind IST: India's midnight is 2:30 pm there.
  const istDayAt = (nyTime: string) => istToday(new Date(nyTime));

  it("accepts Evarra all evening in the US, when the player's local date is behind India's", () => {
    // 9 pm Sunday 27 Sep in New York = 6:30 am Monday 28 Sep IST. Evarra still shows the 27th.
    const pasteDay = istDayAt('2026-09-27T21:00:00-04:00');
    expect(pasteDay).toBe('2026-09-28');
    const ev = EV_WIN.replace('September 26, 2026', 'September 27, 2026');
    expect(ok(ev, pasteDay)).toMatchObject({ gameId: 'evarra', gameDate: '2026-09-27' });
  });

  it('accepts an IST-dated game played before India midnight and pasted after it', () => {
    // Played 1 pm New York (10:30 pm IST, the 27th); pasted 3 pm (12:30 am IST, the 28th).
    const pasteDay = istDayAt('2026-09-27T15:00:00-04:00');
    expect(ok(AG_WIN.replace('#26 SEP', '#27 SEP'), pasteDay)).toMatchObject({ gameDate: '2026-09-27' });
    expect(ok(PP_WIN.replace('Day 1587', 'Day 1588'), pasteDay)).toMatchObject({ gameDate: '2026-09-27' });
  });

  it("explains, rather than accepts, a date that hasn't started in India", () => {
    // Someone east of India (Sydney) just past their midnight: Evarra shows the 27th, India is still on the 26th.
    const ev = EV_WIN.replace('September 26, 2026', 'September 27, 2026');
    expect(err(ev, '2026-09-26')).toMatch(/hasn't started in India/);
  });
});

describe('input limits', () => {
  it('rejects empty and oversized input', () => {
    expect(err('   ')).toMatch(/paste/i);
    expect(err(AC_WIN + 'x'.repeat(5000))).toMatch(/too long/i);
  });
});
