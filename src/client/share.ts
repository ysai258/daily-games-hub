import { formatDayMonth } from '@/shared/date';
import { ENABLED_GAMES } from '@/shared/games';
import type { ResultDto } from '@/shared/types';

/** The WhatsApp summary. Says "self-reported" because none of these are verified. */
export function buildDayShareText(opts: { name: string; date: string; results: ResultDto[]; url: string }): string {
  const lines = ENABLED_GAMES.map((game) => {
    const r = opts.results.find((x) => x.gameId === game.id);
    return `${game.icon} ${game.name}: ${r ? r.label : '—'}`;
  });
  const played = opts.results.filter((r) => ENABLED_GAMES.some((g) => g.id === r.gameId)).length;
  return [
    `🎮 Daily Games — ${formatDayMonth(opts.date)}`,
    '',
    opts.name,
    ...lines,
    '',
    `${played}/${ENABLED_GAMES.length} played (self-reported)`,
    '',
    'Play:',
    opts.url,
  ].join('\n');
}

export type ShareOutcome = 'shared' | 'copied' | 'cancelled' | 'failed';

export async function shareText(text: string): Promise<ShareOutcome> {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ text });
      return 'shared';
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return 'cancelled';
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'failed';
  }
}
