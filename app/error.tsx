"use client";

import Link from "next/link";
import { buttonClasses } from "@/shared/ui/Button";
import { ErrorState } from "@/shared/ui/States";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main id="main-content" className="mx-auto w-full max-w-[720px] px-5 py-16 sm:px-6">
      <ErrorState onRetry={reset} />
      <div className="mt-4 flex justify-center">
        <Link href="/" className={buttonClasses({ variant: "secondary" })}>
          Back to Home
        </Link>
      </div>
    </main>
  );
}
