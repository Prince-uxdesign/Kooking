import { Bookmark, Home, ListChecks, Search, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Single source of truth for primary navigation.
 * Shell header, tab bar, and sidebar all render from NAV_ITEMS —
 * never a second hand-maintained list.
 *
 * Path mapping follows docs/INFORMATION_ARCHITECTURE.md:
 * Explore lives at /recipes, Shopping List at /lists.
 */
export interface NavItemDef {
  href: string;
  /** Full label (sidebar, headings). */
  label: string;
  /** Compact label for the 320px tab bar. */
  shortLabel: string;
  Icon: LucideIcon;
  match: "exact" | "prefix";
}

export const NAV_ITEMS: NavItemDef[] = [
  { href: "/", label: "Home", shortLabel: "Home", Icon: Home, match: "exact" },
  {
    href: "/recipes",
    label: "Explore",
    shortLabel: "Explore",
    Icon: Search,
    match: "prefix",
  },
  {
    href: "/saved",
    label: "Saved",
    shortLabel: "Saved",
    Icon: Bookmark,
    match: "prefix",
  },
  {
    href: "/lists",
    label: "Shopping List",
    shortLabel: "Lists",
    Icon: ListChecks,
    match: "prefix",
  },
  {
    href: "/profile",
    label: "Profile",
    shortLabel: "Profile",
    Icon: User,
    match: "prefix",
  },
];

/** Pure helper — unit-testable without React. */
export function isNavActive(pathname: string, href: string): boolean {
  const item = NAV_ITEMS.find((i) => i.href === href);
  if (!item || item.match === "exact") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
