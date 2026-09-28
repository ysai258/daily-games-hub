import type { GameConfig } from '@/shared/games';
import type { AllTimeLeaderboard, DayLeaderboard, PlayerDay, RankedResult, ResultDto } from '@/shared/types';

export type ApiResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; error: string; data?: Partial<T> };

/** status 0 = the request never reached the server (offline, DNS, timeout). */
async function request<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
      cache: 'no-store',
    });
  } catch {
    return { ok: false, status: 0, error: "You're offline or the hub can't be reached." };
  }
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (res.ok) return { ok: true, status: res.status, data: body };
  return { ok: false, status: res.status, error: body.error ?? `Request failed (${res.status}).`, data: body };
}

export type SubmitResponse = { result: ResultDto; duplicate?: boolean };

export const api = {
  today: () => request<{ date: string; now: string; nextResetAt: string }>('/api/today'),
  games: () => request<{ games: GameConfig[] }>('/api/games'),
  allTime: () => request<AllTimeLeaderboard>('/api/leaderboard/all-time'),
  leaderboard: (date?: string) => request<DayLeaderboard>(`/api/leaderboard${date ? `?date=${date}` : ''}`),
  gameLeaderboard: (gameId: string, date?: string) =>
    request<{ date: string; gameId: string; results: RankedResult[] }>(
      `/api/leaderboard/${encodeURIComponent(gameId)}${date ? `?date=${date}` : ''}`,
    ),
  playerDay: (playerId: string, date?: string) =>
    request<PlayerDay>(`/api/player/${encodeURIComponent(playerId)}${date ? `?date=${date}` : ''}`),
  playerHistory: (playerId: string) =>
    request<{ days: PlayerDay[] }>(`/api/player/${encodeURIComponent(playerId)}/history`),
  rename: (playerId: string, name: string) =>
    request<{ name: string }>(`/api/player/${encodeURIComponent(playerId)}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    }),
  submit: (body: { playerId: string; playerName: string; text: string; gameDate: string }) =>
    request<SubmitResponse>('/api/results', { method: 'POST', body: JSON.stringify(body) }),
  adminDay: (password: string, date?: string) =>
    request<{ date: string; results: (ResultDto & { rawText: string })[] }>(
      `/api/admin/results${date ? `?date=${date}` : ''}`,
      { headers: { Authorization: `Bearer ${password}` } },
    ),
  adminDelete: (password: string, id: string) =>
    request<{ deleted: string }>(`/api/admin/results/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${password}` },
    }),
};

/** Worth retrying later: the network failed, the server erred, or we were rate-limited. */
export function isRetryable(status: number): boolean {
  return status === 0 || status === 429 || status >= 500;
}
