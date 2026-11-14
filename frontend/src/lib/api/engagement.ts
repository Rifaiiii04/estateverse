import { apiClient } from "./client";
import type { ImpactStats } from "@/types/property";

export type ViewKind = "detail" | "tour_360" | "tour_3d";

const SESSION_PREFIX = "ev_viewed";

// sessionKey identifies one property/event pair within the browser tab session.
function sessionKey(propertyId: number, kind: ViewKind): string {
  return `${SESSION_PREFIX}:${propertyId}:${kind}`;
}

// trackPropertyEvent records a real engagement event once per browser session; failures are ignored.
export function trackPropertyEvent(propertyId: number, kind: ViewKind): void {
  if (typeof window === "undefined") return;
  const key = sessionKey(propertyId, kind);
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, "1");
  void apiClient("/events", { method: "POST", body: JSON.stringify({ property_id: propertyId, kind }) }).catch(() => {
    sessionStorage.removeItem(key);
  });
}

// hasViewedTour reports whether this visitor opened the 360° tour or 3D model of the property in this session.
export function hasViewedTour(propertyId: number): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(sessionStorage.getItem(sessionKey(propertyId, "tour_360")) || sessionStorage.getItem(sessionKey(propertyId, "tour_3d")));
}

export type ReportReason = "scam" | "wrong_info" | "sold" | "other";

// reportListing sends a visitor report about a suspicious or incorrect listing.
export async function reportListing(propertyId: number, reason: ReportReason, note: string): Promise<void> {
  await apiClient("/reports", { method: "POST", body: JSON.stringify({ property_id: propertyId, reason, note }) });
}

// getImpactStats fetches platform-wide aggregate counts for the public impact section.
export async function getImpactStats(): Promise<ImpactStats> {
  return apiClient<ImpactStats>("/stats/impact");
}
