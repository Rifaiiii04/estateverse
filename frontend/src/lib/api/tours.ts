import { apiClient, apiUrl, ApiError } from "./client.ts";
import { checkAborted } from "../abort.ts";
import type { CaptureResult, RoomLayout, TourHotspot, TourRoom } from "@/types/tour";

const captureIds = new WeakMap<Blob, string>();

// Generates a secure v4 identifier on browsers with either Web Crypto UUIDs or random bytes.
function newCaptureId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join("-");
}

// Keeps one UUID with the recording's first JPEG across review uploads and unsaved-property draft retries.
function captureId(firstBand: Blob) {
  let id = captureIds.get(firstBand);
  if (!id) {
    id = newCaptureId();
    captureIds.set(firstBand, id);
  }
  return id;
}

// getPublicTourRooms fetches the ready 360° rooms of a published property.
export async function getPublicTourRooms(propertyId: number): Promise<TourRoom[]> {
  const data = await apiClient<{ rooms: TourRoom[] }>(`/tours/public?property_id=${propertyId}`);
  return data.rooms || [];
}

// getOwnerTourRooms fetches every room of the seller's property, including processing ones.
export async function getOwnerTourRooms(propertyId: number): Promise<TourRoom[]> {
  const data = await apiClient<{ rooms: TourRoom[] }>(`/tours/owner?property_id=${propertyId}`);
  return data.rooms || [];
}

// updateTourRoom changes a room's display name and its short note (size, window direction).
export async function updateTourRoom(roomId: number, name: string, note: string): Promise<void> {
  await apiClient(`/tours/rooms/${roomId}`, { method: "PATCH", body: JSON.stringify({ name, note }) });
}

// deleteTourRoom removes a room and its panorama.
export async function deleteTourRoom(roomId: number): Promise<void> {
  await apiClient(`/tours/rooms/${roomId}`, { method: "DELETE" });
}

// reorderTourRooms saves the display order of rooms.
export async function reorderTourRooms(propertyId: number, roomIds: number[]): Promise<void> {
  await apiClient("/tours/order", {
    method: "PUT",
    body: JSON.stringify({ property_id: propertyId, room_ids: roomIds }),
  });
}

// createTourHotspot links two rooms with a navigation marker at a direction (degrees).
export async function createTourHotspot(input: Omit<TourHotspot, "id">): Promise<TourHotspot> {
  return apiClient<TourHotspot>("/tours/hotspots", { method: "POST", body: JSON.stringify(input) });
}

// deleteTourHotspot removes a navigation marker.
export async function deleteTourHotspot(hotspotId: number): Promise<void> {
  await apiClient(`/tours/hotspots/${hotspotId}`, { method: "DELETE" });
}

// saveTourRoomLayout stores the camera height and traced floor outline used to measure a room.
export async function saveTourRoomLayout(roomId: number, layout: RoomLayout): Promise<void> {
  await apiClient(`/tours/layouts/${roomId}`, { method: "PUT", body: JSON.stringify(layout) });
}

// Sends one completed panorama JPEG per sweep, its latitude bounds and optional room measurements.
export function uploadTourCapture(
  propertyId: number,
  name: string,
  capture: CaptureResult,
  onProgress?: (fraction: number) => void,
  signal?: AbortSignal
): Promise<TourRoom> {
  const { bands, extras } = capture;
  const form = new FormData();
  form.append("property_id", String(propertyId));
  if (!bands.length) throw new Error("Sapuan belum lengkap.");
  form.append("meta", JSON.stringify({ name, ...extras, capture_id: captureId(bands[0].blob), bands: bands.map(({ meta }) => meta) }));
  bands.forEach(({ blob }, index) => form.append(`frame_${index}`, blob, `panorama_${index}.jpg`));
  return sendMultipart<TourRoom>("/tours/captures", form, onProgress, signal);
}

// importTourPanorama uploads a ready-made equirectangular 360° photo as a room.
export function importTourPanorama(
  propertyId: number,
  name: string,
  file: File,
  onProgress?: (fraction: number) => void
): Promise<TourRoom> {
  const form = new FormData();
  form.append("property_id", String(propertyId));
  form.append("name", name);
  form.append("panorama", file);
  return sendMultipart<TourRoom>("/tours/imports", form, onProgress);
}

// sendMultipart posts form data with cookies via XHR so upload progress can be shown on slow mobile data.
function sendMultipart<T>(endpoint: string, form: FormData, onProgress?: (fraction: number) => void, signal?: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    checkAborted(signal);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", apiUrl(endpoint));
    xhr.withCredentials = true;
    xhr.upload.onprogress = (e) => {
      if (!signal?.aborted && e.lengthComputable && onProgress) onProgress(e.loaded / e.total);
    };
    xhr.onerror = () => reject(new ApiError("Koneksi terputus saat mengunggah. Coba lagi.", 0));
    xhr.onload = () => resolveXhr<T>(xhr, resolve, reject);
    // Cancels the active network transfer if its camera modal closes.
    const cancel = () => xhr.abort();
    signal?.addEventListener("abort", cancel, { once: true });
    xhr.onabort = () => reject(new DOMException("Unggahan dibatalkan.", "AbortError"));
    xhr.onloadend = () => signal?.removeEventListener("abort", cancel);
    xhr.send(form);
  });
}

// resolveXhr parses the standard API envelope from an XHR response.
function resolveXhr<T>(xhr: XMLHttpRequest, resolve: (v: T) => void, reject: (e: Error) => void) {
  let body: { data?: T; error?: string } = {};
  try {
    body = JSON.parse(xhr.responseText || "{}");
  } catch {
    body = {};
  }
  if (xhr.status >= 200 && xhr.status < 300) {
    resolve((body.data ?? body) as T);
    return;
  }
  reject(new ApiError(body.error || `Unggahan gagal (status ${xhr.status})`, xhr.status));
}
