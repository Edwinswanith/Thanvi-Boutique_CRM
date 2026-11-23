import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo/site";
import { liveCollections, publishedForIndex } from "@/server/services/storefront";

export const dynamic = "force-dynamic";

/** Every live page, with product photos, so new sarees are discovered quickly. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, collections] = await Promise.all([publishedForIndex(), liveCollections()]);
  const latest = products.reduce((d, p) => (p.updatedAt > d ? p.updatedAt : d), new Date(0));
  const now = products.length ? latest : new Date();
  return [
    { url: absoluteUrl("/shop"), lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/shop/sarees"), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    ...collections.map((c) => ({ url: absoluteUrl(`/shop/sarees?fabric=${c.key}`), lastModified: now, changeFrequency: "weekly" as const, priority: 0.8 })),
    { url: absoluteUrl("/shop/about"), changeFrequency: "monthly", priority: 0.6 },
    ...products.map((p) => ({
      url: absoluteUrl(`/shop/sarees/${p.slug}`),
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
      images: p.photos.map(absoluteUrl),
    })),
  ];
}
