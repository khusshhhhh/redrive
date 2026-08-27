import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Redrive — Australian vehicle sharing",
    short_name: "Redrive",
    description: "Discover and share useful vehicles with local hosts across Australia.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#710014",
    orientation: "portrait-primary",
    categories: ["travel", "transportation", "lifestyle"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
