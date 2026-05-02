/**
 * Service worker registration helper.
 *
 * Deliberately skips registration in development:
 *   - SW caching fights HMR (you'd see stale code after every save).
 *   - The Replit dev preview iframe has a different effective scope than
 *     the published `.replit.app` domain — dev-mode SW behavior wouldn't
 *     match production anyway.
 *
 * To verify behavior: build + publish, then check `chrome://inspect/#service-workers`
 * or DevTools → Application → Service Workers.
 *
 * Upgrade path: if you want strict TypeScript SW source + auto-injected
 * precache manifest of hashed bundles, install `vite-plugin-pwa` and move
 * the worker body to `src/sw.ts` with `injectManifest` strategy.
 */

const SW_FILENAME = "service-worker.js";

export interface ServiceWorkerHandle {
  registration: ServiceWorkerRegistration;
  /** Tell the waiting worker to activate immediately. */
  skipWaiting: () => void;
}

export type ServiceWorkerCallbacks = {
  /** Fired when a new SW has installed and is waiting to activate. */
  onUpdateAvailable?: (handle: ServiceWorkerHandle) => void;
  /** Fired when the SW activates and starts controlling the page. */
  onReady?: (handle: ServiceWorkerHandle) => void;
  /** Fired on registration error. */
  onError?: (error: unknown) => void;
};

/**
 * Register the service worker. No-ops gracefully when:
 *   - the browser doesn't support service workers
 *   - we're running in development mode
 *   - registration fails (logged, not thrown)
 */
export function registerServiceWorker(
  callbacks: ServiceWorkerCallbacks = {},
): void {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) {
    console.info("[SW] Service workers not supported in this browser.");
    return;
  }
  if (!import.meta.env.PROD) {
    console.info(
      "[SW] Skipped registration in development. " +
        "Build + publish to test offline behavior.",
    );
    return;
  }

  // Wait for `load` so SW registration doesn't compete with first-paint
  // for network bandwidth. The user gets visible UI first; SW boots second.
  window.addEventListener("load", () => {
    // BASE_URL has a trailing slash by convention. The default scope of
    // a worker registered at `${BASE_URL}service-worker.js` is `${BASE_URL}` —
    // exactly what we want — so no explicit `scope` option is needed.
    const swUrl = `${import.meta.env.BASE_URL}${SW_FILENAME}`;

    navigator.serviceWorker
      .register(swUrl)
      .then((registration) => {
        console.info("[SW] Registered. Scope:", registration.scope);

        const wrapHandle = (): ServiceWorkerHandle => ({
          registration,
          skipWaiting: () =>
            registration.waiting?.postMessage({ type: "SKIP_WAITING" }),
        });

        // If a worker is already waiting at registration time, surface it.
        if (registration.waiting) {
          callbacks.onUpdateAvailable?.(wrapHandle());
        }

        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (installing.state === "installed") {
              if (navigator.serviceWorker.controller) {
                // Old SW still in control → new one is waiting.
                console.info("[SW] Update installed and waiting.");
                callbacks.onUpdateAvailable?.(wrapHandle());
              } else {
                // First install on this client.
                console.info("[SW] Installed for the first time.");
                callbacks.onReady?.(wrapHandle());
              }
            }
          });
        });
      })
      .catch((err) => {
        console.error("[SW] Registration failed:", err);
        callbacks.onError?.(err);
      });
  });

  // Reload the page once when the controlling SW changes (after the user
  // accepts an update via skipWaiting). Guarded against the activation
  // loop by the `refreshing` flag.
  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}

/**
 * Escape hatch — unregister all service workers and clear runtime caches.
 * Useful when debugging stale cache problems or when permanently disabling
 * the worker. Call from the browser console:
 *
 *   import('./lib/registerServiceWorker').then(m => m.unregisterServiceWorker())
 */
export async function unregisterServiceWorker(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((r) => r.unregister()));
  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  }
  console.info("[SW] Unregistered all workers and cleared caches.");
}
