import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/seo/site";

// robots allows public pages and keeps the seller dashboard and API out of search engines.
export default async function robots(): Promise<MetadataRoute.Robots> {
  const origin = await siteOrigin();
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/dashboard", "/api/"] },
    sitemap: `${origin}/sitemap.xml`,
  };
}
