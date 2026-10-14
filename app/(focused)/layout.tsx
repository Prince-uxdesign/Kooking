import Link from "next/link";
import { X } from "lucide-react";
import { Brand } from "@/shared/shell/SiteHeader";

/**
 * Focused-group layout: immersive chrome for Cooking Mode.
 * No tab bar, no sidebar — only brand and an exit.
 * Exit keeps the session; Home offers to resume it.
 */
export default function FocusedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-ink-900 text-white">
      <header className="safe-top ">
        <div className="mx-auto flex h-16 w-full max-w-[880px] items-center justify-between px-4 sm:px-6">
          <Brand tone="dark" />
          <Link
            href="/"
            aria-label="Exit Cooking Mode. Your progress is saved."
            className="inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-full bg-white/10 px-4 text-sm font-medium hover:bg-white/20"
          >
            <X aria-hidden size={18} />
            Exit
          </Link>
        </div>
      </header>
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-[880px] px-4 pb-16 pt-4 sm:px-6 sm:pt-8"
      >
        {children}
      </main>
    </div>
  );
}
