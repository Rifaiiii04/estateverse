import { getMediaUrl } from "@/lib/api/client";
import type { TourRoom } from "@/types/tour";

// panoramaUrlFor picks the lighter preview on touch devices and the full-resolution panorama elsewhere.
export function panoramaUrlFor(room: TourRoom): string {
  const isTouch = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
  const path = isTouch && room.preview_path ? room.preview_path : room.panorama_path;
  return getMediaUrl(path);
}
