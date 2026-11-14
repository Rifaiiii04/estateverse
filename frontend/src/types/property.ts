// Type definitions for property listings and seller dashboard.

export type PropertyStatus = "draft" | "published";

export interface WalkCoordinate {
  x: number;
  y: number;
  z: number;
}

export interface WalkBoundary {
  min_x: number;
  max_x: number;
  min_z: number;
  max_z: number;
}

export interface ModelDimension {
  width: number;
  height: number;
  depth: number;
}

export interface Model3DMetadata {
  status: string;
  roof_nodes?: string[];
  wall_nodes?: string[];
  floor_nodes?: string[];
  walk_spawn?: WalkCoordinate;
  walk_bounds?: WalkBoundary;
  dimensions?: ModelDimension;
}

export interface PropertyImage {
  id: number;
  property_id: number;
  file_path: string;
  alt_text: string;
  sort_order: number;
  created_at: string;
}

export interface Property {
  id: number;
  owner_id?: number;
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
  model_3d_path: string;
  has_tour?: boolean;
  model_metadata?: Model3DMetadata;
  benefits?: string[];
  status: PropertyStatus;
  created_at: string;
  updated_at: string;
  images?: PropertyImage[];
  owner_name?: string;
}

export interface PropertyInput {
  title: string;
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
  model_3d_path: string;
  benefits?: string[];
  status: PropertyStatus;
  images: string[];
}

export interface DashboardSummary {
  total_properties: number;
  draft_count: number;
  published_count: number;
  total_portfolio_value: number;
  average_price: number;
  with_3d_model_count: number;
  total_land_area: number;
  total_building_area: number;
  smart_score: number;
  listings_with_tour: number;
  total_views: number;
  total_tour_views: number;
  total_leads: number;
  leads_viewed_tour: number;
  reports_count: number;
  tour_comparison?: TourComparison;
  type_breakdown?: Record<string, number>;
}

/** Listings, detail views, and leads for one group of a seller's listings. */
export interface GroupStats {
  listings: number;
  views: number;
  leads: number;
}

/** A seller's listings with versus without a ready Walk Inside 360° tour. */
export interface TourComparison {
  with_tour: GroupStats;
  without_tour: GroupStats;
}

/** Platform-wide aggregate counts shown publicly as impact evidence. */
export interface ImpactStats {
  active_sellers: number;
  published_listings: number;
  listings_with_tour: number;
  tour_rooms: number;
  tour_views: number;
  buyer_inquiries: number;
  inquiries_after_tour: number;
}

/** Media views available on a property detail page. */
export type MediaTab = "photos" | "tour" | "3d";
