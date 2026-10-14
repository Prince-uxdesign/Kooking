import { ResumeBar } from "@/features/cooking/ResumeBar";
import { AppShell } from "@/shared/shell/AppShell";
import { AuthProvider } from "@/features/auth/AuthContext";

/** Main-group layout: every tabbed destination renders inside AppShell with optional AuthContext. */
export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppShell banner={<ResumeBar />}>{children}</AppShell>
    </AuthProvider>
  );
}
