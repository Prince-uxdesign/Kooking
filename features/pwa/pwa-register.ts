/**
 * Service Worker Registration & Update Lifecycle (Phase 36)
 *
 * Handles:
 * - Registration failures cleanly without blocking UX.
 * - Service worker updates and 'updatefound' lifecycle.
 * - Safe update strategy: never force-reloads while an active cooking session is running.
 */

type UpdateCallback = (reg: ServiceWorkerRegistration) => void;

let registrationInstance: ServiceWorkerRegistration | null = null;
/** The reload-on-takeover listener is added once, however many times an update is applied. */
let reloadOnTakeover = false;
const updateListeners = new Set<UpdateCallback>();

/**
 * Register the service worker. Production only by default: in development
 * its cache-first rule for /_next/static/ would serve stale, un-hashed
 * chunks. Anything registered earlier (e.g. from a production build on the
 * same origin) is removed there.
 */
export function registerServiceWorker(
  options: { enabled?: boolean } = {},
): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return Promise.resolve(null);
  }
  const enabled = options.enabled ?? process.env.NODE_ENV === "production";
  if (!enabled) {
    void navigator.serviceWorker
      .getRegistrations()
      .then((all) => all.forEach((r) => void r.unregister()))
      .catch(() => undefined);
    return Promise.resolve(null);
  }

  // Delay registration slightly until window load so critical initial render is never delayed
  return new Promise((resolve) => {
    const doRegister = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        registrationInstance = reg;

        // Check for updates
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              // A new service worker is installed and waiting
              updateListeners.forEach((cb) => cb(reg));
            }
          });
        });

        // Check if there is already a waiting worker
        if (reg.waiting && navigator.serviceWorker.controller) {
          updateListeners.forEach((cb) => cb(reg));
        }

        resolve(reg);
      } catch (err) {
        // Log registration failure quietly; regular site continues to function seamlessly
        console.warn("[PWA] Service Worker registration failed:", err);
        resolve(null);
      }
    };

    if (document.readyState === "complete") {
      void doRegister();
    } else {
      window.addEventListener("load", () => void doRegister(), { once: true });
    }
  });
}

export function onServiceWorkerUpdate(callback: UpdateCallback): () => void {
  updateListeners.add(callback);
  if (registrationInstance?.waiting && navigator.serviceWorker?.controller) {
    callback(registrationInstance);
  }
  return () => {
    updateListeners.delete(callback);
  };
}

/**
 * Apply the pending service worker update safely.
 * Tells the waiting worker to activate.
 */
export function applyServiceWorkerUpdate(reg?: ServiceWorkerRegistration | null): void {
  const targetReg = reg ?? registrationInstance;
  if (!targetReg || !targetReg.waiting) return;

  targetReg.waiting.postMessage({ type: "SKIP_WAITING" });

  if (!reloadOnTakeover && typeof navigator !== "undefined" && navigator.serviceWorker) {
    reloadOnTakeover = true;
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }
}
