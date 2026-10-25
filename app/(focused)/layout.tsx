import Link from "next/link";
import { X } from "lucide-react";
import { Brand } from "@/shared/shell/SiteHeader";

/**
 * Focused-group layout: calm, light chrome for Cooking Mode.
 * No tab bar, no sidebar — only brand and an exit.
 * Exit keeps the session; Home offers to resume it.
 */
export default function FocusedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface-50 text-ink-900">
      <header className="safe-top">
        <div className="mx-auto flex min-h-16 w-full max-w-[1120px] flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2 sm:px-6">
          <Brand />
          <Link
            href="/app"
            aria-label="Exit Cooking Mode. Your progress is saved."
            className="card-edge inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-medium text-ink-900 transition-[background-color,scale] duration-150 ease-out hover:bg-surface-100 active:scale-[0.97]"
          >
            <X aria-hidden size={18} />
            Exit
          </Link>
        </div>
      </header>
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-[1120px] px-4 pb-16 pt-2 sm:px-6 sm:pt-6"
      >
        {children}
      </main>
    </div>
  );
}
