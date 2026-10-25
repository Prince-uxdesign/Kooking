"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, isNavActive } from "./nav-items";
import { Brand } from "./SiteHeader";

/**
 * Bottom tab bar for touch viewports (< lg): frosted white, full width,
 * icon over a short label. The active tab turns pepper orange and sits
 * in a soft tinted well. Desktop uses the sidebar instead.
 */
export function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="glass-bar safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line-default lg:hidden"
    >
      <ul className="mx-auto grid max-w-[560px] grid-cols-5 px-2">
        {NAV_ITEMS.map(({ href, label, shortLabel, Icon }) => {
          const active = isNavActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-label={label}
                title={label}
                aria-current={active ? "page" : undefined}
                className={`group flex min-h-[60px] flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium transition-colors ${
                  active ? "text-primary-700" : "text-ink-500 hover:text-ink-900"
                }`}
              >
                <span
                  aria-hidden
                  className={`inline-flex h-8 w-14 items-center justify-center rounded-full transition-[background-color,scale] duration-200 ease-out group-active:scale-90 ${
                    active ? "bg-primary-50" : ""
                  }`}
                >
                  <Icon size={21} strokeWidth={active ? 2.25 : 1.75} />
                </span>
                <span aria-hidden>{shortLabel}</span>
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
      className="sticky top-0 hidden h-screen w-[264px] shrink-0 flex-col border-r border-line-default bg-white/70 px-4 py-7 lg:flex"
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
                className={`flex min-h-[48px] items-center gap-3 rounded-full px-4 text-[0.9375rem] transition-colors ${
                  active
                    ? "bg-primary-50 font-medium text-primary-800"
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
      <p className="mt-auto px-4 text-[0.8125rem] leading-5 text-ink-500">
        Local-first MVP.
        <br />
        Your data stays on this device.
      </p>
    </nav>
  );
}
