import Link from 'next/link';
import { ENABLED_GAMES, getGame, type GameId } from '@/shared/games';
import { formatPercent } from '@/shared/scoring';
import type { RankedResult, Standing } from '@/shared/types';

const MEDALS = ['🥇', '🥈', '🥉'];

export function GameBoard({
  gameId,
  results,
  meId,
  linkTitle = true,
}: {
  gameId: GameId;
  results: RankedResult[];
  meId: string;
  linkTitle?: boolean;
}) {
  const game = getGame(gameId);
  const title = (
    <>
      {game.icon} {game.name}
    </>
  );
  return (
    <section className="card" aria-label={`${game.name} leaderboard`}>
      <h2 className="section-title">{linkTitle ? <Link href={`/leaderboard/${gameId}`}>{title}</Link> : title}</h2>
      {results.length === 0 ? (
        <p className="muted small">No results yet.</p>
      ) : (
        <ol className="board">
          {results.map((r) => (
            <li key={r.id} className={`board__row${r.playerId === meId ? ' board__row--me' : ''}`}>
              <span className="board__pos">{MEDALS[r.position - 1] && r.won ? MEDALS[r.position - 1] : r.position}</span>
              <span className="board__name">{r.playerName}</span>
              <span className={`board__score${r.won ? '' : ' muted'}`}>{r.label}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/** Who played what today. Not called a "rank": it orders by games played first. */
export function StandingsTable({ standings, meId }: { standings: Standing[]; meId: string }) {
  return (
    <section className="card" aria-labelledby="standings-title">
      <h2 id="standings-title" className="section-title">
        👥 Friends today
      </h2>
      {standings.length === 0 ? (
        <p className="muted small">Nobody has added a result yet. Be the first!</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Player</th>
                {ENABLED_GAMES.map((g) => (
                  <th key={g.id} scope="col" className="num" title={g.name}>
                    <span aria-hidden="true">{g.icon}</span>
                    <span className="visually-hidden">{g.name}</span>
                  </th>
                ))}
                <th scope="col" className="num">
                  Score
                </th>
              </tr>
            </thead>
            <tbody>
              {standings.map((s) => (
                <tr key={s.playerId} className={s.playerId === meId ? 'table__me' : undefined}>
                  <th scope="row" className="table__name">
                    {s.playerName}
                    <span className="muted small block">
                      {s.gamesPlayed}/{ENABLED_GAMES.length} played
                    </span>
                  </th>
                  {ENABLED_GAMES.map((g) => {
                    const r = s.results[g.id];
                    return (
                      <td key={g.id} className={`num${r && !r.won ? ' muted' : ''}`}>
                        {r ? (r.won ? `${r.attempts}/${r.maxAttempts}` : 'X') : '—'}
                      </td>
                    );
                  })}
                  <td className="num">
                    <strong>{formatPercent(s.totalScore / ENABLED_GAMES.length)}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="muted small">
        Sorted by games played, then score. Score: solving on the 1st try = 100%, each extra try −20%, a miss or an
        unplayed game = 0%, averaged over all {ENABLED_GAMES.length} games.
      </p>
    </section>
  );
}
