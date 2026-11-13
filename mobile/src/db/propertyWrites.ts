import type { SQLiteDatabase } from 'expo-sqlite';

import { slugify } from '@/lib/formatters';
import type { PropertyInput, PropertyStatus } from '@/types/property';

const NOT_OWNED_MESSAGE = 'Properti tidak ditemukan atau bukan milik Anda.';

// Creates a slug that is unique among all listings by appending a short suffix when needed.
async function generateUniqueSlug(db: SQLiteDatabase, title: string): Promise<string> {
  const base = slugify(title) || 'properti';
  let candidate = base;
  let attempt = 1;

  while (await db.getFirstAsync('SELECT 1 FROM properties WHERE slug = ?', [candidate])) {
    attempt += 1;
    candidate = `${base}-${attempt}`;
  }
  return candidate;
}

// Replaces all photos and benefits of a listing with the submitted ones.
async function replaceRelations(
  db: SQLiteDatabase,
  propertyId: number,
  input: PropertyInput,
): Promise<void> {
  await db.runAsync('DELETE FROM property_images WHERE property_id = ?', [propertyId]);
  await db.runAsync('DELETE FROM property_benefits WHERE property_id = ?', [propertyId]);

  for (const [index, filePath] of input.imagePaths.entries()) {
    await db.runAsync(
      'INSERT INTO property_images (property_id, file_path, sort_order) VALUES (?, ?, ?)',
      [propertyId, filePath, index],
    );
  }
  for (const [index, label] of input.benefits.entries()) {
    await db.runAsync(
      'INSERT INTO property_benefits (property_id, label, sort_order) VALUES (?, ?, ?)',
      [propertyId, label, index],
    );
  }
}

// Saves a new listing with its photos and benefits atomically and returns its id.
export async function createProperty(
  db: SQLiteDatabase,
  ownerId: number,
  input: PropertyInput,
): Promise<number> {
  let createdId = 0;

  await db.withTransactionAsync(async () => {
    const slug = await generateUniqueSlug(db, input.title);
    const result = await db.runAsync(
      `INSERT INTO properties (
         owner_id, title, slug, description, property_type, price, address, city, province,
         land_area, building_area, bedrooms, bathrooms, floors, whatsapp_number, status
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ownerId, input.title, slug, input.description, input.propertyType, input.price,
        input.address, input.city, input.province, input.landArea, input.buildingArea,
        input.bedrooms, input.bathrooms, input.floors, input.whatsappNumber, input.status,
      ],
    );
    createdId = result.lastInsertRowId;
    await replaceRelations(db, createdId, input);
  });

  return createdId;
}

// Updates a listing owned by the seller; throws when it is not theirs.
export async function updateProperty(
  db: SQLiteDatabase,
  ownerId: number,
  id: number,
  input: PropertyInput,
): Promise<void> {
  await db.withTransactionAsync(async () => {
    const result = await db.runAsync(
      `UPDATE properties SET
         title = ?, description = ?, property_type = ?, price = ?, address = ?, city = ?,
         province = ?, land_area = ?, building_area = ?, bedrooms = ?, bathrooms = ?,
         floors = ?, whatsapp_number = ?, status = ?, updated_at = datetime('now')
       WHERE id = ? AND owner_id = ?`,
      [
        input.title, input.description, input.propertyType, input.price, input.address,
        input.city, input.province, input.landArea, input.buildingArea, input.bedrooms,
        input.bathrooms, input.floors, input.whatsappNumber, input.status, id, ownerId,
      ],
    );
    if (result.changes === 0) throw new Error(NOT_OWNED_MESSAGE);
    await replaceRelations(db, id, input);
  });
}

// Switches a listing between draft and published; throws when it is not the seller's.
export async function setPropertyStatus(
  db: SQLiteDatabase,
  ownerId: number,
  id: number,
  status: PropertyStatus,
): Promise<void> {
  const result = await db.runAsync(
    `UPDATE properties SET status = ?, updated_at = datetime('now') WHERE id = ? AND owner_id = ?`,
    [status, id, ownerId],
  );
  if (result.changes === 0) throw new Error(NOT_OWNED_MESSAGE);
}

// Deletes a seller's listing and returns its photo paths so files can be cleaned up.
export async function deleteProperty(
  db: SQLiteDatabase,
  ownerId: number,
  id: number,
): Promise<string[]> {
  const images = await db.getAllAsync<{ file_path: string }>(
    `SELECT i.file_path FROM property_images i
     JOIN properties p ON p.id = i.property_id
     WHERE p.id = ? AND p.owner_id = ?`,
    [id, ownerId],
  );
  const result = await db.runAsync('DELETE FROM properties WHERE id = ? AND owner_id = ?', [
    id,
    ownerId,
  ]);
  if (result.changes === 0) throw new Error(NOT_OWNED_MESSAGE);
  return images.map((image) => image.file_path);
}
