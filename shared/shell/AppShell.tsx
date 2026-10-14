"use client";

import { Sidebar, TabBar } from "./Navigation";
import { SiteHeader } from "./SiteHeader";

/**
 * Main application shell (< lg: header + bottom tabs;
 * >= lg: sidebar). Page content stays in `children` —
 * no feature logic lives here.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen lg:flex lg:items-start">
      <SiteHeader />
      <Sidebar />
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-[1120px] flex-1 px-5 pb-32 pt-4 sm:px-6 sm:pt-6 lg:px-12 lg:pb-16 lg:pt-12"
      >
        {children}
      </main>
      <TabBar />
    </div>
  );
}
