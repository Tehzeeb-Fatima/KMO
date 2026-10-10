// Offline support without ever showing an old version of the site.
//
// Only the "You're offline" page (plus the CSS/JS it needs and the logo) is
// cached. Everything else always comes from the network: when the network is
// down, page loads get the offline page and other requests simply fail, so a
// stale copy of a page or its data can never be shown as if it were current.
const CACHE_NAME = "kmo-offline-v2";
const OFFLINE_URL = "/offline";

async function cacheOfflinePage() {
  const cache = await caches.open(CACHE_NAME);
  const response = await fetch(OFFLINE_URL, { cache: "reload" });
  if (!response.ok) return;
  const html = await response.clone().text();
  // The offline page's own stylesheet and scripts, so it renders styled offline.
  const assets = [...new Set(html.match(/\/_next\/static\/[^"'\s)]+\.(?:css|js)/g) ?? [])];
  await cache.put(OFFLINE_URL, response);
  await cache.addAll(["/kmo-icon.png", ...assets]);
}

self.addEventListener("install", (event) => {
  event.waitUntil(cacheOfflinePage().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      // Drops the old "kmo-cache-v1", which held copies of real pages and data.
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

let refreshedThisSession = false;

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Keep the offline page in step with new deploys, once per worker start.
          if (!refreshedThisSession) {
            refreshedThisSession = true;
            cacheOfflinePage().catch(() => {});
          }
          return response;
        })
        .catch(async () => (await caches.match(OFFLINE_URL)) || Response.error()),
    );
    return;
  }

  // Network only; the cache is consulted solely for the offline page's assets.
  event.respondWith(
    fetch(request).catch(async () => (await caches.match(request)) || Response.error()),
  );
});
