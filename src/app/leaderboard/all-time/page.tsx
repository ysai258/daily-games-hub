'use client';

import { api } from '@/client/api';
import { AllTimeGameBoard, AllTimeStandingsTable, LeaderboardTabs } from '@/client/components/AllTimeBoards';
import { Disclaimer } from '@/client/components/Disclaimer';
import { useApi, usePlayer } from '@/client/hooks';

export default function AllTimeLeaderboardPage() {
  const { player } = usePlayer();
  const board = useApi(() => api.allTime(), []);

  return (
    <div className="stack-lg">
      <h1 className="title">🏆 Leaderboard</h1>
      <LeaderboardTabs active="all-time" />
      {board.error && !board.data && (
        <p className="error-text card" role="alert">
          {board.error}{' '}
          <button type="button" className="link-button" onClick={board.reload}>
            Retry
          </button>
        </p>
      )}
      {!board.data && !board.error && <p className="muted">Loading…</p>}
      {board.data && (
        <>
          <AllTimeStandingsTable standings={board.data.standings} since={board.data.since} meId={player.id} />
          {board.data.games.map((g) => (
            <AllTimeGameBoard
              key={g.gameId}
              gameId={g.gameId}
              entries={g.entries}
              usesNativePoints={g.usesNativePoints}
              meId={player.id}
            />
          ))}
        </>
      )}
      <Disclaimer />
    </div>
  );
}
