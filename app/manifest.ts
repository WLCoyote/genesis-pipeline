import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Genesis Pipeline",
    short_name: "Genesis",
    description: "Estimate Pipeline & Sales Automation — Genesis HVAC",
    start_url: "/m/",
    display: "standalone",
    theme_color: "#0a1628",
    background_color: "#f0f3f8",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
