// Type definitions for property listings, leads, and the seller dashboard.

export type PropertyStatus = 'draft' | 'published';

export type PropertyType = 'house' | 'villa' | 'apartment' | 'commercial' | 'land';

export type LeadStatus = 'new' | 'contacted' | 'scheduled' | 'closed';

export interface PropertyImage {
  id: number;
  filePath: string;
  sortOrder: number;
}

export interface TourHotspot {
  id: number;
  fromRoomId: number;
  targetRoomId: number;
  label: string;
  yawAngle: number;
}

export interface TourRoom {
  id: number;
  propertyId: number;
  name: string;
  panoramaUrl: string;
  roomSpecs: string;
  sortOrder: number;
  hotspots?: TourHotspot[];
}

export interface Property {
  id: number;
  ownerId: number;
  ownerName: string;
  title: string;
  slug: string;
  description: string;
  propertyType: PropertyType;
  price: number;
  address: string;
  city: string;
  province: string;
  landArea: number;
  buildingArea: number;
  bedrooms: number;
  bathrooms: number;
  floors: number;
  whatsappNumber: string;
  status: PropertyStatus;
  createdAt: string;
  updatedAt: string;
  images: PropertyImage[];
  benefits: string[];
  tourRooms?: TourRoom[];
}

export interface PropertyInput {
  title: string;
  description: string;
  propertyType: PropertyType;
  price: number;
  address: string;
  city: string;
  province: string;
  landArea: number;
  buildingArea: number;
  bedrooms: number;
  bathrooms: number;
  floors: number;
  whatsappNumber: string;
  status: PropertyStatus;
  imagePaths: string[];
  benefits: string[];
}

export interface Lead {
  id: number;
  propertyId: number;
  propertyTitle: string;
  name: string;
  phone: string;
  note: string;
  status: LeadStatus;
  createdAt: string;
}

export interface LeadInput {
  propertyId: number;
  name: string;
  phone: string;
  note: string;
}

export interface DashboardSummary {
  totalProperties: number;
  publishedCount: number;
  draftCount: number;
  totalLeads: number;
  portfolioValue: number;
}

export type PriceRange = 'all' | 'under_3b' | '3b_to_7b' | 'over_7b';

export type SortOption = 'newest' | 'price_asc' | 'price_desc' | 'area_desc';

export type TypeFilter = 'all' | 'house' | 'villa' | 'other';

export interface CatalogFilters {
  keyword: string;
  type: TypeFilter;
  priceRange: PriceRange;
  sort: SortOption;
}
