"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, isNavActive } from "./nav-items";
import { Brand } from "./SiteHeader";

/**
 * Floating dark pill tab bar for touch viewports (< lg).
 * Circular icon buttons; the active one turns green and shows its
 * label (from 360px). Inactive tabs are icon-only on screen but keep
 * their full name as the accessible name and tooltip.
 * Desktop uses the sidebar instead.
 */
export function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="safe-bottom pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 lg:hidden"
    >
      <ul className="pointer-events-auto mb-4 flex items-center gap-1 rounded-full bg-ink-900 p-1.5">
        {NAV_ITEMS.map(({ href, label, shortLabel, Icon }) => {
          const active = isNavActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-label={label}
                title={label}
                aria-current={active ? "page" : undefined}
                className={`flex h-12 min-w-12 items-center justify-center gap-2 rounded-full text-[14px] font-medium transition-colors ${
                  active
                    ? "bg-primary-500 px-3.5 text-ink-900 min-[360px]:px-4"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                <Icon aria-hidden size={20} strokeWidth={active ? 2.25 : 1.75} />
                {active && (
                  <span aria-hidden className="hidden min-[360px]:inline">
                    {shortLabel}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Left sidebar for wide viewports (>= lg).
 * Full labels, pill rows, brand on top. Same NAV_ITEMS.
 */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="sticky top-0 hidden h-screen w-[264px] shrink-0 flex-col border-r border-line-default bg-white px-4 py-7 lg:flex"
    >
      <div className="px-2">
        <Brand />
      </div>
      <ul className="mt-10 flex flex-col gap-1">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = isNavActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[48px] items-center gap-3 rounded-full px-4 text-[15px] transition-colors ${
                  active
                    ? "bg-primary-500 font-medium text-ink-900"
                    : "text-ink-600 hover:bg-surface-100 hover:text-ink-900"
                }`}
              >
                <Icon aria-hidden size={20} strokeWidth={active ? 2.25 : 1.75} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="mt-auto px-4 text-[13px] leading-5 text-ink-500">
        Local-first MVP.
        <br />
        Your data stays on this device.
      </p>
    </nav>
  );
}
