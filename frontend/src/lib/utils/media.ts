/** Local placeholder shown when a listing has no photos, so stock photos are never mistaken for the real house. */
export const NO_PHOTO_PLACEHOLDER = "/placeholder-house.svg";

// hasVirtualTour reports whether a listing can be explored virtually (recorded 360° rooms or a 3D model).
export function hasVirtualTour(p: { has_tour?: boolean; model_3d_path?: string }): boolean {
  return Boolean(p.has_tour || p.model_3d_path);
}
