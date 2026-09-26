import { firstIssue, playerIdSchema, renamePlayerSchema } from '@/shared/validation';
import { getDb } from '@/server/db/client';
import { dateParam, error, handle, json, readJson } from '@/server/http';
import { getPlayerDay } from '@/server/leaderboard';
import { renamePlayer } from '@/server/results';

type Ctx = { params: Promise<{ playerId: string }> };

export const GET = handle(async (req: Request, { params }: Ctx) => {
  const id = playerIdSchema.safeParse((await params).playerId);
  if (!id.success) return error(firstIssue(id.error), 400);
  const date = dateParam(req);
  if (typeof date !== 'string') return error(date.error, 400);
  return json(await getPlayerDay(await getDb(), id.data, date));
});

export const PUT = handle(async (req: Request, { params }: Ctx) => {
  const id = playerIdSchema.safeParse((await params).playerId);
  if (!id.success) return error(firstIssue(id.error), 400);
  const body = renamePlayerSchema.safeParse(await readJson(req));
  if (!body.success) return error(firstIssue(body.error), 400);
  await renamePlayer(await getDb(), id.data, body.data.name);
  return json({ playerId: id.data, name: body.data.name });
});
