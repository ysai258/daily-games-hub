'use client';

import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
import { Suspense } from 'react';
import { ENABLED_GAMES, getGame, isGameId } from '@/shared/games';
import { api } from '@/client/api';
import { DateNav, useSelectedDate } from '@/client/components/DateNav';
import { PlayLink } from '@/client/components/GameCard';
import { AllTimeGameBoard } from '@/client/components/AllTimeBoards';
import { GameBoard } from '@/client/components/Leaderboards';
import { useApi, useIstClock, usePlayer } from '@/client/hooks';

function GameLeaderboard({ gameId }: { gameId: Parameters<typeof getGame>[0] }) {
  const { player } = usePlayer();
  const { today } = useIstClock();
  const date = useSelectedDate(today);
  const board = useApi(() => api.gameLeaderboard(gameId, date), [gameId, date]);
  const allTime = useApi(() => api.allTime(), []);
  const allTimeGame = allTime.data?.games.find((g) => g.gameId === gameId);
  const results = board.data?.date === date ? board.data.results : null;
  const game = getGame(gameId);

  return (
    <div className="stack-lg">
      <p className="small">
        <Link href="/leaderboard">← All games</Link>
      </p>
      <h1 className="title">
        {game.icon} {game.name}
      </h1>
      <DateNav date={date} today={today} basePath={`/leaderboard/${gameId}`} />
      {board.error && !results && (
        <p className="error-text card" role="alert">
          {board.error}
        </p>
      )}
      {results ? (
        <GameBoard gameId={gameId} results={results} meId={player.id} linkTitle={false} />
      ) : (
        !board.error && <p className="muted">Loading…</p>
      )}
      {allTimeGame && (
        <>
          <h2 className="title title--sub">All time</h2>
          <AllTimeGameBoard
            gameId={gameId}
            entries={allTimeGame.entries}
            usesNativePoints={allTimeGame.usesNativePoints}
            meId={player.id}
            linkTitle={false}
          />
        </>
      )}
      <PlayLink game={game} />
    </div>
  );
}

export default function GameLeaderboardPage() {
  const { gameId } = useParams<{ gameId: string }>();
  if (!isGameId(gameId) || !ENABLED_GAMES.some((g) => g.id === gameId)) notFound();
  return (
    <Suspense>
      <GameLeaderboard gameId={gameId} />
    </Suspense>
  );
}
