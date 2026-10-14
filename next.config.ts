import type { NextConfig } from "next";
import { recipeCategories } from "./shared/domain/recipe-schema";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  /**
   * Explore routing. Done here (before render) so these are real
   * redirects, not client-side ones after a streamed loading state.
   */
  async redirects() {
    return [
      // Bare index paths: categories and collections are listed on Explore.
      { source: "/recipes/categories", destination: "/recipes", permanent: false },
      { source: "/recipes/collections", destination: "/recipes", permanent: false },
      // Phase 7 links used /recipes?category=<id>; keep them working.
      {
        source: "/recipes",
        has: [
          { type: "query", key: "category", value: `(?<category>${recipeCategories.join("|")})` },
        ],
        destination: "/recipes/categories/:category",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
