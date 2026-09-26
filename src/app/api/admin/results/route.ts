import { getDb } from '@/server/db/client';
import { adminCheck, dateParam, error, handle, json } from '@/server/http';
import { getAdminDay } from '@/server/leaderboard';

export const GET = handle(async (req: Request) => {
  const denied = adminCheck(req);
  if (denied) return denied;
  const date = dateParam(req);
  if (typeof date !== 'string') return error(date.error, 400);
  return json({ date, results: await getAdminDay(await getDb(), date) });
});
