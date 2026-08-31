const CACHE_VERSION = "cube-chess-512-v3-forgemcp-premium";
const APP_SHELL = ["./", "./manifest.webmanifest", "./icons/cube-chess.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

function networkFirst(request, fallbackKey = request) {
  return fetch(request)
    .then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(fallbackKey, copy));
      }
      return response;
    })
    .catch(() => caches.match(fallbackKey));
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== location.origin) return;

  const url = new URL(event.request.url);
  if (event.request.mode === "navigate") {
    event.respondWith(networkFirst(event.request, "./"));
    return;
  }

  // Production JS/CSS bundles are hashed by Vite. Network-first here prevents
  // an already-installed PWA from pinning an old visual runtime while still
  // keeping an offline fallback when the network is unavailable.
  if (url.pathname.includes("/assets/") || url.pathname.endsWith("/sw.js")) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then(
      (cached) =>
        cached ??
        fetch(event.request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copy));
          }
          return response;
        }),
    ),
  );
});
