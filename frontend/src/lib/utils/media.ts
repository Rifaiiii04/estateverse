import type { SyntheticEvent } from "react";

/** Local placeholder shown when a listing has no photos, so stock photos are never mistaken for the real house. */
export const NO_PHOTO_PLACEHOLDER = "/placeholder-house.svg";

/** How a listing can be explored beyond photos. */
export type VirtualTourKind = "tour360" | "model3d" | "none";

interface TourFlags {
  has_tour?: boolean;
  model_3d_path?: string;
}

// virtualTourKind tells whether a listing has recorded Walk Inside 360° rooms, only a 3D model, or neither.
export function virtualTourKind(p: TourFlags): VirtualTourKind {
  if (p.has_tour) return "tour360";
  if (p.model_3d_path) return "model3d";
  return "none";
}

// hasWalkInside360 reports whether a listing has at least one ready 360° room (a 3D model alone does not count).
export function hasWalkInside360(p: TourFlags): boolean {
  return Boolean(p.has_tour);
}

// showPlaceholderOnError swaps a broken listing photo for the neutral placeholder instead of showing alt text.
export function showPlaceholderOnError(event: SyntheticEvent<HTMLImageElement>): void {
  const img = event.currentTarget;
  if (!img.src.endsWith(NO_PHOTO_PLACEHOLDER)) img.src = NO_PHOTO_PLACEHOLDER;
}

// hasShowablePhotos is false only when a listing had photos and none of them can be served any more.
export function hasShowablePhotos(p: { images?: unknown[]; unreadable_photo_count?: number }): boolean {
  return (p.images?.length ?? 0) > 0 || !p.unreadable_photo_count;
}
