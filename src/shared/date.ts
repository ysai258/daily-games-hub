import { DateTime } from 'luxon';

/**
 * The hub's day is the IST calendar day, whatever timezone the server or phone is in.
 * All dates are `YYYY-MM-DD` strings. Never derive them from `toISOString()` — that
 * is UTC, and would put 00:00–05:29 IST on the previous day.
 */
export const HUB_ZONE = 'Asia/Kolkata';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function istNow(now: Date = new Date()): DateTime {
  return DateTime.fromJSDate(now, { zone: HUB_ZONE });
}

export function istToday(now: Date = new Date()): string {
  return istNow(now).toISODate()!;
}

export function isValidDateKey(value: string): boolean {
  return DATE_RE.test(value) && DateTime.fromISO(value, { zone: HUB_ZONE }).isValid;
}

export function addDays(dateKey: string, days: number): string {
  return DateTime.fromISO(dateKey, { zone: HUB_ZONE }).plus({ days }).toISODate()!;
}

export function daysBetween(from: string, to: string): number {
  const a = DateTime.fromISO(from, { zone: HUB_ZONE });
  const b = DateTime.fromISO(to, { zone: HUB_ZONE });
  return Math.round(b.diff(a, 'days').days);
}

/** The instant the next IST day starts. */
export function nextResetAt(now: Date = new Date()): Date {
  return istNow(now).startOf('day').plus({ days: 1 }).toJSDate();
}

/** "10h 21m" until the next IST midnight. */
export function formatCountdown(ms: number): string {
  const totalMinutes = Math.max(0, Math.floor(ms / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

/** "Saturday, 26 September" */
export function formatLongDate(dateKey: string): string {
  return DateTime.fromISO(dateKey, { zone: HUB_ZONE }).toFormat('cccc, d LLLL');
}

/** "26 Sep 2026" */
export function formatShortDate(dateKey: string): string {
  return DateTime.fromISO(dateKey, { zone: HUB_ZONE }).toFormat('d LLL yyyy');
}

/** "26 Sep" */
export function formatDayMonth(dateKey: string): string {
  return DateTime.fromISO(dateKey, { zone: HUB_ZONE }).toFormat('d LLL');
}

export function dateParts(dateKey: string): { year: number; month: number; day: number } {
  const dt = DateTime.fromISO(dateKey, { zone: HUB_ZONE });
  return { year: dt.year, month: dt.month, day: dt.day };
}
