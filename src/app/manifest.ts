import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Daily Games',
    short_name: 'Daily Games',
    description: "Today's four games and our friends' leaderboard.",
    start_url: '/',
    display: 'standalone',
    background_color: '#f6f4ef',
    theme_color: '#d9480f',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}
