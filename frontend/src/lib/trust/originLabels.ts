import type { LocationCheck, TourRoom } from "@/types/tour";

export type TrustTone = "good" | "warn" | "neutral";

/** Plain-language explanation of each location verdict, for buyers and for the seller's own dashboard. */
export const LOCATION_CHECK_TEXT: Record<LocationCheck, { label: string; tone: TrustTone }> = {
  verified: { label: "Direkam langsung di lokasi rumah ini", tone: "good" },
  far: { label: "GPS saat merekam jauh dari titik lokasi rumah", tone: "warn" },
  imprecise: { label: "Sinyal GPS kurang akurat saat merekam", tone: "neutral" },
  no_gps: { label: "Direkam tanpa izin lokasi", tone: "neutral" },
  no_pin: { label: "Titik lokasi rumah belum dipasang di peta", tone: "neutral" },
  not_live: { label: "Foto 360° diunggah, bukan rekaman langsung", tone: "neutral" },
};

/** Summary of how a listing's 360° rooms were recorded, for the buyer-facing trust panel. */
export interface TourOriginSummary {
  total: number;
  verified: number;
  far: number;
  latestVerifiedAt: string | null;
}

// summarizeTourOrigin counts rooms recorded live at the pin and remembers the latest verified recording date.
export function summarizeTourOrigin(rooms: TourRoom[]): TourOriginSummary {
  const verified = rooms.filter((r) => r.location_check === "verified");
  const latest = verified.map((r) => r.created_at).sort().at(-1) ?? null;
  return { total: rooms.length, verified: verified.length, far: rooms.filter((r) => r.location_check === "far").length, latestVerifiedAt: latest };
}

/** Text colour for each trust tone, shared by seller and buyer views. */
export const TONE_TEXT_CLASS: Record<TrustTone, string> = {
  good: "text-sage-700",
  warn: "text-amber-700",
  neutral: "text-neutral-500",
};
