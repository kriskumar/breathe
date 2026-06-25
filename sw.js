/* Service worker — network-first so updates land on reload, with an offline
 * cache fallback. */
const CACHE = "breathe-v17";
const ASSETS = [
  "./",
  "./index.html",
  "./css/styles.css",
  "./js/programs.js",
  "./js/app.js",
  "./manifest.webmanifest",
  "./icon.svg",
  "./icon-180.png",
  "./mp3/aum.mp3",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first: always try the network so a fresh deploy is picked up on the
// next load; fall back to the cache only when offline. This avoids the old
// cache-first behaviour that could pin users to a stale app.js.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (new URL(event.request.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => cached || caches.match("./index.html"))
      )
  );
});
