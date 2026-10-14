import type { Metadata } from "next";
import { SavedRecipesScreen } from "@/features/saved/SavedRecipesScreen";
import { loadDiscovery } from "@/features/recipes/load-discovery";
import { toSummary } from "@/shared/domain/discovery";
import { PageHeader } from "@/shared/shell/PageHeader";
import { ErrorState } from "@/shared/ui/States";
import { SyncNoticeBanner } from "@/features/auth/SyncNoticeBanner";

export const metadata: Metadata = { title: "Saved" };

/**
 * Saved recipes. Which recipes are saved lives on the device (no account
 * needed); this page supplies the listable catalog so titles, photos and
 * availability always come from the live recipes, never from storage.
 */
export default async function SavedPage() {
  const discovery = await loadDiscovery();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Saved"
        description="Recipes you want to cook later, kept on this device."
      />
      <SyncNoticeBanner />
      {discovery.ok ? (
        <SavedRecipesScreen catalog={discovery.recipes.map(toSummary)} />
      ) : (
        <ErrorState
          headingLevel={2}
          title="Recipes couldn't load"
          message="Your saved list is safe on this device. Try again in a moment."
        />
      )}
    </div>
  );
}
