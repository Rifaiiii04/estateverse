import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  CatalogFilters,
  DashboardSummary,
  Property,
  PropertyImage,
  PropertyStatus,
  PropertyType,
  SortOption,
} from '@/types/property';

interface PropertyRow {
  id: number;
  owner_id: number;
  owner_name: string;
  title: string;
  slug: string;
  description: string;
  property_type: string;
  price: number;
  address: string;
  city: string;
  province: string;
  land_area: number;
  building_area: number;
  bedrooms: number;
  bathrooms: number;
  floors: number;
  whatsapp_number: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface ImageRow {
  id: number;
  property_id: number;
  file_path: string;
  sort_order: number;
}

interface BenefitRow {
  property_id: number;
  label: string;
}

const BASE_SELECT = `
  SELECT p.*, u.name AS owner_name
  FROM properties p
  JOIN users u ON u.id = p.owner_id
`;

// Whitelisted ORDER BY clauses so sorting never uses raw user input.
const SORT_CLAUSES: Record<SortOption, string> = {
  newest: 'p.created_at DESC, p.id DESC',
  price_asc: 'p.price ASC',
  price_desc: 'p.price DESC',
  area_desc: 'p.building_area DESC',
};

// Escapes LIKE wildcards so a keyword is matched literally.
function escapeLike(keyword: string): string {
  return keyword.replace(/[\\%_]/g, (char) => `\\${char}`);
}

// Loads photos and benefits for the given rows and maps them to Property models.
async function attachRelations(db: SQLiteDatabase, rows: PropertyRow[]): Promise<Property[]> {
  if (rows.length === 0) return [];

  const ids = rows.map((row) => row.id);
  const placeholders = ids.map(() => '?').join(',');
  const images = await db.getAllAsync<ImageRow>(
    `SELECT id, property_id, file_path, sort_order FROM property_images
     WHERE property_id IN (${placeholders}) ORDER BY sort_order, id`,
    ids,
  );
  const benefits = await db.getAllAsync<BenefitRow>(
    `SELECT property_id, label FROM property_benefits
     WHERE property_id IN (${placeholders}) ORDER BY sort_order, id`,
    ids,
  );

  return rows.map((row) => toProperty(row, images, benefits));
}

// Maps a database row and its related rows to the Property model.
function toProperty(row: PropertyRow, images: ImageRow[], benefits: BenefitRow[]): Property {
  return {
    id: row.id,
    ownerId: row.owner_id,
    ownerName: row.owner_name,
    title: row.title,
    slug: row.slug,
    description: row.description,
    propertyType: row.property_type as PropertyType,
    price: row.price,
    address: row.address,
    city: row.city,
    province: row.province,
    landArea: row.land_area,
    buildingArea: row.building_area,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    floors: row.floors,
    whatsappNumber: row.whatsapp_number,
    status: row.status as PropertyStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    images: images
      .filter((image) => image.property_id === row.id)
      .map<PropertyImage>((image) => ({
        id: image.id,
        filePath: image.file_path,
        sortOrder: image.sort_order,
      })),
    benefits: benefits.filter((b) => b.property_id === row.id).map((b) => b.label),
  };
}

// Builds the WHERE conditions and parameters for the public catalog filters.
function buildCatalogWhere(filters: CatalogFilters): { clauses: string[]; params: string[] } {
  const clauses = [`p.status = 'published'`];
  const params: string[] = [];
  const keyword = filters.keyword.trim();

  if (keyword) {
    const like = `%${escapeLike(keyword)}%`;
    clauses.push(
      `(p.title LIKE ? ESCAPE '\\' OR p.city LIKE ? ESCAPE '\\' OR p.province LIKE ? ESCAPE '\\' OR p.address LIKE ? ESCAPE '\\')`,
    );
    params.push(like, like, like, like);
  }
  if (filters.type === 'house' || filters.type === 'villa') {
    clauses.push('p.property_type = ?');
    params.push(filters.type);
  }
  if (filters.type === 'other') {
    clauses.push(`p.property_type NOT IN ('house', 'villa')`);
  }
  if (filters.priceRange === 'under_3b') clauses.push('p.price < 3000000000');
  if (filters.priceRange === '3b_to_7b') {
    clauses.push('p.price BETWEEN 3000000000 AND 7000000000');
  }
  if (filters.priceRange === 'over_7b') clauses.push('p.price > 7000000000');

  return { clauses, params };
}

// Returns published listings matching the filters, plus whether more results exist.
export async function listPublishedProperties(
  db: SQLiteDatabase,
  filters: CatalogFilters,
  limit: number,
): Promise<{ items: Property[]; hasMore: boolean }> {
  const { clauses, params } = buildCatalogWhere(filters);
  const rows = await db.getAllAsync<PropertyRow>(
    `${BASE_SELECT} WHERE ${clauses.join(' AND ')} ORDER BY ${SORT_CLAUSES[filters.sort]} LIMIT ?`,
    [...params, limit + 1],
  );
  const items = await attachRelations(db, rows.slice(0, limit));
  return { items, hasMore: rows.length > limit };
}

// Returns a published listing by slug, or null when it does not exist.
export async function getPublishedPropertyBySlug(
  db: SQLiteDatabase,
  slug: string,
): Promise<Property | null> {
  const row = await db.getFirstAsync<PropertyRow>(
    `${BASE_SELECT} WHERE p.slug = ? AND p.status = 'published'`,
    [slug],
  );
  if (!row) return null;
  const [property] = await attachRelations(db, [row]);
  return property;
}

// Returns a listing only when it belongs to the given seller.
export async function getOwnedProperty(
  db: SQLiteDatabase,
  ownerId: number,
  id: number,
): Promise<Property | null> {
  const row = await db.getFirstAsync<PropertyRow>(
    `${BASE_SELECT} WHERE p.id = ? AND p.owner_id = ?`,
    [id, ownerId],
  );
  if (!row) return null;
  const [property] = await attachRelations(db, [row]);
  return property;
}

// Returns the seller's listings, optionally filtered by status and keyword.
export async function listOwnedProperties(
  db: SQLiteDatabase,
  ownerId: number,
  status: PropertyStatus | 'all',
  keyword: string,
): Promise<Property[]> {
  const clauses = ['p.owner_id = ?'];
  const params: (string | number)[] = [ownerId];
  if (status !== 'all') {
    clauses.push('p.status = ?');
    params.push(status);
  }
  if (keyword.trim()) {
    const like = `%${escapeLike(keyword.trim())}%`;
    clauses.push(`(p.title LIKE ? ESCAPE '\\' OR p.city LIKE ? ESCAPE '\\')`);
    params.push(like, like);
  }
  const rows = await db.getAllAsync<PropertyRow>(
    `${BASE_SELECT} WHERE ${clauses.join(' AND ')} ORDER BY p.updated_at DESC, p.id DESC`,
    params,
  );
  return attachRelations(db, rows);
}

// Returns counts shown on the public home page and catalog header.
export async function getCatalogStats(
  db: SQLiteDatabase,
): Promise<{ total: number; cities: number }> {
  const row = await db.getFirstAsync<{ total: number; cities: number }>(
    `SELECT COUNT(*) AS total, COUNT(DISTINCT city) AS cities
     FROM properties WHERE status = 'published'`,
  );
  return { total: row?.total ?? 0, cities: row?.cities ?? 0 };
}

// Returns the seller's dashboard numbers computed from their own listings and leads.
export async function getDashboardSummary(
  db: SQLiteDatabase,
  ownerId: number,
): Promise<DashboardSummary> {
  const properties = await db.getFirstAsync<{
    total: number;
    published: number;
    draft: number;
    value: number;
  }>(
    `SELECT COUNT(*) AS total,
            COALESCE(SUM(status = 'published'), 0) AS published,
            COALESCE(SUM(status = 'draft'), 0) AS draft,
            COALESCE(SUM(price), 0) AS value
     FROM properties WHERE owner_id = ?`,
    [ownerId],
  );
  const leads = await db.getFirstAsync<{ total: number }>(
    `SELECT COUNT(*) AS total FROM leads
     WHERE property_id IN (SELECT id FROM properties WHERE owner_id = ?)`,
    [ownerId],
  );
  return {
    totalProperties: properties?.total ?? 0,
    publishedCount: properties?.published ?? 0,
    draftCount: properties?.draft ?? 0,
    totalLeads: leads?.total ?? 0,
    portfolioValue: properties?.value ?? 0,
  };
}
