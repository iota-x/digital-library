const CACHE = "ann-v1";
const NAV_ROUTES = ["/", "/journal", "/timeline", "/capsule", "/shared"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(NAV_ROUTES)));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  const { request } = e;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // Hashed static assets — cache forever
  if (url.pathname.startsWith("/_next/static/")) {
    e.respondWith(
      caches.match(request).then(hit =>
        hit || fetch(request).then(res => {
          caches.open(CACHE).then(c => c.put(request, res.clone()));
          return res;
        })
      )
    );
    return;
  }

  // API calls — network first, fall back to cached response
  if (url.pathname.startsWith("/api/")) {
    e.respondWith(
      fetch(request)
        .then(res => { caches.open(CACHE).then(c => c.put(request, res.clone())); return res; })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Pages — network first, fall back to cache then root
  e.respondWith(
    fetch(request)
      .then(res => { caches.open(CACHE).then(c => c.put(request, res.clone())); return res; })
      .catch(() => caches.match(request).then(hit => hit || caches.match("/")))
  );
});
