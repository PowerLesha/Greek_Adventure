// Service worker — makes the game fully playable OFFLINE after the first visit.
// Bump CACHE version whenever you change any file, so phones fetch the new copy.
const CACHE = "kate-run-v39";

// All files the game needs. Paths are relative to the service worker's location,
// so this works both locally and on GitHub Pages (in a /repo/ subfolder).
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/style.css",
  "./js/main.js",
  "./js/platformer.js",
  "./js/puzzle.js",
  "./js/art.js",
  "./js/audio.js",
  "./js/storage.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

// Install: pre-cache everything.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// Fetch: cache-first (perfect for offline). Falls back to network, then cache index.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          return resp;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});
