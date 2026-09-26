/*
 * Daily Games service worker — deliberately tiny.
 *
 * It exists so Chrome treats the site as an installable app (installing is what adds
 * it to Android's share sheet). It caches nothing, because a stale leaderboard is
 * worse than none.
 *
 * The one thing it does is show a clear "you're offline" page when a navigation
 * fails, instead of Chrome's dinosaur. Everything else, including the share-target
 * POST to /share and every /api call, goes straight to the network untouched.
 */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

const OFFLINE_HTML = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Daily Games — offline</title>
<body style="font:16px system-ui;margin:0;display:grid;place-items:center;min-height:100vh;background:#f6f4ef;color:#1c1b19;text-align:center;padding:16px">
<div><p style="font-size:40px;margin:0">📡</p><h1 style="font-size:22px">You're offline</h1>
<p>Reconnect and reopen Daily Games. Results you already saved are safe.</p></div>`;

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.mode !== 'navigate' || request.method !== 'GET') return;
  event.respondWith(
    fetch(request).catch(
      () => new Response(OFFLINE_HTML, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }),
    ),
  );
});
