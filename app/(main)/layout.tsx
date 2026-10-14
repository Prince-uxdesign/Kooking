import { ResumeBar } from "@/features/cooking/ResumeBar";
import { AppShell } from "@/shared/shell/AppShell";

/** Main-group layout: every tabbed destination renders inside AppShell. */
export default function MainLayout({ children }: { children: React.ReactNode }) {
  return <AppShell banner={<ResumeBar />}>{children}</AppShell>;
}
