"use client";

import { Download, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { usePwa } from "./PwaContext";

/**
 * Responsive Install Experience (Phase 36 §I).
 *
 * Requirements:
 * - Shows only when browser supports installation and user has not dismissed it.
 * - Explains benefit concisely: offline cooking, instant access, distraction-free.
 * - Dismissible with persistence (stored in localStorage) so user isn't repeatedly interrupted.
 * - Fits naturally in mobile, tablet, and desktop layouts.
 */
export function InstallBanner() {
  const { showInstallBanner, promptInstall, dismissInstall } = usePwa();
  const [installing, setInstalling] = useState(false);

  if (!showInstallBanner) return null;

  const handleInstall = async () => {
    setInstalling(true);
    await promptInstall();
    setInstalling(false);
  };

  return (
    <div
      role="region"
      aria-label="Install Fork companion app"
      className="mb-4 rounded-3xl border border-primary-200 bg-primary-50/70 p-4 sm:p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-500 text-ink-900">
            <Sparkles size={20} />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-ink-900 sm:text-base">
              Install Fork for Offline Cooking
            </h2>
            <p className="mt-0.5 text-xs text-ink-600 sm:text-sm">
              Keep timers running, view steps offline, and cook without browser distractions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            type="button"
            onClick={dismissInstall}
            aria-label="Dismiss install suggestion"
            className="inline-flex min-h-[40px] items-center gap-1 rounded-full px-3 text-xs font-medium text-ink-600 hover:bg-black/5"
          >
            <X size={14} />
            Not now
          </button>

          <button
            type="button"
            onClick={handleInstall}
            disabled={installing}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-primary-500 px-4 text-xs font-medium text-ink-900 transition-colors hover:bg-primary-400 disabled:opacity-50 sm:text-sm"
          >
            <Download size={14} />
            {installing ? "Installing..." : "Install App"}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Service Worker Update Notification (Phase 36 §G).
 *
 * Appears when a new version of Fork is cached and ready.
 * Does not force-refresh the user out of an active cooking session.
 */
export function UpdateBanner() {
  const { updateAvailable, applyUpdate } = usePwa();

  if (!updateAvailable) return null;

  return (
    <aside
      role="status"
      className="w-full bg-ink-900 px-4 py-2 text-center text-xs text-white sm:text-sm"
    >
      <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-center gap-3">
        <span>A new version of Fork is available with improvements.</span>
        <button
          type="button"
          onClick={applyUpdate}
          className="inline-flex min-h-[32px] items-center rounded-full bg-primary-500 px-3 text-xs font-semibold text-ink-900 hover:bg-primary-400"
        >
          Update Now
        </button>
      </div>
    </aside>
  );
}
