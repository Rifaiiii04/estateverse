import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import { createProperty } from '@/db/propertyWrites';
import { SAMPLE_LISTINGS } from '@/db/seedData';
import { insertUser } from '@/db/userRepository';

const DEMO_AGENT_NAME = 'EstateVerse Demo Agent';
const DEMO_AGENT_EMAIL = 'demo-agent@estateverse.invalid';

const SAMPLE_ROOMS = [
  {
    name: 'Ruang Tamu & Foyer',
    url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600&q=80',
    specs: '6m × 5m • Plafon 3.8m • Marmer Travertine',
  },
  {
    name: 'Kamar Tidur Utama',
    url: 'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=1600&q=80',
    specs: '5m × 4.5m • Ensuite Bathroom • Balkon Pribadi',
  },
  {
    name: 'Dapur Bersih & Dining',
    url: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=1600&q=80',
    specs: '4.5m × 4m • Kitchen Island • Full Granite',
  },
  {
    name: 'Teras & Kolam Renang',
    url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1600&q=80',
    specs: '8m × 4m • Deck Kayu Ulin • Kolam Renang Privat',
  },
];

// Converts random bytes to a hex string.
function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

// Inserts sample listings once, owned by a demo agent whose password nobody knows.
export async function seedSampleListings(db: SQLiteDatabase): Promise<void> {
  const existing = await db.getFirstAsync<{ total: number }>(
    'SELECT COUNT(*) AS total FROM properties',
  );
  if ((existing?.total ?? 0) > 0) return;

  const unusableHash = toHex(await Crypto.getRandomBytesAsync(32));
  const unusableSalt = toHex(await Crypto.getRandomBytesAsync(16));
  const ownerId = await insertUser(db, DEMO_AGENT_NAME, DEMO_AGENT_EMAIL, unusableHash, unusableSalt);

  for (const listing of SAMPLE_LISTINGS) {
    await createProperty(db, ownerId, listing);
  }
}

// Populates interactive 360 tour rooms and navigational hotspots for properties.
export async function seedTourRoomsIfEmpty(db: SQLiteDatabase): Promise<void> {
  const existing = await db.getFirstAsync<{ total: number }>(
    'SELECT COUNT(*) AS total FROM property_tour_rooms',
  );
  if ((existing?.total ?? 0) > 0) return;

  const properties = await db.getAllAsync<{ id: number }>('SELECT id FROM properties LIMIT 5');

  for (const prop of properties) {
    const roomIds: number[] = [];
    for (const [index, room] of SAMPLE_ROOMS.entries()) {
      const res = await db.runAsync(
        'INSERT INTO property_tour_rooms (property_id, name, panorama_url, room_specs, sort_order) VALUES (?, ?, ?, ?, ?)',
        [prop.id, room.name, room.url, room.specs, index],
      );
      roomIds.push(res.lastInsertRowId);
    }

    if (roomIds.length >= 4) {
      // Hotspots from Living Room
      await db.runAsync(
        'INSERT INTO tour_hotspots (from_room_id, target_room_id, label, yaw_angle) VALUES (?, ?, ?, ?)',
        [roomIds[0], roomIds[1], 'Ke Kamar Tidur Utama →', 90],
      );
      await db.runAsync(
        'INSERT INTO tour_hotspots (from_room_id, target_room_id, label, yaw_angle) VALUES (?, ?, ?, ?)',
        [roomIds[0], roomIds[2], 'Ke Dapur & Dining →', 180],
      );
      await db.runAsync(
        'INSERT INTO tour_hotspots (from_room_id, target_room_id, label, yaw_angle) VALUES (?, ?, ?, ?)',
        [roomIds[0], roomIds[3], 'Ke Teras & Kolam ↓', 270],
      );

      // Hotspots from Master Bedroom
      await db.runAsync(
        'INSERT INTO tour_hotspots (from_room_id, target_room_id, label, yaw_angle) VALUES (?, ?, ?, ?)',
        [roomIds[1], roomIds[0], '← Ke Ruang Tamu', 270],
      );

      // Hotspots from Kitchen
      await db.runAsync(
        'INSERT INTO tour_hotspots (from_room_id, target_room_id, label, yaw_angle) VALUES (?, ?, ?, ?)',
        [roomIds[2], roomIds[0], '← Ke Ruang Tamu', 0],
      );
      await db.runAsync(
        'INSERT INTO tour_hotspots (from_room_id, target_room_id, label, yaw_angle) VALUES (?, ?, ?, ?)',
        [roomIds[2], roomIds[3], 'Ke Teras & Kolam →', 180],
      );

      // Hotspots from Pool Terrace
      await db.runAsync(
        'INSERT INTO tour_hotspots (from_room_id, target_room_id, label, yaw_angle) VALUES (?, ?, ?, ?)',
        [roomIds[3], roomIds[0], '← Masuk Ruang Tamu', 90],
      );
    }
  }
}
