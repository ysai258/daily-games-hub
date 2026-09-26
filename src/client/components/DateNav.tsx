'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { addDays, formatShortDate, isValidDateKey } from '@/shared/date';

/** The day a page shows: `?date=` if valid and not in the future, else today. */
export function useSelectedDate(today: string): string {
  const raw = useSearchParams().get('date');
  return raw && isValidDateKey(raw) && raw <= today ? raw : today;
}

export function DateNav({ date, today, basePath }: { date: string; today: string; basePath: string }) {
  const prev = addDays(date, -1);
  const next = addDays(date, 1);
  const href = (d: string) => (d === today ? basePath : `${basePath}?date=${d}`);
  return (
    <nav className="date-nav" aria-label="Choose day">
      <Link href={href(prev)} className="button" aria-label={`Previous day, ${formatShortDate(prev)}`}>
        ‹
      </Link>
      <span className="date-nav__label">{date === today ? `Today · ${formatShortDate(date)}` : formatShortDate(date)}</span>
      {date < today ? (
        <Link href={href(next)} className="button" aria-label={`Next day, ${formatShortDate(next)}`}>
          ›
        </Link>
      ) : (
        <span className="button" aria-hidden="true" data-disabled="true">
          ›
        </span>
      )}
    </nav>
  );
}
