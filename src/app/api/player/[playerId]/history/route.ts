import { firstIssue, playerIdSchema } from '@/shared/validation';
import { getDb } from '@/server/db/client';
import { error, handle, json } from '@/server/http';
import { getPlayerHistory } from '@/server/leaderboard';

type Ctx = { params: Promise<{ playerId: string }> };

export const GET = handle(async (_req: Request, { params }: Ctx) => {
  const id = playerIdSchema.safeParse((await params).playerId);
  if (!id.success) return error(firstIssue(id.error), 400);
  return json({ days: await getPlayerHistory(await getDb(), id.data) });
});
