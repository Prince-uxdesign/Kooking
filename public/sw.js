/**
 * Fork Progressive Web App Service Worker (Phase 36)
 *
 * Designed for offline resilience during cooking sessions.
 * Caches static shell, visited public recipes, and images.
 * STRICT SECURITY: Never caches authenticated endpoints, tokens, or Supabase queries.
 */

const SW_VERSION = "kooking-v2";
const SHELL_CACHE = `kooking-shell-${SW_VERSION}`;
const STATIC_CACHE = `kooking-static-${SW_VERSION}`;
const PAGES_CACHE = `kooking-pages-${SW_VERSION}`;
const IMAGES_CACHE = `kooking-images-${SW_VERSION}`;

const CURRENT_CACHES = [SHELL_CACHE, STATIC_CACHE, PAGES_CACHE, IMAGES_CACHE];

/** Core assets required for basic offline functioning */
const PRECACHE_URLS = [
  "/offline",
  "/manifest.webmanifest",
  "/icons/icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/favicon.ico",
];

// 1. Install event: pre-cache application shell and offline fallback
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => {
        // Wait until explicitly triggered or allow immediate takeover if requested
        return self.skipWaiting();
      })
      .catch((err) => {
        // Log installation error without crashing
        console.warn("[SW] Pre-cache failed during installation:", err);
      }),
  );
});

// 2. Activate event: purge old caches from previous versions
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!CURRENT_CACHES.includes(cacheName)) {
              return caches.delete(cacheName);
            }
            return Promise.resolve();
          }),
        );
      })
      .then(() => self.clients.claim()),
  );
});

// 3. Helper to determine if a request should be ignored by the cache
function isCacheable(request) {
  if (request.method !== "GET" && request.method !== "HEAD") return false;

  const url = new URL(request.url);

  // Exclude non-http(s) protocols
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;

  // STRICT SECURITY: Never cache Supabase, auth tokens, or private API queries
  if (url.hostname.includes("supabase.co")) return false;
  if (url.pathname.startsWith("/api/auth")) return false;
  if (url.pathname.startsWith("/auth/v1")) return false;
  if (url.pathname.startsWith("/rest/v1")) return false;
  if (url.pathname === "/api/ping") return false;

  // Exclude requests with Authorization header
  if (request.headers && request.headers.has("Authorization")) return false;

  return true;
}

// 4. Fetch event: apply tailored caching strategies
self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (!isCacheable(request)) {
    return;
  }

  const url = new URL(request.url);

  // Strategy A: Navigation requests (HTML pages)
  // Network-first with short timeout, falling back to cached page or /offline fallback
  if (request.mode === "navigate") {
    event.respondWith(handleNavigateRequest(request));
    return;
  }

  // Strategy B: Static Next.js chunks, icons, styles, fonts
  // Cache-first (assets in /_next/static/ are immutable content-hashed)
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.endsWith(".woff2") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".js")
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request)
          .then((response) => {
            if (response.status === 200) {
              const clone = response.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
            }
            return response;
          })
          .catch(() => {
            // Return empty 404 response if completely missing
            return new Response("", { status: 404, statusText: "Offline Not Found" });
          });
      }),
    );
    return;
  }

  // Strategy C: Recipe images
  // Cache-first / stale-while-revalidate for images
  if (request.destination === "image" || url.pathname.match(/\.(png|jpg|jpeg|svg|webp|avif)$/)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              const clone = networkResponse.clone();
              caches.open(IMAGES_CACHE).then((cache) => cache.put(request, clone));
            }
            return networkResponse;
          })
          .catch(() => cached);

        return cached || fetchPromise;
      }),
    );
    return;
  }

  // Default: Network with fallback to cache
  event.respondWith(fetch(request).catch(() => caches.match(request)));
});

/**
 * Handle navigation requests:
 * 1. Attempt network with a 3.5s timeout.
 * 2. If network succeeds, cache the page for offline use and return.
 * 3. If network fails or times out, check PAGES_CACHE or SHELL_CACHE.
 * 4. If nothing in cache, return the pre-cached /offline fallback page.
 */
async function handleNavigateRequest(request) {
  try {
    const networkPromise = fetch(request);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Network timeout")), 3500),
    );

    const response = await Promise.race([networkPromise, timeoutPromise]);
    if (response && response.status === 200) {
      const clone = response.clone();
      const pagesCache = await caches.open(PAGES_CACHE);
      await pagesCache.put(request, clone);
    }
    return response;
  } catch (_err) {
    // Network failed or timed out — check cache
    const cachedPage = await caches.match(request);
    if (cachedPage) {
      return cachedPage;
    }

    // Fall back to offline page
    const offlinePage = await caches.match("/offline");
    if (offlinePage) {
      return offlinePage;
    }

    // Ultimate fallback if even /offline wasn't cached
    return new Response(
      '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Offline · Fork</title></head><body style="font-family:sans-serif;padding:2rem;text-align:center;"><h1>You\'re Offline</h1><p>Fork is currently unavailable without an internet connection.</p><p><a href="/">Try again</a></p></body></html>',
      { headers: { "Content-Type": "text/html" } },
    );
  }
}

// 5. Message handler: allow client to trigger skipWaiting or query version
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  if (event.data && event.data.type === "GET_VERSION") {
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ version: SW_VERSION });
    }
  }
});
