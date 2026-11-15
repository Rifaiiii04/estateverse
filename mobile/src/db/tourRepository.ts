import type { SQLiteDatabase } from 'expo-sqlite';

import type { TourRoom } from '@/types/property';

export interface TourRoomInput {
  name: string;
  panoramaUrl: string;
  roomSpecs: string;
}

interface TourRoomRow {
  id: number;
  property_id: number;
  name: string;
  panorama_url: string;
  room_specs: string;
  sort_order: number;
}

interface HotspotRow {
  id: number;
  from_room_id: number;
  target_room_id: number;
  label: string;
  yaw_angle: number;
}

// Loads all 360 tour rooms and linked navigation hotspots for a property.
export async function getTourRoomsForProperty(
  db: SQLiteDatabase,
  propertyId: number,
): Promise<TourRoom[]> {
  const rooms = await db.getAllAsync<TourRoomRow>(
    'SELECT * FROM property_tour_rooms WHERE property_id = ? ORDER BY sort_order ASC, id ASC',
    [propertyId],
  );

  if (rooms.length === 0) return [];

  const roomIds = rooms.map((r) => r.id);
  const placeholders = roomIds.map(() => '?').join(',');
  const hotspots = await db.getAllAsync<HotspotRow>(
    `SELECT * FROM tour_hotspots WHERE from_room_id IN (${placeholders})`,
    roomIds,
  );

  return rooms.map((room) => ({
    id: room.id,
    propertyId: room.property_id,
    name: room.name,
    panoramaUrl: room.panorama_url,
    roomSpecs: room.room_specs,
    sortOrder: room.sort_order,
    hotspots: hotspots
      .filter((h) => h.from_room_id === room.id)
      .map((h) => ({
        id: h.id,
        fromRoomId: h.from_room_id,
        targetRoomId: h.target_room_id,
        label: h.label,
        yawAngle: h.yaw_angle,
      })),
  }));
}

// Replaces all 360 tour rooms and links consecutive rooms with bidirectional hotspots.
export async function syncPropertyTourRooms(
  db: SQLiteDatabase,
  propertyId: number,
  rooms: TourRoomInput[],
): Promise<void> {
  await db.runAsync('DELETE FROM property_tour_rooms WHERE property_id = ?', [propertyId]);
  if (rooms.length === 0) return;

  const roomIds: number[] = [];
  for (const [index, r] of rooms.entries()) {
    const res = await db.runAsync(
      'INSERT INTO property_tour_rooms (property_id, name, panorama_url, room_specs, sort_order) VALUES (?, ?, ?, ?, ?)',
      [propertyId, r.name, r.panoramaUrl, r.roomSpecs, index],
    );
    roomIds.push(res.lastInsertRowId);
  }

  for (let i = 0; i < roomIds.length - 1; i++) {
    const currentId = roomIds[i];
    const nextId = roomIds[i + 1];
    await db.runAsync(
      'INSERT INTO tour_hotspots (from_room_id, target_room_id, label, yaw_angle) VALUES (?, ?, ?, ?)',
      [currentId, nextId, `Ke ${rooms[i + 1].name} →`, 90 + i * 30],
    );
    await db.runAsync(
      'INSERT INTO tour_hotspots (from_room_id, target_room_id, label, yaw_angle) VALUES (?, ?, ?, ?)',
      [nextId, currentId, `← Kembali ke ${rooms[i].name}`, 270],
    );
  }
}

// Deletes a 360 tour room by id.
export async function deleteTourRoom(db: SQLiteDatabase, roomId: number): Promise<void> {
  await db.runAsync('DELETE FROM property_tour_rooms WHERE id = ?', [roomId]);
}
