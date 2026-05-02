/* eslint-disable no-restricted-globals */
/**
 * FAST24 service worker.
 *
 * NOTE on file extension:
 *   The companion source-of-truth lives at this path (`public/service-worker.js`)
 *   as plain JS — NOT TypeScript — because:
 *
 *     1. Vite serves files in `public/` verbatim with their original MIME type.
 *        Browsers refuse to register a service worker that isn't served as
 *        `application/javascript`. A `.ts` file would arrive as `text/plain`
 *        and `register()` would throw `SecurityError`.
 *     2. Service worker scope is bounded by the file's URL path. Bundling
 *        from `src/*.ts` produces `/assets/sw-<hash>.js` whose scope is
 *        `/assets/*` — useless. Top-level scope requires a top-level URL,
 *        which `public/` provides.
 *     3. Adding `vite-plugin-pwa` would solve both above and let us write TS,
 *        but that's a larger dependency / refactor. See registerServiceWorker.ts
 *        for the upgrade path.
 *
 * Caching strategy summary:
 *   - HTML navigations  → network-first, cache fallback (so offline shows the
 *                         last-good shell)
 *   - JS / CSS / fonts  → cache-first, background refresh (immutable per-hash)
 *   - Images / icons    → cache-first
 *   - API / Supabase    → ALWAYS pass through, NEVER cache (stale ride data is
 *                         a safety problem)
 *   - Cross-origin      → pass through (skip caching)
 *   - Non-GET           → pass through
 */

// Bump VERSION when the cache shape changes to force a clean activation.
const VERSION = "v1";
const STATIC_CACHE = `fast24-static-${VERSION}`;
const RUNTIME_CACHE = `fast24-runtime-${VERSION}`;

// Minimal precache. The HTML shell is the most important entry — its
// filename is stable across builds (unlike hashed JS/CSS bundles).
// Everything else is captured at runtime on first request.
const PRECACHE_URLS = ["./", "./index.html", "./manifest.webmanifest"];

// Patterns that MUST bypass the cache. Order matters: tested before any
// caching logic runs.
const NEVER_CACHE_PATTERNS = [
  /\/api\//, // API server artifact
  /\.supabase\.co/, // Supabase REST + realtime
  /\/auth\/v1\//, // Supabase auth endpoints
  /\/storage\/v1\//, // Supabase storage (signed URLs)
  /\/realtime\/v1\//, // Supabase realtime websocket bootstrap
  /\/socket\.io\//, // Generic websocket bootstrap
];

// File extensions that are safe to cache aggressively. Hash-named bundles
// are immutable; fonts and icons rarely change.
const STATIC_ASSET_RE =
  /\.(?:js|mjs|css|woff2?|ttf|otf|eot|png|jpg|jpeg|webp|gif|svg|ico)$/i;

/* -------------------------------------------------------------------------- */
/* Install: prime the precache + skip waiting                                 */
/* -------------------------------------------------------------------------- */

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) =>
        // `addAll` is atomic — if any URL fails, the whole install rejects
        // and the new SW is discarded. Keep the precache list TINY for
        // exactly this reason.
        cache.addAll(PRECACHE_URLS),
      )
      .then(() => self.skipWaiting()),
  );
});

/* -------------------------------------------------------------------------- */
/* Activate: clean up old caches + claim clients                              */
/* -------------------------------------------------------------------------- */

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      const allowed = new Set([STATIC_CACHE, RUNTIME_CACHE]);
      await Promise.all(
        keys.filter((k) => !allowed.has(k)).map((k) => caches.delete(k)),
      );
      // Take control of pages that loaded BEFORE this SW activated. Without
      // this, the new SW only controls future page loads, not the current
      // tab — confusing during testing and update flows.
      await self.clients.claim();
    })(),
  );
});

/* -------------------------------------------------------------------------- */
/* Fetch: routing logic                                                       */
/* -------------------------------------------------------------------------- */

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Non-GET requests can't be replayed safely — pass through untouched.
  if (req.method !== "GET") return;

  let url;
  try {
    url = new URL(req.url);
  } catch {
    return; // malformed URL, let the browser handle it
  }

  // Bypass anything that must never be cached.
  if (NEVER_CACHE_PATTERNS.some((p) => p.test(url.href))) return;

  // Cross-origin requests pass through. We could cache OSM tiles here, but
  // each tile server has its own quota / attribution requirements and
  // intercepting them silently is risky.
  if (url.origin !== self.location.origin) return;

  // Navigations (top-level HTML loads) — network-first so users get fresh
  // shells when online and cached shells when offline.
  if (req.mode === "navigate") {
    event.respondWith(networkFirstWithShellFallback(req));
    return;
  }

  // Static assets — cache-first, background refresh. Hash-named bundles
  // are content-addressed; if we have a cached copy, it's correct forever.
  if (STATIC_ASSET_RE.test(url.pathname)) {
    event.respondWith(cacheFirstWithRevalidate(req));
    return;
  }

  // Anything else: pass through. We deliberately don't try to be clever
  // about JSON, XML, etc. — those are usually data and shouldn't be cached
  // without explicit policy.
});

/* -------------------------------------------------------------------------- */
/* Strategies                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Network-first with a fall-through to the cached request, then to the
 * cached HTML shell. Keeps `index.html` as the universal SPA fallback so
 * any deep link (e.g. /rider) survives a dropped connection.
 */
async function networkFirstWithShellFallback(req) {
  try {
    const response = await fetch(req);
    // Only cache 2xx responses — caching a 404 would mask a real failure
    // on the next visit.
    if (response && response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(req, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(req);
    if (cached) return cached;
    // SPA fallback — index.html re-mounts the React app at any route.
    const shell = await caches.match("./index.html");
    if (shell) return shell;
    return new Response(
      '<!doctype html><meta charset="utf-8"><title>Offline</title>' +
        "<body style=\"font-family:system-ui;padding:2rem;text-align:center\">" +
        "<h1>You're offline</h1><p>Connect to the network to continue.</p>",
      { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }
}

/**
 * Cache-first with a background revalidate. Returns the cached copy
 * instantly (sub-millisecond), then refreshes the cache for next time.
 * Failure to refresh is silently swallowed — we already served a response.
 */
async function cacheFirstWithRevalidate(req) {
  const cached = await caches.match(req);
  if (cached) {
    // Fire-and-forget refresh. Don't await — we want the cached response
    // to ship immediately.
    fetch(req)
      .then((response) => {
        if (response && response.ok) {
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(req, response));
        }
      })
      .catch(() => {
        /* offline or network error — already returned cached, nothing to do */
      });
    return cached;
  }
  // Cache miss — fetch and store.
  try {
    const response = await fetch(req);
    if (response && response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(req, response.clone());
    }
    return response;
  } catch {
    // No cache, no network — there's no good response to give.
    return new Response("", {
      status: 504,
      statusText: "Gateway Timeout (offline, no cache)",
    });
  }
}

/* -------------------------------------------------------------------------- */
/* Message channel: SKIP_WAITING for one-click updates                        */
/* -------------------------------------------------------------------------- */

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
