import { submitResultSchema, firstIssue } from '@/shared/validation';
import { getDb } from '@/server/db/client';
import { error, handle, json, readJson } from '@/server/http';
import { SUBMIT_LIMIT, clientIp, hitRateLimit } from '@/server/rate-limit';
import { submitResult } from '@/server/results';

export const POST = handle(async (req: Request) => {
  const parsed = submitResultSchema.safeParse(await readJson(req));
  if (!parsed.success) return error(firstIssue(parsed.error), 400);

  const db = await getDb();
  if (await hitRateLimit(db, `results:${clientIp(req.headers)}`, SUBMIT_LIMIT)) {
    return error('Too many submissions. Wait a few minutes and try again.', 429);
  }

  const outcome = await submitResult(db, parsed.data);
  const { status, ...body } = outcome;
  return json(body, status);
});
