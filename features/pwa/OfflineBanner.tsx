"use client";

import { CheckCircle2, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { usePwa } from "./PwaContext";

/**
 * Concise, non-intrusive offline indicator (Phase 36 §F).
 * - Tells the cook clearly that cached recipes and active cooking sessions remain usable.
 * - Confirms when connectivity returns without interrupting active tasks.
 */
export function OfflineBanner() {
  const { isOnline, isServerReachable, wasOffline } = usePwa();
  const [showRestored, setShowRestored] = useState(false);

  const isActuallyOffline = !isOnline || !isServerReachable;

  useEffect(() => {
    if (!isActuallyOffline && wasOffline) {
      setShowRestored(true);
      const timer = setTimeout(() => {
        setShowRestored(false);
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [isActuallyOffline, wasOffline]);

  if (isActuallyOffline) {
    return (
      <aside
        aria-live="polite"
        className="w-full bg-ink-900 px-4 py-2 text-center text-xs text-white/90 sm:text-sm"
      >
        <div className="mx-auto flex max-w-[1120px] items-center justify-center gap-2">
          <WifiOff size={15} className="shrink-0 text-white" />
          <span>
            <strong>Offline mode:</strong> Active sessions, cached recipes, and shopping lists
            remain available on this device.
          </span>
        </div>
      </aside>
    );
  }

  if (showRestored) {
    return (
      <aside
        aria-live="polite"
        className="w-full bg-primary-50 px-4 py-1.5 text-center text-xs font-medium text-primary-800 transition-opacity sm:text-sm"
      >
        <div className="mx-auto flex max-w-[1120px] items-center justify-center gap-2">
          <CheckCircle2 size={15} className="shrink-0" />
          <span>Connection restored. Changes are ready to sync.</span>
        </div>
      </aside>
    );
  }

  return null;
}
