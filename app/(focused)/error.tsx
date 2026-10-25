"use client";

import Link from "next/link";
import { useEffect } from "react";
import { RotateCcw, Home, AlertCircle } from "lucide-react";
import { logger } from "@/shared/data/logger";

export default function FocusedCookingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("FocusedCookingErrorBoundary", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-12 text-center text-ink-900">
      <div className="mx-auto flex max-w-lg flex-col items-center gap-6 rounded-3xl bg-white card-edge p-8 sm:p-10 border border-line-default">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 text-primary-700">
          <AlertCircle size={28} />
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
            Cooking session interrupted
          </h1>
          <p className="text-base leading-relaxed text-ink-600">
            Something unexpected happened while rendering this step. Your cooking progress, timers,
            and notes remain safely preserved on this device.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-ink-900 px-6 text-sm font-semibold text-ink-900 hover:bg-ink-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-900 transition-colors"
          >
            <RotateCcw size={16} />
            Try resuming session
          </button>

          <Link
            href="/"
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-surface-100 px-6 text-sm font-medium text-ink-900 hover:bg-surface-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-900 transition-colors"
          >
            <Home size={16} />
            Exit to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
