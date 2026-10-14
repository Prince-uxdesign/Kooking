import { CookingPot } from "lucide-react";
import Link from "next/link";

/** Brand lockup. One treatment everywhere — header, sidebar, focused exit. */
export function Brand({
  compact = false,
  tone = "light",
}: {
  compact?: boolean;
  tone?: "light" | "dark";
}) {
  const title = tone === "dark" ? "text-white" : "text-ink-900";
  return (
    <Link
      href="/"
      aria-label="Kooking home"
      className="inline-flex min-h-[44px] items-center gap-2.5 rounded-full"
    >
      <span
        aria-hidden
        className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary-500 text-ink-900"
      >
        <CookingPot size={20} strokeWidth={2} />
      </span>
      {!compact && (
        <span className={`text-[1.25rem] font-semibold tracking-tight ${title}`}>Kooking</span>
      )}
    </Link>
  );
}

/** Quiet header for touch viewports. Brand only — no bar, no border. */
export function SiteHeader() {
  return (
    <header className="safe-top bg-white lg:hidden">
      <div className="mx-auto flex h-16 w-full max-w-[1120px] items-center px-5 sm:px-6">
        <Brand />
      </div>
    </header>
  );
}
