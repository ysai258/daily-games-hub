import { ENABLED_GAMES, isGameId } from '@/shared/games';
import { getDb } from '@/server/db/client';
import { dateParam, error, handle, json } from '@/server/http';
import { getDayLeaderboard } from '@/server/leaderboard';

type Ctx = { params: Promise<{ gameId: string }> };

export const GET = handle(async (req: Request, { params }: Ctx) => {
  const { gameId } = await params;
  if (!isGameId(gameId) || !ENABLED_GAMES.some((g) => g.id === gameId)) return error('Unknown game.', 404);
  const date = dateParam(req);
  if (typeof date !== 'string') return error(date.error, 400);

  const board = await getDayLeaderboard(await getDb(), date);
  return json({ date, gameId, results: board.games.find((g) => g.gameId === gameId)?.results ?? [] });
});
