import type { SQLiteDatabase } from 'expo-sqlite';

import type { Lead, LeadInput, LeadStatus } from '@/types/property';

interface LeadRow {
  id: number;
  property_id: number;
  property_title: string;
  name: string;
  phone: string;
  note: string;
  status: string;
  created_at: string;
}

// Saves a buyer inquiry for a published listing.
export async function createLead(db: SQLiteDatabase, input: LeadInput): Promise<void> {
  const property = await db.getFirstAsync(
    `SELECT 1 FROM properties WHERE id = ? AND status = 'published'`,
    [input.propertyId],
  );
  if (!property) throw new Error('Properti tidak tersedia untuk dihubungi.');

  await db.runAsync('INSERT INTO leads (property_id, name, phone, note) VALUES (?, ?, ?, ?)', [
    input.propertyId,
    input.name,
    input.phone,
    input.note,
  ]);
}

// Returns inquiries for the seller's own listings, filtered by status and keyword.
export async function listOwnedLeads(
  db: SQLiteDatabase,
  ownerId: number,
  status: LeadStatus | 'all',
  keyword: string,
): Promise<Lead[]> {
  const clauses = ['p.owner_id = ?'];
  const params: (string | number)[] = [ownerId];

  if (status !== 'all') {
    clauses.push('l.status = ?');
    params.push(status);
  }
  const trimmed = keyword.trim();
  if (trimmed) {
    const like = `%${trimmed.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
    clauses.push(`(l.name LIKE ? ESCAPE '\\' OR p.title LIKE ? ESCAPE '\\')`);
    params.push(like, like);
  }

  const rows = await db.getAllAsync<LeadRow>(
    `SELECT l.id, l.property_id, p.title AS property_title, l.name, l.phone, l.note,
            l.status, l.created_at
     FROM leads l JOIN properties p ON p.id = l.property_id
     WHERE ${clauses.join(' AND ')}
     ORDER BY l.created_at DESC, l.id DESC`,
    params,
  );

  return rows.map((row) => ({
    id: row.id,
    propertyId: row.property_id,
    propertyTitle: row.property_title,
    name: row.name,
    phone: row.phone,
    note: row.note,
    status: row.status as LeadStatus,
    createdAt: row.created_at,
  }));
}

// Updates the follow-up stage of an inquiry that belongs to the seller's listings.
export async function updateLeadStatus(
  db: SQLiteDatabase,
  ownerId: number,
  leadId: number,
  status: LeadStatus,
): Promise<void> {
  const result = await db.runAsync(
    `UPDATE leads SET status = ?
     WHERE id = ? AND property_id IN (SELECT id FROM properties WHERE owner_id = ?)`,
    [status, leadId, ownerId],
  );
  if (result.changes === 0) throw new Error('Data peminat tidak ditemukan.');
}
