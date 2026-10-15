/* Offline support: after the first load, the game files come from the phone's cache,
   so a weak venue wifi only has to carry the tiny vote messages.
   Bump CACHE when you want phones to drop old files. */
const CACHE = "cuzzo-v1";
const FILES = [
  "./", "index.html", "host.html", "style.css", "config.js", "firebase-config.js", "logic.js",
  "db.js", "shared.js", "guest.js", "host.js", "manifest.webmanifest", "icon.svg",
  "vendor/firebase-app-compat.js", "vendor/firebase-database-compat.js",
  "fonts/bagel-fat-one-latin-400-normal.woff2", "fonts/nunito-latin-wght-normal.woff2",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()));
});

// Cache first (fast on bad wifi), refresh in the background for next time.
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      const net = fetch(req).then((res) => {
        if (res && res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone()));
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
