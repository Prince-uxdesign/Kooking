"use client";

import Link from "next/link";
import { useEffect } from "react";
import { RotateCcw, Home, AlertTriangle } from "lucide-react";
import { logger } from "@/shared/data/logger";
import { buttonClasses } from "@/shared/ui/Button";

export default function MainAppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("MainAppErrorBoundary", error);
  }, [error]);

  return (
    <main
      id="main-content"
      className="mx-auto flex w-full max-w-xl flex-col items-center justify-center px-4 py-16 text-center sm:px-6"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-error-100 text-error-700">
        <AlertTriangle size={28} />
      </div>

      <h1 className="mt-6 text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
        Couldn&apos;t load this page
      </h1>

      <p className="mt-3 text-base leading-relaxed text-ink-600">
        Something went wrong while displaying this section. Any saved recipes, shopping items, and
        kitchen checks on this device are preserved.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={reset} className={buttonClasses({ variant: "primary" })}>
          <RotateCcw size={16} />
          Try again
        </button>

        <Link href="/" className={buttonClasses({ variant: "secondary" })}>
          <Home size={16} />
          Back to Home
        </Link>
      </div>
    </main>
  );
}
