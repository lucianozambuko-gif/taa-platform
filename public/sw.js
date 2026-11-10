/* Training Africa Academy service worker.
   - Pages: network first; a copy of each page is kept so recently opened pages (including lessons)
     still open without signal.
   - Static files: cache first.
   - Videos, payments, APIs and the back office are never cached. */
const VERSION = "taa-v2";
const PAGES = `${VERSION}-pages`;
const ASSETS = `${VERSION}-assets`;
const OFFLINE = "/offline";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(PAGES).then((c) => c.addAll([OFFLINE])).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (e) => {
  if (e.data === "clear") e.waitUntil(caches.delete(PAGES));
});

const NEVER = [/^\/api\//, /^\/checkout/, /^\/admin/, /^\/facilitator/, /^\/employer/, /^\/auth/, /^\/login/, /^\/signup/];

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (NEVER.some((r) => r.test(url.pathname))) return;
  if (req.headers.get("range") || /\.(mp4|webm|m3u8)$/i.test(url.pathname)) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    e.respondWith(caches.open(ASSETS).then(async (c) => (await c.match(req)) || fetch(req).then((r) => (r.ok && c.put(req, r.clone()), r))));
    return;
  }

  if (req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html")) {
    e.respondWith(
      fetch(req)
        .then((r) => {
          if (r.ok && r.type === "basic") caches.open(PAGES).then((c) => c.put(req, r.clone()));
          return r;
        })
        .catch(async () => (await caches.match(req, { ignoreSearch: false })) || (await caches.match(OFFLINE))),
    );
  }
});
