import { istToday, nextResetAt } from '@/shared/date';
import { json } from '@/server/http';

export const dynamic = 'force-dynamic';

/** The server's IST day, so a phone with a wrong clock still shows the right day. */
export function GET() {
  const now = new Date();
  return json({ date: istToday(now), now: now.toISOString(), nextResetAt: nextResetAt(now).toISOString() });
}
