'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../api';
import { PlayerContext, type PlayerContextValue } from '../hooks';
import { flushPending } from '../pending';
import { loadPlayer, savePlayerName, type Player } from '../player';
import { Onboarding } from './Onboarding';

const NAV = [
  { href: '/', label: 'Today', icon: '🎮' },
  { href: '/leaderboard', label: 'Leaderboard', icon: '🏆' },
  { href: '/history', label: 'History', icon: '🗓️' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
];

/**
 * Wraps every page: asks for a name on first visit, provides the player, and
 * retries any results that were queued while offline.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const [player, setPlayer] = useState<Player | null | undefined>(undefined);
  const pathname = usePathname();

  useEffect(() => setPlayer(loadPlayer()), []);

  useEffect(() => {
    if (!player) return;
    const retry = () => void flushPending();
    retry();
    window.addEventListener('online', retry);
    return () => window.removeEventListener('online', retry);
  }, [player]);

  const rename = useCallback(async (name: string) => {
    const current = loadPlayer();
    const next = savePlayerName(name);
    setPlayer(next);
    if (!current) return null;
    const res = await api.rename(next.id, name);
    return res.ok ? null : res.error;
  }, []);

  const ctx = useMemo<PlayerContextValue | null>(() => (player ? { player, rename } : null), [player, rename]);

  // Admin works without a player name.
  if (pathname.startsWith('/admin')) return <main className="page">{children}</main>;

  if (player === undefined) return <main className="page" aria-busy="true" />;
  if (player === null) return <Onboarding onDone={(name) => setPlayer(savePlayerName(name))} />;

  return (
    <PlayerContext.Provider value={ctx}>
      <main className="page">{children}</main>
      <nav className="bottom-nav" aria-label="Main">
        {NAV.map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} className="bottom-nav__item" aria-current={active ? 'page' : undefined}>
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </PlayerContext.Provider>
  );
}
