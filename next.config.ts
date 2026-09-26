import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // PGlite ships a WASM Postgres; bundling it breaks its file lookups.
  serverExternalPackages: ['@electric-sql/pglite'],
  poweredByHeader: false,
};

export default nextConfig;
