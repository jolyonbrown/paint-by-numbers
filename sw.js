// Service worker: pre-caches the whole app so it works offline, serves from cache, and refreshes
// the cache in the background. VERSION and FILES are rewritten by `node tools/update-sw.mjs`;
// run that before every release so iPads pick up the new version.
const VERSION = 'v2026-11-07.3';
const FILES = [
  './',
  'css/style.css',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'index.html',
  'js/codec.js',
  'js/confetti.js',
  'js/game.js',
  'js/main.js',
  'js/menu.js',
  'js/palette-bar.js',
  'js/puzzle-view.js',
  'js/sound.js',
  'js/storage.js',
  'manifest.webmanifest',
  'pictures/cottage/lines.png',
  'pictures/cottage/puzzle.json',
  'pictures/cottage/thumb.json',
  'pictures/index.json',
];
const CACHE = 'pbn-' + VERSION;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // cache: 'reload' skips the HTTP cache so a new version never stores stale files.
    await Promise.all(FILES.map(async (f) => {
      const res = await fetch(new Request(f, { cache: 'reload' }));
      if (!res.ok) throw new Error(`${f}: ${res.status}`);
      await cache.put(f, res);
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith('pbn-') && key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req, { ignoreSearch: true });
    // Refresh in the background (no-cache revalidates with the server).
    const refresh = fetch(req, { cache: 'no-cache' }).then((res) => {
      if (res.ok && res.type === 'basic') cache.put(req, res.clone());
      return res;
    });
    if (cached) { event.waitUntil(refresh.catch(() => {})); return cached; }
    try { return await refresh; } catch (e) {
      if (req.mode === 'navigate') { const shell = await cache.match('index.html'); if (shell) return shell; }
      throw e;
    }
  })());
});
