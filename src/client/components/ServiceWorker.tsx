'use client';

import { useEffect } from 'react';

/**
 * Registers /sw.js in production. Skipped in `next dev`, where a service worker
 * would outlive hot reloads and confuse debugging.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      /* not installable without it, but the site itself works fine */
    });
  }, []);
  return null;
}
