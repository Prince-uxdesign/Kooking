"use client";

import { CloudOff, RefreshCw, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";

import { checkReachability } from "@/features/pwa/connectivity";

/** `navigator.onLine` combined with active reachability verification. */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    let active = true;

    async function verify() {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        if (active) setOnline(false);
        return;
      }
      const reachable = await checkReachability();
      if (active) setOnline(reachable);
    }

    void verify();
    window.addEventListener("online", verify);
    window.addEventListener("offline", verify);
    return () => {
      active = false;
      window.removeEventListener("online", verify);
      window.removeEventListener("offline", verify);
    };
  }, []);
  return online;
}

/**
 * Honest storage/connection status for Cooking Mode. Silent when all is
 * well; there's no server sync, so "saved" always means "on this device".
 */
export function SessionStatus({
  online,
  saveFailed,
  syncNotice,
  onRetry,
}: {
  online: boolean;
  saveFailed: boolean;
  syncNotice: string | null;
  onRetry: () => void;
}) {
  if (online && !saveFailed && !syncNotice) return null;
  return (
    <div className="flex flex-col gap-2">
      {saveFailed && (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-3 rounded-2xl bg-error-100 px-4 py-3 text-[0.875rem] text-error-700"
        >
          <TriangleAlert aria-hidden size={18} className="shrink-0" />
          <p className="min-w-0 flex-1">
            Not saved. This device&apos;s storage is full or blocked, so your last change
            didn&apos;t go through. Your last saved step is still safe.
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-white px-4 font-medium text-error-700"
          >
            <RefreshCw aria-hidden size={16} />
            Try saving again
          </button>
        </div>
      )}
      {!online && (
        <p
          role="status"
          className="flex items-start gap-2 rounded-2xl bg-white/10 px-4 py-3 text-[0.875rem] text-white/80"
        >
          <CloudOff aria-hidden size={18} className="mt-0.5 shrink-0" />
          You&apos;re offline. This session is on your device, so you can keep cooking and your
          progress keeps saving here. Leaving Cooking Mode or loading other pages may need a
          connection.
        </p>
      )}
      {syncNotice && (
        <p
          role="status"
          className="rounded-2xl bg-white/10 px-4 py-3 text-[0.875rem] text-white/80"
        >
          {syncNotice}
        </p>
      )}
    </div>
  );
}
