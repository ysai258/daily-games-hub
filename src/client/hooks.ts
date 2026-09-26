'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type DependencyList } from 'react';
import { istToday } from '@/shared/date';
import { api, type ApiResult } from './api';
import type { Player } from './player';

export type PlayerContextValue = { player: Player; rename: (name: string) => Promise<string | null> };

export const PlayerContext = createContext<PlayerContextValue | null>(null);

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used inside AppShell');
  return ctx;
}

/**
 * Today's IST date and the time to the next reset. The server's clock is the
 * reference — a phone set to the wrong time still sees the hub's day.
 */
export function useIstClock(): { today: string; msToReset: number } {
  const offset = useRef(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    void api.today().then((res) => {
      if (cancelled || !res.ok) return;
      offset.current = new Date(res.data.now).getTime() - Date.now();
      setNow(Date.now());
    });
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const serverNow = new Date(now + offset.current);
  const today = istToday(serverNow);
  const nextMidnight = new Date(`${today}T00:00:00+05:30`).getTime() + 86_400_000;
  return { today, msToReset: nextMidnight - serverNow.getTime() };
}

export type Loadable<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
};

/** Minimal data loader: refetches when `deps` change, keeps the last data while reloading. */
export function useApi<T>(load: () => Promise<ApiResult<T>>, deps: DependencyList): Loadable<T> {
  const [state, setState] = useState<{ data: T | null; error: string | null; loading: boolean }>({
    data: null,
    error: null,
    loading: true,
  });
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));
    void load().then((res) => {
      if (cancelled) return;
      setState((s) =>
        res.ok ? { data: res.data, error: null, loading: false } : { data: s.data, error: res.error, loading: false },
      );
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  return { ...state, reload };
}
