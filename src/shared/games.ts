/**
 * The four games the hub tracks. Everything in the UI and API is driven from this
 * list — add, rename or disable a game here.
 *
 * `integrationType` records how the hub gets a result, decided in FEASIBILITY.md:
 * every game is opened on its own site and the player pastes its share text back.
 */
export type IntegrationType = 'iframe' | 'postMessage' | 'proxy' | 'external' | 'manual-result' | 'disabled';

export type GameConfig = {
  id: GameId;
  name: string;
  shortName: string;
  url: string;
  icon: string;
  tagline: string;
  enabled: boolean;
  integrationType: IntegrationType;
  maxAttempts: number;
  /** Hostnames (and optional path prefix) that identify this game's share text. */
  shareUrlMarkers: readonly string[];
};

export const GAME_IDS = ['absolute-cinema', 'aadu-gajala', 'evarra', 'pattukunte-pattucheera'] as const;
export type GameId = (typeof GAME_IDS)[number];

export const GAMES: readonly GameConfig[] = [
  {
    id: 'absolute-cinema',
    name: 'Absolute Cinema',
    shortName: 'AC',
    url: 'https://absolute-cinema.in/',
    icon: '🎬',
    tagline: 'Guess the movie from its audio',
    enabled: true,
    integrationType: 'external',
    maxAttempts: 5,
    shareUrlMarkers: ['absolute-cinema.in'],
  },
  {
    id: 'aadu-gajala',
    name: 'Aadu Gajala',
    shortName: 'AG',
    url: 'https://aadu-gajala.vercel.app/',
    icon: '🎵',
    tagline: 'Guess the song from a clip',
    enabled: true,
    integrationType: 'external',
    maxAttempts: 5,
    shareUrlMarkers: ['aadu-gajala.vercel.app'],
  },
  {
    id: 'evarra',
    name: 'Evarra?',
    shortName: 'EV',
    url: 'https://ysai258.github.io/evarra/',
    icon: '⭐',
    tagline: 'Recognise the blurred star',
    enabled: true,
    integrationType: 'external',
    maxAttempts: 5,
    shareUrlMarkers: ['ysai258.github.io/evarra'],
  },
  {
    id: 'pattukunte-pattucheera',
    name: 'Pattukunte Pattucheera',
    shortName: 'PP',
    url: 'https://pattukunte-pattucheera.netlify.app/',
    icon: '👗',
    tagline: 'Guess the movie from its frames',
    enabled: true,
    integrationType: 'external',
    maxAttempts: 5,
    shareUrlMarkers: ['pattukunte-pattucheera.netlify.app'],
  },
];

export const ENABLED_GAMES: readonly GameConfig[] = GAMES.filter((g) => g.enabled);

export function isGameId(value: string): value is GameId {
  return (GAME_IDS as readonly string[]).includes(value);
}

export function getGame(id: GameId): GameConfig {
  const game = GAMES.find((g) => g.id === id);
  if (!game) throw new Error(`Unknown game: ${id}`);
  return game;
}
