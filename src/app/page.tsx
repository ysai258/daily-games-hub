'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { formatCountdown, formatLongDate } from '@/shared/date';
import { ENABLED_GAMES, type GameId } from '@/shared/games';
import { api } from '@/client/api';
import { Disclaimer } from '@/client/components/Disclaimer';
import { GameCard } from '@/client/components/GameCard';
import { PasteResult } from '@/client/components/PasteResult';
import { useApi, useIstClock, usePlayer } from '@/client/hooks';
import { readPending } from '@/client/pending';
import { buildDayShareText, shareText } from '@/client/share';

export default function Dashboard() {
  const { player } = usePlayer();
  const { today, msToReset } = useIstClock();
  const day = useApi(() => api.playerDay(player.id, today), [player.id, today]);
  const [pendingCount, setPendingCount] = useState(0);
  const [shareNote, setShareNote] = useState<string | null>(null);

  useEffect(() => {
    setPendingCount(readPending().length);
  }, [day.data]);

  const results = day.data?.date === today ? day.data.results : [];
  const byGame = useMemo(() => new Map(results.map((r) => [r.gameId, r])), [results]);
  const recorded = useMemo(() => new Set<GameId>(byGame.keys()), [byGame]);
  const done = ENABLED_GAMES.filter((g) => byGame.has(g.id)).length;

  async function share() {
    const text = buildDayShareText({ name: player.name, date: today, results, url: window.location.origin });
    const outcome = await shareText(text);
    setShareNote(
      outcome === 'copied' ? 'Copied — paste it in WhatsApp.' : outcome === 'failed' ? "Couldn't share or copy." : null,
    );
  }

  return (
    <div className="stack-lg">
      <header className="hero">
        <p className="eyebrow">🎮 Daily Games</p>
        <h1 className="title">{player.name} 👋</h1>
        <p className="muted">
          {formatLongDate(today)} · Next reset in {formatCountdown(msToReset)}
        </p>
        <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={ENABLED_GAMES.length} aria-valuenow={done}>
          <div className="progress__bar" style={{ width: `${(done / ENABLED_GAMES.length) * 100}%` }} />
        </div>
        <p className="small">
          <strong>
            {done} / {ENABLED_GAMES.length}
          </strong>{' '}
          played today
        </p>
      </header>

      {pendingCount > 0 && (
        <p className="warn-text card" role="status">
          {pendingCount} result{pendingCount > 1 ? 's are' : ' is'} waiting to be sent. They&apos;ll go through when
          you&apos;re back online.
        </p>
      )}
      {day.error && !day.data && (
        <p className="error-text card" role="alert">
          Couldn&apos;t load today&apos;s results: {day.error}{' '}
          <button type="button" className="link-button" onClick={day.reload}>
            Retry
          </button>
        </p>
      )}

      <section className="stack" aria-label="Today's games">
        {ENABLED_GAMES.map((game) => (
          <GameCard key={game.id} game={game} result={byGame.get(game.id)} />
        ))}
      </section>

      {done < ENABLED_GAMES.length && <PasteResult today={today} recorded={recorded} onSaved={day.reload} />}

      <div className="row">
        <Link href="/leaderboard" className="button grow">
          🏆 Leaderboard
        </Link>
        <button type="button" className="button grow" onClick={share} disabled={done === 0}>
          📲 Share today
        </button>
      </div>
      {shareNote && (
        <p className="muted small" role="status">
          {shareNote}
        </p>
      )}

      <Disclaimer />
    </div>
  );
}
