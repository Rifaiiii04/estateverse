import type { Metadata } from "next";
import { formatIDR } from "@/lib/utils/formatters";
import { absoluteMediaUrl, fetchPublicListing, siteOrigin } from "@/lib/seo/site";

const DESCRIPTION_LIMIT = 155;

type Props = { params: Promise<{ slug: string }> };

// generateMetadata gives each listing its own title, summary, and cover photo for search results and WhatsApp previews.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const listing = await fetchPublicListing(slug);
  if (!listing) return { title: "Properti Tidak Ditemukan", robots: { index: false } };

  const origin = await siteOrigin();
  const summary = `${formatIDR(listing.price)} · ${listing.bedrooms} KT · ${listing.bathrooms} KM · LB ${listing.building_area} m² · ${listing.city}`;
  const description = `${summary}. ${listing.description}`.slice(0, DESCRIPTION_LIMIT).trim();
  const cover = listing.images?.[0]?.file_path;
  const url = `${origin}/properties/${listing.slug}`;
  return {
    title: listing.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      title: listing.title,
      description,
      ...(cover ? { images: [{ url: absoluteMediaUrl(origin, cover), alt: listing.title }] } : {}),
    },
  };
}

// PropertyDetailLayout only provides listing metadata; the detail page renders on the client.
export default function PropertyDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
