import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kooking — Cooking Companion",
    short_name: "Kooking",
    description:
      "A focused, distraction-free cooking companion for confident home cooking with step-by-step guidance and offline timers.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#3EDC6B",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
    categories: ["food", "lifestyle", "utilities"],
    shortcuts: [
      {
        name: "Explore Recipes",
        short_name: "Recipes",
        url: "/recipes",
        description: "Browse tested, reliable recipes",
      },
      {
        name: "Shopping Lists",
        short_name: "Lists",
        url: "/lists",
        description: "View and check off ingredients",
      },
    ],
  };
}
