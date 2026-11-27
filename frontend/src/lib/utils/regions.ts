import REGION_DATA from "./regions-id.json";

// Interface representing an administrative province.
export interface Province {
  id: string;
  name: string;
}

/** Province bounding box [south, north, west, east] in degrees. */
export type ProvinceBounds = readonly [number, number, number, number];

interface RegionEntry extends Province {
  bbox: number[];
  cities: string[];
}

// regions-id.json bundles all 34 provinces and 514 regencies/cities (names as in the emsifa wilayah API) with
// OpenStreetMap province bounding boxes, so the form works offline and matches the server-side location check.
const REGIONS = REGION_DATA as RegionEntry[];

// Pins up to about 20 km outside the box are accepted, mirroring the backend margin for border houses.
const PIN_BOUNDS_MARGIN = 0.2;

// findRegion looks up a province by name, ignoring case and extra spaces.
function findRegion(provinceName: string): RegionEntry | undefined {
  const key = provinceName.trim().replace(/\s+/g, " ").toUpperCase();
  return REGIONS.find((r) => r.name === key);
}

// Returns every Indonesian province.
export async function getProvinces(): Promise<Province[]> {
  return REGIONS.map(({ id, name }) => ({ id, name }));
}

// Returns the regencies and cities of a province (by id, or by name when the id is unknown).
export async function getCities(provinceId: string, provinceName?: string): Promise<string[]> {
  const byId = REGIONS.find((r) => r.id === provinceId);
  return (byId ?? findRegion(provinceName ?? ""))?.cities ?? [];
}

// provinceBounds returns the bounding box of a province, or null for names outside the bundled list.
export function provinceBounds(provinceName: string): ProvinceBounds | null {
  const bbox = findRegion(provinceName)?.bbox;
  return bbox && bbox.length === 4 ? [bbox[0], bbox[1], bbox[2], bbox[3]] : null;
}

// isPinInProvince reports whether a map pin lies inside (or just outside) the chosen province; unknown names pass.
export function isPinInProvince(provinceName: string, lat: number, lng: number): boolean {
  const box = provinceBounds(provinceName);
  if (!box) return true;
  const [south, north, west, east] = box;
  const m = PIN_BOUNDS_MARGIN;
  return lat >= south - m && lat <= north + m && lng >= west - m && lng <= east + m;
}
