/* Training Africa Academy service worker.
   - Pages: network first; a copy of each page is kept so recently opened pages (including lessons)
     still open without signal.
   - Static files: cache first.
   - Videos, payments, APIs and the back office are never cached. */
const VERSION = "taa-v4";
const PAGES = `${VERSION}-pages`;
const ASSETS = `${VERSION}-assets`;
const OFFLINE = "/offline";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(PAGES).then((c) => c.addAll([OFFLINE])).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION) && k !== SAVED).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

// Pages saved on purpose ("Save this course to my phone") live in their own store, kept until removed.
const SAVED = "taa-saved-courses";

self.addEventListener("message", (e) => {
  if (e.data === "clear") {
    e.waitUntil(Promise.all([caches.delete(PAGES), caches.delete(SAVED)]));
    return;
  }
  const msg = e.data || {};
  const reply = (data) => e.source && e.source.postMessage({ ...data, course: msg.course });
  if (msg.type === "save-course") {
    e.waitUntil(
      (async () => {
        const c = await caches.open(SAVED);
        let done = 0, bytes = 0;
        for (const u of msg.urls) {
          try {
            const r = await fetch(u, { credentials: "same-origin" });
            if (r.ok && r.type === "basic") {
              const b = await r.clone().arrayBuffer();
              bytes += b.byteLength;
              await c.put(u, r);
            }
          } catch {}
          done++;
          reply({ type: "save-progress", done, total: msg.urls.length, bytes });
        }
        reply({ type: "save-done", done, total: msg.urls.length, bytes });
      })(),
    );
  }
  if (msg.type === "course-status") {
    e.waitUntil(
      (async () => {
        const c = await caches.open(SAVED);
        let saved = 0;
        for (const u of msg.urls) if (await c.match(u)) saved++;
        reply({ type: "course-status", saved, total: msg.urls.length });
      })(),
    );
  }
  if (msg.type === "remove-course") {
    e.waitUntil(
      (async () => {
        const c = await caches.open(SAVED);
        await Promise.all(msg.urls.map((u) => c.delete(u)));
        reply({ type: "course-status", saved: 0, total: msg.urls.length });
      })(),
    );
  }
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
        .then(async (r) => {
          // A fresh copy of a page saved on purpose replaces the old one.
          if (r.ok && r.type === "basic") {
            const saved = await caches.open(SAVED);
            if (await saved.match(req)) saved.put(req, r.clone());
          }
          return r;
        })
        .catch(async () => (await caches.match(req, { ignoreSearch: false })) || (await caches.match(OFFLINE))),
    );
  }
});
