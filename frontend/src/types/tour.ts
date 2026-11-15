// Type definitions for 360° virtual tour rooms recorded by sellers.
import type { OrientationQuat } from "../../../shared/capturePolicy.ts";

export type TourRoomStatus = "processing" | "ready" | "failed";

export interface TourHotspot {
  id: number;
  from_room_id: number;
  to_room_id: number;
  yaw: number;
  pitch: number;
}

export interface TourRoom {
  id: number;
  property_id: number;
  name: string;
  note: string;
  status: TourRoomStatus;
  panorama_path: string;
  preview_path: string;
  quality_score: number;
  error_message?: string;
  sort_order: number;
  hotspots: TourHotspot[];
  created_at: string;
}

/** Quaternion (w, x, y, z) describing the camera-to-world rotation of the phone when a frame was taken. */
export type { OrientationQuat };

export interface CapturedFrame {
  targetId: number;
  blob: Blob;
  orientation: OrientationQuat;
}

/** A room recorded or picked on the "add property" page, uploaded once the property is saved. */
export interface DraftTourRoom {
  key: string;
  name: string;
  kind: "capture" | "import";
  frames?: CapturedFrame[];
  file?: File;
  thumbUrl: string;
}
