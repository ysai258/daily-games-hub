'use client';

import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
import { useMemo } from 'react';
import { ENABLED_GAMES, getGame, isGameId, type GameId } from '@/shared/games';
import { api } from '@/client/api';
import { PlayLink } from '@/client/components/GameCard';
import { GameBoard } from '@/client/components/Leaderboards';
import { PasteResult } from '@/client/components/PasteResult';
import { useApi, useIstClock, usePlayer } from '@/client/hooks';

function GamePage({ gameId }: { gameId: GameId }) {
  const game = getGame(gameId);
  const { player } = usePlayer();
  const { today } = useIstClock();
  const mine = useApi(() => api.playerDay(player.id, today), [player.id, today]);
  const board = useApi(() => api.gameLeaderboard(gameId, today), [gameId, today]);

  const results = mine.data?.date === today ? mine.data.results : [];
  const myResult = results.find((r) => r.gameId === gameId);
  const recorded = useMemo(() => new Set<GameId>(results.map((r) => r.gameId)), [results]);

  return (
    <div className="stack-lg">
      <p className="small">
        <Link href="/">← Today</Link>
      </p>
      <header className="hero">
        <p className="game-card__icon" aria-hidden="true">
          {game.icon}
        </p>
        <h1 className="title">{game.name}</h1>
        <p className="muted">{game.tagline}</p>
        {myResult ? (
          <p className="status status--done">
            ✅ Today: <strong>{myResult.label}</strong>
          </p>
        ) : (
          <p className="status">⏳ Not played today</p>
        )}
      </header>

      <ol className="steps card">
        <li>
          Play today&apos;s game on its own site. <PlayLink game={game} className="button button--primary" />
        </li>
        <li>When you finish, tap the game&apos;s Share or Copy button.</li>
        <li>Come back here and paste it below.</li>
      </ol>

      {!myResult && (
        <PasteResult
          today={today}
          recorded={recorded}
          onSaved={() => {
            mine.reload();
            board.reload();
          }}
        />
      )}

      {board.data && <GameBoard gameId={gameId} results={board.data.results} meId={player.id} />}
    </div>
  );
}

export default function GameRoute() {
  const { gameId } = useParams<{ gameId: string }>();
  if (!isGameId(gameId) || !ENABLED_GAMES.some((g) => g.id === gameId)) notFound();
  return <GamePage gameId={gameId} />;
}
