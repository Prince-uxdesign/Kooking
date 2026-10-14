import type { Metadata } from "next";
import { ProfileScreen } from "@/features/auth/ProfileScreen";
import { PageHeader } from "@/shared/shell/PageHeader";

export const metadata: Metadata = { title: "Profile" };

export default function ProfilePage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Profile"
        description="Optional cross-device sync and backup for your recipes."
      />
      <ProfileScreen />
    </div>
  );
}
