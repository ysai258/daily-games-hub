import { getDb } from '@/server/db/client';
import { handle, json } from '@/server/http';
import { getAllTimeLeaderboard } from '@/server/leaderboard';

export const GET = handle(async () => json(await getAllTimeLeaderboard(await getDb())));
