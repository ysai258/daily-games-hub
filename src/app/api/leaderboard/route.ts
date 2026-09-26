import { getDb } from '@/server/db/client';
import { dateParam, error, handle, json } from '@/server/http';
import { getDayLeaderboard } from '@/server/leaderboard';

export const GET = handle(async (req: Request) => {
  const date = dateParam(req);
  if (typeof date !== 'string') return error(date.error, 400);
  return json(await getDayLeaderboard(await getDb(), date));
});
