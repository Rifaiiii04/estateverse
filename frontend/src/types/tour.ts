// Type definitions for 360° virtual tour rooms recorded by sellers.
import type { CaptureExtras, OrientationQuat } from "../../../shared/capturePolicy.ts";

export type TourRoomStatus = "processing" | "ready" | "failed";

/** How a room was produced: live guided capture with sensors, or an uploaded finished 360° photo. */
export type TourRoomSource = "unknown" | "capture" | "import";

/** Server verdict on whether a room was recorded live near the listing's map pin. */
export type LocationCheck = "verified" | "far" | "imprecise" | "no_gps" | "no_pin" | "not_live";

export interface TourHotspot {
  id: number;
  from_room_id: number;
  to_room_id: number;
  yaw: number;
  pitch: number;
}

/** A floor corner traced in a panorama, as the yaw/pitch (degrees) seen from the camera. */
export interface FloorPoint {
  yaw: number;
  pitch: number;
}

/** Seller-calibrated geometry that turns a panorama into floor measurements. */
export interface RoomLayout {
  camera_height_cm: number;
  floor_outline: FloorPoint[];
}

export interface TourRoom {
  id: number;
  property_id: number;
  name: string;
  note: string;
  source: TourRoomSource;
  camera_height_cm: number;
  floor_outline: FloorPoint[];
  location_check?: LocationCheck;
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
export type { CaptureExtras, OrientationQuat };

export interface CapturedFrame {
  targetId: number;
  blob: Blob;
  orientation: OrientationQuat;
}

/** A finished recording: frames plus the optional camera height and GPS fix taken during capture. */
export interface CaptureResult {
  frames: CapturedFrame[];
  extras: CaptureExtras;
}

/** A room recorded or picked on the "add property" page, uploaded once the property is saved. */
export interface DraftTourRoom {
  key: string;
  name: string;
  kind: "capture" | "import";
  frames?: CapturedFrame[];
  extras?: CaptureExtras;
  file?: File;
  thumbUrl: string;
}
