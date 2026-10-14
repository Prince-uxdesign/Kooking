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
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(self), geolocation=()",
          },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
