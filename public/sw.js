const CACHE_NAME = "classkeeper-shell-v2";
const APP_SHELL = ["/", "/manifest.json", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never cache API calls — reads must be fresh and writes require connectivity.
  if (url.pathname.startsWith("/api/")) return;

  if (request.method !== "GET") return;

  // Static Next.js assets: cache-first, they're content-hashed and immutable.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        // Clone immediately, synchronously, with no `await` in between —
        // any gap here is a window for something else (devtools, an
        // extension's content script) to consume the body first, which
        // makes .clone() throw "Response body is already used".
        const responseToCache = response.clone();
        cache.put(request, responseToCache).catch(() => {});
        return response;
      })
    );
    return;
  }

  // Navigations and everything else: network-first, falling back to the
  // cached app shell when offline (view-only — data will be stale).
  event.respondWith(
    fetch(request)
      .then((response) => {
        const responseToCache = response.clone();
        caches
          .open(CACHE_NAME)
          .then((cache) => cache.put(request, responseToCache))
          .catch(() => {
            // Best-effort offline caching — never let a caching failure
            // surface as an error for what is otherwise a successful response.
          });
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached ?? caches.match("/")))
  );
});
