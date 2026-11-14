import { apiClient, apiUrl, ApiError } from "./client";
import { CapturedFrame, TourHotspot, TourRoom } from "@/types/tour";

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

// uploadTourCapture sends auto-captured frames with their orientations, reporting upload progress (0..1).
export function uploadTourCapture(
  propertyId: number,
  name: string,
  frames: CapturedFrame[],
  onProgress?: (fraction: number) => void
): Promise<TourRoom> {
  const form = new FormData();
  form.append("property_id", String(propertyId));
  form.append(
    "meta",
    JSON.stringify({ name, frames: frames.map((f, index) => ({ index, orientation: f.orientation })) })
  );
  frames.forEach((f, index) => form.append(`frame_${index}`, f.blob, `frame_${index}.jpg`));
  return sendMultipart<TourRoom>("/tours/captures", form, onProgress);
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
function sendMultipart<T>(endpoint: string, form: FormData, onProgress?: (fraction: number) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", apiUrl(endpoint));
    xhr.withCredentials = true;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total);
    };
    xhr.onerror = () => reject(new ApiError("Koneksi terputus saat mengunggah. Coba lagi.", 0));
    xhr.onload = () => resolveXhr<T>(xhr, resolve, reject);
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
