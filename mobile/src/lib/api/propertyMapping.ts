import { mediaUrl } from './client';
import type { Property, PropertyInput, PropertyType, PropertyStatus } from '@/types/property';

export interface ServerProperty {
  id: number; owner_name?: string; title: string; slug: string; description: string; model_3d_path?: string;
  property_type: string; price: number; address: string; city: string; province: string;
  land_area: number; building_area: number; bedrooms: number; bathrooms: number; floors: number;
  whatsapp_number: string; status: string; created_at: string; updated_at: string;
  benefits?: string[]; images?: { id: number; file_path: string; sort_order: number }[];
}

// mapProperty adapts backend fields while retaining server ids and public media URLs.
export function mapProperty(p: ServerProperty): Property {
  return { id: p.id, ownerId: 0, ownerName: p.owner_name || '', model3dPath: p.model_3d_path, title: p.title, slug: p.slug,
    description: p.description, propertyType: p.property_type as PropertyType, price: p.price,
    address: p.address, city: p.city, province: p.province, landArea: p.land_area, buildingArea: p.building_area,
    bedrooms: p.bedrooms, bathrooms: p.bathrooms, floors: p.floors, whatsappNumber: p.whatsapp_number,
    status: p.status as PropertyStatus, createdAt: p.created_at, updatedAt: p.updated_at, benefits: p.benefits || [],
    images: (p.images || []).map((i) => ({ id: i.id, filePath: mediaUrl(i.file_path), sortOrder: i.sort_order })) };
}

// propertyPayload translates a listing form into the backend contract without any client-selected owner id.
export function propertyPayload(p: PropertyInput, paths: string[]) {
  return { title: p.title, description: p.description, property_type: p.propertyType, price: p.price,
    address: p.address, city: p.city, province: p.province, land_area: p.landArea, building_area: p.buildingArea,
    bedrooms: p.bedrooms, bathrooms: p.bathrooms, floors: p.floors, whatsapp_number: p.whatsappNumber,
    status: p.status, benefits: p.benefits, images: paths, model_3d_path: p.model3dPath || '' };
}
