const CACHE = "ann-v3";
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

/* Clone the response synchronously before returning it, then cache the clone.
   Never attempt to clone streaming (SSE) or error responses. */
function tryCache(cacheName, request, response) {
  if (!response.ok) return response;
  const type = response.headers.get("content-type") ?? "";
  if (type.includes("text/event-stream")) return response;
  try {
    const clone = response.clone(); // must happen synchronously
    caches.open(cacheName).then(c => c.put(request, clone));
  } catch {
    // body already used — skip caching silently
  }
  return response;
}

// Allow the page to tell a waiting worker to skip waiting and take over
self.addEventListener("message", e => {
  if (e.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", e => {
  const { request } = e;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // API calls — always go to network, never cache.
  // calendarStore handles its own client-side caching; SSE streams can't be cloned.
  if (url.pathname.startsWith("/api/")) return;

  // Hashed static assets — cache-first forever
  if (url.pathname.startsWith("/_next/static/")) {
    e.respondWith(
      caches.match(request).then(hit =>
        hit ?? fetch(request).then(res => tryCache(CACHE, request, res))
      )
    );
    return;
  }

  // Pages — network first, fall back to cache, then root shell
  e.respondWith(
    fetch(request)
      .then(res => tryCache(CACHE, request, res))
      .catch(() => caches.match(request).then(hit => hit ?? caches.match("/")))
  );
});

// ── Push notifications ────────────────────────────────────────────────────
self.addEventListener("push", e => {
  try {
    const data = e.data?.json() ?? {};
    e.waitUntil(
      self.registration.showNotification(data.title ?? "💗", {
        body:  data.body  ?? "",
        icon:  data.icon  ?? "/favicon.svg",
        badge: "/favicon.svg",
        vibrate: [100, 50, 100],
        data: { url: data.url ?? "/" },
      })
    );
  } catch {}
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = e.notification.data?.url ?? "/";
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
      const existing = list.find(c => c.url.includes(self.location.origin));
      if (existing) { existing.focus(); existing.navigate(url); }
      else clients.openWindow(url);
    })
  );
});
