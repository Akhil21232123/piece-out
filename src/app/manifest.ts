import type { MetadataRoute } from "next";
import { DESCRIPTION, SITE } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "pieceout",
    short_name: "pieceout",
    description: DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#efe8dc",
    theme_color: "#8A56B8",
    lang: "en-IN",
    icons: [
      {
        src: "/brand/mark.jpg",
        sizes: "576x576",
        type: "image/jpeg",
        purpose: "any",
      },
    ],
  };
}
