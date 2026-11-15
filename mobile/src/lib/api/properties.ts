import { api, ApiError } from './client';
import { mapProperty, type ServerProperty } from './propertyMapping';
import type { CatalogFilters, Property, PropertyStatus, DashboardSummary } from '@/types/property';

// publishedProperties follows server pagination so local filters operate on the full shared catalog.
async function publishedProperties(): Promise<Property[]> {
  const items: Property[] = [];
  let page = 1;
  while (true) {
    const result = await api<{ properties: ServerProperty[]; total: number }>(`/properties?page=${page}&limit=50`);
    items.push(...result.properties.map(mapProperty));
    if (items.length >= result.total || !result.properties.length) return items;
    page++;
  }
}

// matchesCatalog retains the mobile search and filter behavior for shared backend listings.
function matchesCatalog(p: Property, f: CatalogFilters): boolean {
  const keyword = f.keyword.trim().toLowerCase();
  if (keyword && ![p.title, p.city, p.province, p.address].some((v) => v.toLowerCase().includes(keyword))) return false;
  if (f.type === 'other' && ['house', 'villa'].includes(p.propertyType)) return false;
  if (f.type !== 'all' && f.type !== 'other' && p.propertyType !== f.type) return false;
  if (f.priceRange === 'under_3b' && p.price >= 3e9) return false;
  if (f.priceRange === '3b_to_7b' && (p.price < 3e9 || p.price > 7e9)) return false;
  return f.priceRange !== 'over_7b' || p.price > 7e9;
}

// listPublishedProperties retrieves the same published listings used by the website.
export async function listPublishedProperties(filters: CatalogFilters, limit: number) {
  const items = (await publishedProperties()).filter((p) => matchesCatalog(p, filters));
  items.sort((a, b) => filters.sort === 'price_asc' ? a.price-b.price : filters.sort === 'price_desc' ? b.price-a.price
    : filters.sort === 'area_desc' ? b.buildingArea-a.buildingArea : b.createdAt.localeCompare(a.createdAt));
  return { items: items.slice(0, limit), hasMore: items.length > limit };
}

// getPublishedPropertyBySlug loads only a server-published property.
export async function getPublishedPropertyBySlug(slug: string): Promise<Property | null> {
  try { return mapProperty(await api<ServerProperty>(`/properties/${encodeURIComponent(slug)}`)); }
  catch (error) { if (error instanceof ApiError && error.status === 404) return null; throw error; }
}

// getOwnedProperty delegates ownership enforcement to the backend seller session.
export async function getOwnedProperty(id: number): Promise<Property> {
  return mapProperty(await api<ServerProperty>(`/dashboard/properties/${id}`));
}

// listOwnedProperties loads the authenticated seller's listings and applies optional UI filters.
export async function listOwnedProperties(status: PropertyStatus | 'all', keyword: string): Promise<Property[]> {
  const result = await api<ServerProperty[]>('/dashboard/properties');
  return result.map(mapProperty).filter((p) => (status === 'all' || p.status === status)
    && `${p.title} ${p.city}`.toLowerCase().includes(keyword.toLowerCase()));
}

// getCatalogStats computes visible catalog counts from backend-published properties.
export async function getCatalogStats() {
  const items = await publishedProperties();
  return { total: items.length, cities: new Set(items.map((p) => p.city)).size };
}

// getDashboardSummary reads real seller counts from the same endpoint as the web dashboard.
export async function getDashboardSummary(): Promise<DashboardSummary> {
  const s = await api<{ total_properties: number; published_count: number; draft_count: number; total_leads: number; total_portfolio_value: number }>('/dashboard/summary');
  return { totalProperties: s.total_properties, publishedCount: s.published_count, draftCount: s.draft_count,
    totalLeads: s.total_leads, portfolioValue: s.total_portfolio_value };
}
