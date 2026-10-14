/**
 * Connectivity & Reachability Detection (Phase 36)
 *
 * Does not rely solely on `navigator.onLine`, which only indicates local
 * interface attachment (e.g., captive portals or dead Wi-Fi appear online).
 * Performs lightweight, non-cached probes to verify actual reachability.
 */

/**
 * Actively probe the server's reachability.
 * Uses a tiny 204 no-content ping with a short timeout.
 */
export async function checkReachability(timeoutMs = 3500): Promise<boolean> {
  if (typeof window === "undefined") return true;

  // If the browser already knows the network interface is down, don't bother probing
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return false;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch("/api/ping", {
      method: "HEAD",
      cache: "no-store",
      signal: controller.signal,
    });

    clearTimeout(timer);
    const reachable = response.ok;
    return reachable;
  } catch {
    return false;
  }
}
