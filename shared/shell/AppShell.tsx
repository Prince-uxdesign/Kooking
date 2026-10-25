"use client";

import { Sidebar, TabBar } from "./Navigation";
import { SiteHeader } from "./SiteHeader";
import { SavedAnnouncer } from "@/features/saved/SavedAnnouncer";
import { InstallBanner } from "@/features/pwa/InstallBanner";

/**
 * Main application shell (< xl: app bar + bottom tabs, phones and
 * tablets alike; >= xl: sidebar). Page content stays in `children` —
 * no feature logic lives here.
 */
export function AppShell({
  children,
  banner,
}: {
  children: React.ReactNode;
  /** Optional cross-page notice above the content (e.g. resume cooking). */
  banner?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen xl:flex xl:items-start">
      <SiteHeader />
      <Sidebar />
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-[1120px] flex-1 px-5 pb-28 pt-4 sm:px-6 sm:pt-6 xl:px-12 xl:pb-16 xl:pt-12"
      >
        <InstallBanner />
        {banner}
        {children}
      </main>
      <TabBar />
      <SavedAnnouncer />
    </div>
  );
}
