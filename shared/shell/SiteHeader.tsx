import { Search } from "lucide-react";
import Link from "next/link";
import { ForkLogo, ForkMark } from "@/shared/ui/Logo";

/** Brand lockup. One treatment everywhere — header, sidebar, focused exit. */
export function Brand({
  compact = false,
  tone = "light",
}: {
  compact?: boolean;
  tone?: "light" | "dark";
}) {
  return (
    <Link
      href="/"
      aria-label="Fork home"
      className="inline-flex min-h-[44px] items-center rounded-full"
    >
      {compact ? (
        <ForkMark size={32} />
      ) : (
        <ForkLogo size={30} wordClassName={tone === "dark" ? "text-white" : "text-ink-900"} />
      )}
    </Link>
  );
}

/**
 * App bar for phones and tablets: sticky, frosted, brand on the left and
 * a quick way into search on the right, like an installed app.
 */
export function SiteHeader() {
  return (
    <header className="glass-bar safe-top sticky top-0 z-30 border-b border-line-default/70 xl:hidden">
      <div className="mx-auto flex h-14 w-full max-w-[1120px] items-center justify-between px-4 sm:px-6">
        <Brand />
        <Link
          href="/recipes"
          aria-label="Search recipes"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full text-ink-900 transition-[background-color,scale] duration-150 ease-out hover:bg-surface-100 active:scale-90"
        >
          <Search aria-hidden size={21} strokeWidth={1.75} />
        </Link>
      </div>
    </header>
  );
}
