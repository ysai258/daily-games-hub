import Link from 'next/link';
import type { GameConfig } from '@/shared/games';
import type { ResultDto } from '@/shared/types';

export function PlayLink({ game, className = 'button button--primary' }: { game: GameConfig; className?: string }) {
  return (
    <a href={game.url} target="_blank" rel="noopener noreferrer" className={className}>
      Play ↗<span className="visually-hidden"> {game.name} (opens in a new tab)</span>
    </a>
  );
}

export function GameCard({ game, result }: { game: GameConfig; result: ResultDto | undefined }) {
  return (
    <article className={`card game-card${result ? ' game-card--done' : ''}`}>
      <Link href={`/games/${game.id}`} className="game-card__head">
        <span className="game-card__icon" aria-hidden="true">
          {game.icon}
        </span>
        <span>
          <span className="game-card__name">{game.name}</span>
          <span className="muted small block">{game.tagline}</span>
        </span>
      </Link>
      <div className="game-card__foot">
        {result ? (
          <p className="status status--done">
            ✅ <strong>{result.label}</strong>
          </p>
        ) : (
          <p className="status">⏳ Not played</p>
        )}
        {result ? (
          <Link href={`/leaderboard/${game.id}`} className="button">
            Standings
          </Link>
        ) : (
          <PlayLink game={game} />
        )}
      </div>
    </article>
  );
}
