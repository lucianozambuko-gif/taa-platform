/* Training Africa Academy service worker.
   - Pages: network first; a copy of each page is kept so recently opened pages (including lessons)
     still open without signal.
   - Static files: cache first.
   - Payments, APIs and the back office are never cached. Videos are only kept when the learner
     taps "Save video to this phone": they are served from /offline-video/<lesson id>, with
     byte-range support so the phone's player can seek. */
const VERSION = "taa-v5";
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
  if (msg.type === "save-video") {
    e.waitUntil(
      (async () => {
        try {
          const r = await fetch(msg.url, { credentials: "same-origin" });
          if (!r.ok || !r.body) {
            reply({ type: "video-error", key: msg.key, message: r.status === 404 ? "This video can't be saved yet." : "Couldn't download the video." });
            return;
          }
          const total = Number(r.headers.get("content-length")) || 0;
          const reader = r.body.getReader();
          const chunks = [];
          let got = 0, last = 0;
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            got += value.byteLength;
            if (got - last > 512 * 1024) { last = got; reply({ type: "video-progress", key: msg.key, got, total }); }
          }
          const blob = new Blob(chunks, { type: "video/mp4" });
          const c = await caches.open(SAVED);
          await c.put(msg.key, new Response(blob, { headers: { "content-type": "video/mp4", "content-length": String(blob.size), "accept-ranges": "bytes" } }));
          reply({ type: "video-status", key: msg.key, saved: true, bytes: blob.size });
        } catch {
          reply({ type: "video-error", key: msg.key, message: "The download stopped. Try again on Wi-Fi." });
        }
      })(),
    );
  }
  if (msg.type === "video-status") {
    e.waitUntil(
      (async () => {
        const r = await (await caches.open(SAVED)).match(msg.key);
        reply({ type: "video-status", key: msg.key, saved: !!r, bytes: r ? Number(r.headers.get("content-length")) || 0 : 0 });
      })(),
    );
  }
  if (msg.type === "remove-video") {
    e.waitUntil(
      (async () => {
        await (await caches.open(SAVED)).delete(msg.key);
        reply({ type: "video-status", key: msg.key, saved: false, bytes: 0 });
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
  if (url.pathname.startsWith("/offline-video/")) {
    e.respondWith(savedVideo(req, url.pathname));
    return;
  }
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

/** A video saved on the phone, with byte ranges so the player can start and seek. */
async function savedVideo(req, key) {
  const r = await (await caches.open(SAVED)).match(key);
  if (!r) return new Response("This video isn't saved on this phone.", { status: 404 });
  const blob = await r.blob();
  const range = /bytes=(\d*)-(\d*)/.exec(req.headers.get("range") || "");
  if (!range) return new Response(blob, { headers: { "content-type": "video/mp4", "content-length": String(blob.size), "accept-ranges": "bytes" } });
  let start = range[1] ? Number(range[1]) : 0;
  let end = range[2] ? Number(range[2]) : blob.size - 1;
  if (!range[1] && range[2]) { start = Math.max(0, blob.size - Number(range[2])); end = blob.size - 1; }
  end = Math.min(end, blob.size - 1);
  if (start > end) return new Response(null, { status: 416, headers: { "content-range": `bytes */${blob.size}` } });
  return new Response(blob.slice(start, end + 1), {
    status: 206,
    headers: { "content-type": "video/mp4", "content-length": String(end - start + 1), "content-range": `bytes ${start}-${end}/${blob.size}`, "accept-ranges": "bytes" },
  });
}
