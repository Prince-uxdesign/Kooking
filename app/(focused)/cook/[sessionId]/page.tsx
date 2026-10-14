import type { Metadata } from "next";
import { CookSessionScreen } from "@/features/cooking/CookSessionScreen";
import { getRecipeRepository } from "@/shared/data/catalog";
import type { CatalogEntry } from "@/shared/domain/cooking-session";

export const metadata: Metadata = { title: "Cooking" };

/**
 * Cooking Mode route. Sessions live on the device, so the page only
 * supplies catalog versions (to flag a republished or removed recipe);
 * the session itself — including its instructions — comes from storage.
 */
export default async function CookPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const recipes = await getRecipeRepository().list();
  const catalog: Record<string, CatalogEntry> = Object.fromEntries(
    recipes.map((r) => [r.id, { title: r.title, slug: r.slug, contentVersion: r.contentVersion }]),
  );
  return <CookSessionScreen sessionId={decodeURIComponent(sessionId)} catalog={catalog} />;
}
