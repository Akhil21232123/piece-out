import type { MetadataRoute } from "next";
import { SHOP } from "@/data/products";
import { SITE } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    {
      url: SITE.url,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    ...SHOP.map((product, index) => ({
      url: `${SITE.url}/#${product.id}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: index < 4 ? 0.9 : 0.7,
    })),
  ];
}
