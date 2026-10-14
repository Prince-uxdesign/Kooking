import type { Metadata } from "next";

/**
 * The design-system showcase is an internal reference, not a product
 * screen: nothing links to it and search engines are told to skip it.
 * Production builds answer it with a 404 (see `rewrites` in next.config.ts).
 */
export const metadata: Metadata = {
  title: "Design system",
  robots: { index: false, follow: false },
};

export default function DesignSystemLayout({ children }: { children: React.ReactNode }) {
  return children;
}
