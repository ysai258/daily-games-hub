import { readLocal, writeLocal } from './storage';

export const PLAYER_ID_KEY = 'daily_games_player_id';
export const PLAYER_NAME_KEY = 'daily_games_player_name';

export type Player = { id: string; name: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function randomUuid(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  // randomUUID needs a secure context; this covers plain-http LAN testing on a phone.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** The id is created once per browser and is what the leaderboard knows you by. */
export function loadPlayer(): Player | null {
  const name = readLocal(PLAYER_NAME_KEY);
  if (!name) return null;
  let id = readLocal(PLAYER_ID_KEY);
  if (!id || !UUID_RE.test(id)) {
    id = randomUuid();
    writeLocal(PLAYER_ID_KEY, id);
  }
  return { id, name };
}

export function savePlayerName(name: string): Player {
  let id = readLocal(PLAYER_ID_KEY);
  if (!id || !UUID_RE.test(id)) {
    id = randomUuid();
    writeLocal(PLAYER_ID_KEY, id);
  }
  writeLocal(PLAYER_NAME_KEY, name);
  return { id, name };
}
