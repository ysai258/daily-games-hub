'use client';

import { Suspense } from 'react';
import { api } from '@/client/api';
import { DateNav, useSelectedDate } from '@/client/components/DateNav';
import { LeaderboardTabs } from '@/client/components/AllTimeBoards';
import { Disclaimer } from '@/client/components/Disclaimer';
import { GameBoard, StandingsTable } from '@/client/components/Leaderboards';
import { useApi, useIstClock, usePlayer } from '@/client/hooks';

function Leaderboard() {
  const { player } = usePlayer();
  const { today } = useIstClock();
  const date = useSelectedDate(today);
  const board = useApi(() => api.leaderboard(date), [date]);
  const data = board.data?.date === date ? board.data : null;

  return (
    <div className="stack-lg">
      <h1 className="title">🏆 Leaderboard</h1>
      <LeaderboardTabs active="today" />
      <DateNav date={date} today={today} basePath="/leaderboard" />
      {board.error && !data && (
        <p className="error-text card" role="alert">
          {board.error}{' '}
          <button type="button" className="link-button" onClick={board.reload}>
            Retry
          </button>
        </p>
      )}
      {!data && !board.error && <p className="muted">Loading…</p>}
      {data && (
        <>
          <StandingsTable standings={data.standings} meId={player.id} />
          {data.games.map((g) => (
            <GameBoard key={g.gameId} gameId={g.gameId} results={g.results} meId={player.id} />
          ))}
        </>
      )}
      <Disclaimer />
    </div>
  );
}

export default function LeaderboardPage() {
  return (
    <Suspense>
      <Leaderboard />
    </Suspense>
  );
}
