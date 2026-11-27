import { File } from 'expo-file-system';
import { roomManifest } from '../capture/roomManifest';
import { api, mediaUrl } from './client';
import { localTourFiles, type DraftTourRoom } from '@/types/capture';
import type { TourRoom } from '@/types/property';

export interface ServerTourRoom {
  id: number; property_id: number; name: string; note: string;
  status: 'processing' | 'ready' | 'failed'; panorama_path: string; preview_path: string;
  sort_order: number; quality_score: number; error_message?: string;
  hotspots: { id: number; from_room_id: number; to_room_id: number; yaw: number; pitch: number }[];
}

// mapRoom uses only server-generated panoramas and preserves server hotspot coordinates.
export function mapRoom(room: ServerTourRoom, rooms: ServerTourRoom[]): TourRoom {
  return { id: room.id, propertyId: room.property_id, name: room.name, roomSpecs: room.note,
    panoramaUrl: room.panorama_path ? mediaUrl(room.panorama_path) : '', sortOrder: room.sort_order,
    status: room.status, qualityScore: room.quality_score, errorMessage: room.error_message,
    hotspots: (room.hotspots || []).map((h) => ({ id: h.id, fromRoomId: h.from_room_id,
      targetRoomId: h.to_room_id, yawAngle: h.yaw, pitchAngle: h.pitch,
      label: rooms.find((r) => r.id === h.to_room_id)?.name || 'Ruangan' })) };
}

// getTourRoomsForProperty exposes the same ready rooms and panorama files as the website.
export async function getTourRoomsForProperty(propertyId: number): Promise<TourRoom[]> {
  const { rooms } = await api<{ rooms: ServerTourRoom[] }>(`/tours/public?property_id=${propertyId}`);
  return rooms.map((room) => mapRoom(room, rooms));
}

// getOwnerTourRooms includes processing and failed rooms for the seller's status display.
export async function getOwnerTourRooms(propertyId: number): Promise<TourRoom[]> {
  const { rooms } = await api<{ rooms: ServerTourRoom[] }>(`/tours/owner?property_id=${propertyId}`);
  return rooms.map((room) => mapRoom(room, rooms));
}

// uploadTourCapture sends the completed panorama bands or a draft created by the older frame recorder.
export async function uploadTourCapture(propertyId: number, room: DraftTourRoom): Promise<ServerTourRoom> {
  const files = localTourFiles(room);
  if (!files.length) throw new Error('Rekaman panorama belum lengkap.');
  const form = new FormData();
  form.append('property_id', String(propertyId));
  form.append('meta', JSON.stringify(roomManifest(room)));
  files.forEach((file, i) => form.append(`frame_${i}`, new File(file.uri), `frame_${i}.jpg`));
  return api<ServerTourRoom>('/tours/captures', { method: 'POST', body: form });
}

// updateTourRoom updates an owned room without replacing its panorama or navigation links.
export async function updateTourRoom(id: number, name: string, note: string) {
  await api(`/tours/rooms/${id}`, { method: 'PATCH', body: JSON.stringify({ name, note }) });
}

// deleteTourRoom delegates ownership checks and private capture cleanup to the backend.
export async function deleteTourRoom(id: number) { await api(`/tours/rooms/${id}`, { method: 'DELETE' }); }
