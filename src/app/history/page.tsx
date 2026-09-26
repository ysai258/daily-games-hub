'use client';

import { formatShortDate } from '@/shared/date';
import { ENABLED_GAMES } from '@/shared/games';
import { formatPercent } from '@/shared/scoring';
import { api } from '@/client/api';
import { useApi, usePlayer } from '@/client/hooks';

export default function HistoryPage() {
  const { player } = usePlayer();
  const history = useApi(() => api.playerHistory(player.id), [player.id]);

  return (
    <div className="stack-lg">
      <h1 className="title">🗓️ Previous days</h1>
      {history.error && !history.data && (
        <p className="error-text card" role="alert">
          {history.error}
        </p>
      )}
      {!history.data && !history.error && <p className="muted">Loading…</p>}
      {history.data?.days.length === 0 && <p className="muted">No results yet. Play today&apos;s games to start.</p>}
      {history.data?.days.map((day) => {
        const played = day.results.length;
        const score = day.results.reduce((sum, r) => sum + r.normalized, 0) / ENABLED_GAMES.length;
        return (
          <article key={day.date} className="card stack">
            <header className="row row--between">
              <h2 className="section-title">{formatShortDate(day.date)}</h2>
              <span className="small">
                {played}/{ENABLED_GAMES.length} played · <strong>{formatPercent(score)}</strong>
              </span>
            </header>
            <ul className="plain-list">
              {ENABLED_GAMES.map((g) => {
                const r = day.results.find((x) => x.gameId === g.id);
                return (
                  <li key={g.id} className="row row--between">
                    <span>
                      {g.icon} {g.name}
                    </span>
                    <span className={r && r.won ? '' : 'muted'}>{r ? r.label : '—'}</span>
                  </li>
                );
              })}
            </ul>
          </article>
        );
      })}
    </div>
  );
}
