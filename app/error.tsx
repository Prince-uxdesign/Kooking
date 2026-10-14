"use client";

import Link from "next/link";
import { useEffect } from "react";
import { logger } from "@/shared/data/logger";
import { buttonClasses } from "@/shared/ui/Button";
import { ErrorState } from "@/shared/ui/States";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("GlobalErrorBoundary", error);
  }, [error]);

  return (
    <main id="main-content" className="mx-auto w-full max-w-[720px] px-5 py-16 sm:px-6">
      <ErrorState headingLevel={1} onRetry={reset} />
      <div className="mt-4 flex justify-center">
        <Link href="/" className={buttonClasses({ variant: "secondary" })}>
          Back to Home
        </Link>
      </div>
    </main>
  );
}
