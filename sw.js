/* Offline support: after the first load, the game files come from the phone's cache,
   so a weak venue wifi only has to carry the tiny vote messages.
   Bump CACHE when you want phones to drop old files. */
const CACHE = "cuzzo-v2";
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

// Pages and config files: try the network first (so your edits show up right away),
// but fall back to the saved copy after 4 seconds or when offline.
// Everything else (scripts, styles, fonts): saved copy first, refreshed in the background.
const FRESH = /(\/|index\.html|host\.html|config\.js|firebase-config\.js)$/;

function networkFirst(req) {
  return new Promise((resolve) => {
    let done = false;
    const fallback = () => caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req));
    const timer = setTimeout(() => { if (!done) { done = true; fallback().then(resolve, () => resolve(Response.error())); } }, 4000);
    fetch(req, { cache: "no-cache" }).then((res) => {
      clearTimeout(timer);
      if (res && res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone()));
      if (!done) { done = true; resolve(res); }
    }).catch(() => {
      clearTimeout(timer);
      if (!done) { done = true; fallback().then(resolve, () => resolve(Response.error())); }
    });
  });
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  if (FRESH.test(url.pathname)) { e.respondWith(networkFirst(req)); return; }
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
