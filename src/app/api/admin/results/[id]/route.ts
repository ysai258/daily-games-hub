import { z } from 'zod';
import { getDb } from '@/server/db/client';
import { adminCheck, error, handle, json } from '@/server/http';
import { deleteResult } from '@/server/results';

type Ctx = { params: Promise<{ id: string }> };

export const DELETE = handle(async (req: Request, { params }: Ctx) => {
  const denied = adminCheck(req);
  if (denied) return denied;
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) return error('Invalid result id.', 400);
  if (!(await deleteResult(await getDb(), id.data))) return error('Result not found.', 404);
  return json({ deleted: id.data });
});
