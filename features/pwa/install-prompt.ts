/**
 * PWA Install Prompt Management (Phase 36)
 *
 * Captures `beforeinstallprompt` event and manages dismissal persistence
 * to prevent intrusive, repetitive prompts.
 */

export const INSTALL_DISMISS_KEY = "kooking:pwa-install-dismissed:v1";
const DISMISS_DURATION_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function isInstallDismissed(): boolean {
  if (typeof window === "undefined" || !("localStorage" in window)) return false;
  try {
    const raw = window.localStorage.getItem(INSTALL_DISMISS_KEY);
    if (!raw) return false;
    const dismissedAt = Number(raw);
    if (isNaN(dismissedAt)) return false;
    return Date.now() - dismissedAt < DISMISS_DURATION_MS;
  } catch {
    return false;
  }
}

export function dismissInstallPrompt(): void {
  if (typeof window === "undefined" || !("localStorage" in window)) return;
  try {
    window.localStorage.setItem(INSTALL_DISMISS_KEY, Date.now().toString());
  } catch {
    // Ignore storage issues
  }
}

export function clearInstallDismissal(): void {
  if (typeof window === "undefined" || !("localStorage" in window)) return;
  try {
    window.localStorage.removeItem(INSTALL_DISMISS_KEY);
  } catch {
    // Ignore
  }
}

/**
 * Check if the app is currently running in standalone (PWA) mode.
 */
export function isRunningStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const isStandalone =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(display-mode: standalone)").matches;
  // iOS Safari check
  const isIosStandalone =
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return Boolean(isStandalone || isIosStandalone);
}
