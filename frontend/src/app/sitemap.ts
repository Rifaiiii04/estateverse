import type { MetadataRoute } from "next";
import { fetchPublishedListings, siteOrigin } from "@/lib/seo/site";

// sitemap lists the public pages plus every published listing so search engines can find new houses.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = await siteOrigin();
  const listings = await fetchPublishedListings();
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${origin}/`, changeFrequency: "daily", priority: 1 },
    { url: `${origin}/properties`, changeFrequency: "daily", priority: 0.9 },
    { url: `${origin}/ai-consultant`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${origin}/register`, changeFrequency: "monthly", priority: 0.4 },
  ];
  return [
    ...staticPages,
    ...listings.map((p) => ({
      url: `${origin}/properties/${p.slug}`,
      lastModified: p.updated_at,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
