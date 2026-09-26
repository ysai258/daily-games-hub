import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // PGlite ships a WASM Postgres; bundling it breaks its file lookups.
  serverExternalPackages: ['@electric-sql/pglite'],
  poweredByHeader: false,
  async headers() {
    return [
      {
        // Browsers must always fetch a fresh service worker, or a fix to it can take
        // up to a day to reach phones that already installed the app.
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
        ],
      },
    ];
  },
};

export default nextConfig;
