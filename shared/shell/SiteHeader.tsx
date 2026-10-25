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

/** Quiet header for touch viewports. Brand only — no bar, no border. */
export function SiteHeader() {
  return (
    <header className="safe-top lg:hidden">
      <div className="mx-auto flex h-16 w-full max-w-[1120px] items-center px-5 sm:px-6">
        <Brand />
      </div>
    </header>
  );
}
