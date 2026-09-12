/* PacCraft service worker — caches the app so it plays offline.
 * Release checklist: bump CACHE (and VERSION in src/app.js) every time you ship.
 * A new version downloads in the background, then waits; the game shows an
 * "Update ready" button, and tapping it activates the new version and reloads. */
var CACHE = 'paccraft-v1.3.0';
// versions shipped before the update button existed can't show it, so they switch over automatically
var LEGACY = ['paccraft-v1.0.0'];
var ASSETS = [
  './', './index.html', './manifest.webmanifest',
  './src/style.css', './src/world.js', './src/game.js', './src/textures.js', './src/audio.js', './src/render.js', './src/builder.js', './src/app.js',
  './fonts/bungee-latin-400-normal.woff2', './fonts/rubik-latin-500-normal.woff2', './fonts/rubik-latin-700-normal.woff2', './fonts/rubik-latin-900-normal.woff2',
  './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png', './icons/apple-touch-icon.png', './icons/favicon-64.png'
];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    // cache: 'reload' skips the browser's HTTP cache so a release never packs stale files
    return c.addAll(ASSETS.map(function (u) { return new Request(u, { cache: 'reload' }); }));
  }).then(function () { return caches.keys(); }).then(function (keys) {
    if (keys.some(function (k) { return LEGACY.indexOf(k) >= 0; })) return self.skipWaiting();
  }));
});
self.addEventListener('message', function (e) {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
// Cache-only for files this version installed, so every release stays internally consistent —
// a new release arrives as a whole through the update flow, never file-by-file underneath a
// running game. Anything not in this version's cache falls back to the network.
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.slice(-6) === '/sw.js') return;
  e.respondWith(caches.open(CACHE).then(function (cache) {
    return cache.match(e.request, { ignoreSearch: true }).then(function (cached) {
      if (cached) return cached;
      return fetch(e.request).then(function (res) {
        if (res && res.ok) cache.put(e.request, res.clone());
        return res;
      }).catch(function () { return new Response('Offline', { status: 503, statusText: 'Offline' }); });
    });
  }));
});
