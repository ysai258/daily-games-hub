import { describe, expect, it } from 'vitest';
import { addDays, formatCountdown, istToday, nextResetAt } from './date';
import { normalizedScore, resultLabel } from './scoring';
import { pattukunteDayNumber } from './parse/pattukunte-pattucheera';

describe('IST day boundary', () => {
  it('keeps 23:59 IST on the same day even though UTC is still earlier', () => {
    expect(istToday(new Date('2026-09-26T23:59:00+05:30'))).toBe('2026-09-26');
  });

  it('rolls over at exactly 00:00 IST', () => {
    expect(istToday(new Date('2026-09-27T00:00:00+05:30'))).toBe('2026-09-27');
    expect(istToday(new Date('2026-09-27T00:01:00+05:30'))).toBe('2026-09-27');
  });

  it('does not follow the UTC date (which is still the 26th at 00:01 IST)', () => {
    const at = new Date('2026-09-27T00:01:00+05:30');
    expect(at.toISOString().slice(0, 10)).toBe('2026-09-26');
    expect(istToday(at)).toBe('2026-09-27');
  });

  it('counts down to the next IST midnight', () => {
    const now = new Date('2026-09-26T13:39:00+05:30');
    expect(nextResetAt(now).toISOString()).toBe('2026-09-26T18:30:00.000Z');
    expect(formatCountdown(nextResetAt(now).getTime() - now.getTime())).toBe('10h 21m');
  });

  it('adds days across month ends', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
    expect(addDays('2026-10-01', -1)).toBe('2026-09-30');
  });

  it("matches Pattukunte Pattucheera's own day counter (observed live: Day 1587 on 26 Sep 2026)", () => {
    expect(pattukunteDayNumber('2026-09-26')).toBe(1587);
  });
});

describe('scoring', () => {
  it('gives 100% for a first-attempt solve, 20% less per extra attempt, 0 for a miss', () => {
    expect(normalizedScore({ won: true, attempts: 1, maxAttempts: 5 })).toBe(1);
    expect(normalizedScore({ won: true, attempts: 3, maxAttempts: 5 })).toBeCloseTo(0.6);
    expect(normalizedScore({ won: true, attempts: 5, maxAttempts: 5 })).toBeCloseTo(0.2);
    expect(normalizedScore({ won: false, attempts: 5, maxAttempts: 5 })).toBe(0);
  });

  it('labels results in each game’s own terms', () => {
    expect(resultLabel({ won: true, attempts: 3, maxAttempts: 5, points: null })).toBe('3/5');
    expect(resultLabel({ won: false, attempts: 5, maxAttempts: 5, points: null })).toBe('X/5');
    expect(resultLabel({ won: true, attempts: 2, maxAttempts: 5, points: 390 })).toBe('2/5 · 390 pts');
  });
});
