import { headers } from "next/headers";
import type { Property } from "@/types/property";

export const SITE_NAME = "EstateVerse";
export const SITE_DESCRIPTION =
  "EstateVerse membantu penjual perorangan dan developer kecil memasarkan rumah dengan tur virtual 360° yang direkam dari HP, dan membantu pembeli rumah pertama melihat isi rumah sebelum survei.";

const PUBLIC_LISTING_PAGE_SIZE = 50;
const MAX_SITEMAP_PAGES = 20;
const LISTING_REVALIDATE_SECONDS = 300;

// siteOrigin returns the public origin from NEXT_PUBLIC_SITE_URL, or from the incoming request when it is not set.
export async function siteOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/+$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

// serverApiBase resolves the Go API for server-side fetches; it never follows request headers, to avoid SSRF.
function serverApiBase(): string {
  const internal = process.env.API_INTERNAL_URL;
  if (internal) return internal.replace(/\/+$/, "");
  const pub = process.env.NEXT_PUBLIC_API_URL ?? "";
  return pub.startsWith("http") ? pub.replace(/\/+$/, "") : "http://localhost:8085/api/v1";
}

// fetchApiData reads one enveloped API response on the server, returning null on any failure.
async function fetchApiData<T>(endpoint: string): Promise<T | null> {
  try {
    const res = await fetch(`${serverApiBase()}${endpoint}`, {
      next: { revalidate: LISTING_REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { data?: T };
    return body.data ?? null;
  } catch {
    return null;
  }
}

// fetchPublicListing loads a published listing for page metadata.
export async function fetchPublicListing(slug: string): Promise<Property | null> {
  return fetchApiData<Property>(`/properties/${encodeURIComponent(slug)}`);
}

// fetchPublishedListings pages through every published listing for the sitemap.
export async function fetchPublishedListings(): Promise<Property[]> {
  const all: Property[] = [];
  for (let page = 1; page <= MAX_SITEMAP_PAGES; page++) {
    const data = await fetchApiData<{ properties: Property[]; total: number }>(
      `/properties?page=${page}&limit=${PUBLIC_LISTING_PAGE_SIZE}`
    );
    if (!data?.properties?.length) break;
    all.push(...data.properties);
    if (all.length >= data.total) break;
  }
  return all;
}

// absoluteMediaUrl turns a stored media path into a full URL that link previews (WhatsApp, Facebook) can load.
export function absoluteMediaUrl(origin: string, path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}
