// Minimal service worker to make SPRINTAZ installable as a PWA on Android/iOS.
// We avoid caching app shell aggressively because the build hashes assets and
// stale caches would break Firebase auth / Firestore. The fetch handler simply
// passes everything through; Chromium requires a fetch handler for the install
// prompt to be shown.

const VERSION = 'sprintaz-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  // Network-first, no caching. Required only so the browser registers a
  // fetch handler and treats the app as installable.
  if (event.request.method !== 'GET') return;
  event.respondWith(fetch(event.request).catch(() => Response.error()));
});
