import type { MetadataRoute } from 'next';

/**
 * Served at /manifest.webmanifest and linked from every page automatically.
 * Installing the app is what puts it in Android's share sheet: Chrome builds a
 * WebAPK from this manifest and registers `share_target` as an Android intent filter.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Daily Games',
    short_name: 'Daily Games',
    description: "Today's four games and our friends' leaderboard.",
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f6f4ef',
    theme_color: '#d9480f',
    categories: ['games', 'entertainment'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    share_target: {
      action: '/share',
      method: 'POST',
      enctype: 'application/x-www-form-urlencoded',
      params: { title: 'title', text: 'text', url: 'url' },
    },
  };
}
