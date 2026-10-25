import type { Metadata } from "next";
import { Closing } from "@/features/landing/Closing";
import { LandingNav } from "@/features/landing/LandingNav";
import { RecipePreview } from "@/features/landing/RecipePreview";
import { loadDiscovery } from "@/features/recipes/load-discovery";

export const metadata: Metadata = {
  title: { absolute: "Recipes · Fork" },
  description:
    "Jollof rice, egusi soup, efo riro and moi moi: start with a Nigerian classic and cook it one calm step at a time.",
};

const FEATURED = ["jollof-rice", "egusi-soup", "efo-riro", "moi-moi"];

export default async function RecipesPreviewPage() {
  const discovery = await loadDiscovery();
  const all = discovery.ok ? discovery.recipes : [];
  const picked = FEATURED.flatMap((slug) => all.find((r) => r.slug === slug) ?? []);
  const recipes = picked.length > 0 ? picked : all.slice(0, 4);

  return (
    <>
      <LandingNav />
      <main id="main-content" tabIndex={-1} className="overflow-x-clip">
        <RecipePreview recipes={recipes} total={all.length} />
      </main>
      <Closing />
    </>
  );
}
