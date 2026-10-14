import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  /**
   * Explore routing. Done here (before render) so these are real
   * redirects, not client-side ones after a streamed loading state.
   * (`/recipes?category=` is a search filter since Phase 9.)
   */
  async redirects() {
    return [
      // Bare index paths: categories and collections are listed on Explore.
      { source: "/recipes/categories", destination: "/recipes", permanent: false },
      { source: "/recipes/collections", destination: "/recipes", permanent: false },
    ];
  },
};

export default nextConfig;
