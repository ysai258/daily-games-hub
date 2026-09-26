'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { addDays, formatShortDate, istToday } from '@/shared/date';
import { getGame } from '@/shared/games';
import type { ResultDto } from '@/shared/types';
import { api } from '@/client/api';

type AdminRow = ResultDto & { rawText: string };
const SESSION_KEY = 'daily_games_admin';

function readSession(): string {
  try {
    return window.sessionStorage.getItem(SESSION_KEY) ?? '';
  } catch {
    return '';
  }
}

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [date, setDate] = useState(() => istToday());
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (pw: string, d: string) => {
    const res = await api.adminDay(pw, d);
    if (!res.ok) {
      setError(res.status === 404 ? 'Admin is disabled (ADMIN_PASSWORD is not set).' : res.error);
      setAuthed(false);
      return;
    }
    setError(null);
    setAuthed(true);
    setRows(res.data.results);
    try {
      window.sessionStorage.setItem(SESSION_KEY, pw);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const saved = readSession();
    if (saved) {
      setPassword(saved);
      void load(saved, date);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function remove(row: AdminRow) {
    if (!window.confirm(`Delete ${row.playerName}'s ${getGame(row.gameId).name} result (${row.label})?`)) return;
    const res = await api.adminDelete(password, row.id);
    if (!res.ok) setError(res.error);
    await load(password, date);
  }

  function signIn(e: FormEvent) {
    e.preventDefault();
    void load(password, date);
  }

  if (!authed) {
    return (
      <form onSubmit={signIn} className="card stack">
        <h1 className="title">Admin</h1>
        <label htmlFor="admin-pw" className="label">
          Admin password
        </label>
        <input
          id="admin-pw"
          type="password"
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="button button--primary">
          Sign in
        </button>
      </form>
    );
  }

  const go = (d: string) => {
    setDate(d);
    void load(password, d);
  };

  return (
    <div className="stack-lg">
      <h1 className="title">Admin</h1>
      <nav className="date-nav" aria-label="Choose day">
        <button type="button" className="button" onClick={() => go(addDays(date, -1))}>
          ‹
        </button>
        <span className="date-nav__label">{formatShortDate(date)}</span>
        <button type="button" className="button" onClick={() => go(addDays(date, 1))} disabled={date >= istToday()}>
          ›
        </button>
      </nav>
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
      <p className="muted small">
        {rows.length} result{rows.length === 1 ? '' : 's'} · all self-reported via pasted share text
      </p>
      {rows.map((row) => (
        <article key={row.id} className="card stack">
          <header className="row row--between">
            <strong>
              {getGame(row.gameId).icon} {row.playerName} · {row.label}
            </strong>
            <button type="button" className="button button--danger" onClick={() => remove(row)}>
              Delete
            </button>
          </header>
          <p className="muted small mono">
            {row.source} · {new Date(row.submittedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} ·{' '}
            {row.playerId}
          </p>
          <pre className="raw">{row.rawText}</pre>
        </article>
      ))}
    </div>
  );
}
