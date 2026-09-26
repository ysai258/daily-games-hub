import { GAMES } from '@/shared/games';
import { json } from '@/server/http';

export const dynamic = 'force-dynamic';

export function GET() {
  return json({ games: GAMES.filter((g) => g.enabled) });
}
