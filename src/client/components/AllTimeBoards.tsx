import Link from 'next/link';
import { formatShortDate } from '@/shared/date';
import { getGame, type GameId } from '@/shared/games';
import type { AllTimeGameEntry, AllTimeStanding } from '@/shared/types';

const MEDALS = ['🥇', '🥈', '🥉'];

function place(position: number, points: number): string | number {
  return points > 0 ? (MEDALS[position - 1] ?? position) : position;
}

function solveRate(solved: number, played: number): string {
  return played === 0 ? '—' : `${Math.round((solved / played) * 100)}%`;
}

export function LeaderboardTabs({ active }: { active: 'today' | 'all-time' }) {
  return (
    <nav className="tabs" aria-label="Leaderboard period">
      <Link href="/leaderboard" className="tabs__tab" aria-current={active === 'today' ? 'page' : undefined}>
        Today
      </Link>
      <Link href="/leaderboard/all-time" className="tabs__tab" aria-current={active === 'all-time' ? 'page' : undefined}>
        All time
      </Link>
    </nav>
  );
}

/** Every game, every day, added up — ranked by hub points. */
export function AllTimeStandingsTable({
  standings,
  since,
  meId,
}: {
  standings: AllTimeStanding[];
  since: string | null;
  meId: string;
}) {
  return (
    <section className="card" aria-labelledby="all-time-title">
      <h2 id="all-time-title" className="section-title">
        🏆 All games, all time
      </h2>
      {since && <p className="muted small">Since {formatShortDate(since)}</p>}
      {standings.length === 0 ? (
        <p className="muted small">No results yet.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col" className="num">
                  #
                </th>
                <th scope="col">Player</th>
                <th scope="col" className="num">
                  Solved
                </th>
                <th scope="col" className="num">
                  Points
                </th>
              </tr>
            </thead>
            <tbody>
              {standings.map((s) => (
                <tr key={s.playerId} className={s.playerId === meId ? 'table__me' : undefined}>
                  <td className="num">{place(s.position, s.points)}</td>
                  <th scope="row" className="table__name">
                    {s.playerName}
                    <span className="muted small block">
                      {s.daysPlayed} day{s.daysPlayed === 1 ? '' : 's'} · {s.played} game{s.played === 1 ? '' : 's'}
                    </span>
                  </th>
                  <td className="num">{solveRate(s.solved, s.played)}</td>
                  <td className="num">
                    <strong>{s.points}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="muted small">
        Every result counts: 100 points for solving on the 1st try, 20 fewer for each extra try, 0 for a miss. Playing
        every day adds up. Ties go to more solves.
      </p>
    </section>
  );
}

/** One game's all-time board. Evarra ranks on its own points; the rest on hub points. */
export function AllTimeGameBoard({
  gameId,
  entries,
  usesNativePoints,
  meId,
  linkTitle = true,
}: {
  gameId: GameId;
  entries: AllTimeGameEntry[];
  usesNativePoints: boolean;
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
    <section className="card" aria-label={`${game.name} all-time leaderboard`}>
      <h2 className="section-title">{linkTitle ? <Link href={`/leaderboard/${gameId}`}>{title}</Link> : title}</h2>
      {entries.length === 0 ? (
        <p className="muted small">No results yet.</p>
      ) : (
        <ol className="board">
          {entries.map((e) => (
            <li key={e.playerId} className={`board__row${e.playerId === meId ? ' board__row--me' : ''}`}>
              <span className="board__pos">{place(e.position, e.points)}</span>
              <span className="board__name">
                {e.playerName}
                <span className="muted small block">
                  {e.solved}/{e.played} solved
                  {e.avgAttempts !== null ? ` · avg ${e.avgAttempts} ${e.avgAttempts === 1 ? 'try' : 'tries'}` : ''}
                </span>
              </span>
              <span className="board__score">{e.points} pts</span>
            </li>
          ))}
        </ol>
      )}
      {usesNativePoints && entries.length > 0 && (
        <p className="muted small">Ranked by {game.name}&apos;s own points, which also charge for clues.</p>
      )}
    </section>
  );
}
