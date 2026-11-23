"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Property } from "@/types/property";
import { hasVirtualTour } from "@/lib/utils/media";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { matchesPriceRange, parsePriceRange, type PriceRangeFilter } from "@/lib/utils/priceRanges";

export type SortByOption = "newest" | "price_asc" | "price_desc" | "area_desc";
export type TypeTab = "all" | "house" | "villa" | "other";

/** The catalog filter values plus their setters, shared by the desktop toolbar and the mobile filter sheet. */
export interface CatalogFilters {
  typeTab: TypeTab;
  setTypeTab: (tab: TypeTab) => void;
  walkInside: boolean;
  setWalkInside: (on: boolean) => void;
  priceRange: PriceRangeFilter;
  setPriceRange: (range: PriceRangeFilter) => void;
  city: string;
  setCity: (city: string) => void;
  keyword: string;
  setKeyword: (keyword: string) => void;
  sortBy: SortByOption;
  setSortBy: (sort: SortByOption) => void;
  /** How many filters besides the search keyword are narrowing the list (shown on the mobile filter button). */
  activeCount: number;
  reset: () => void;
}

export interface CatalogStats {
  totalCount: number;
  totalValue: number;
  count3D: number;
  houseCount: number;
  villaCount: number;
  otherCount: number;
  cities: string[];
}

type FilterValues = Pick<CatalogFilters, "typeTab" | "walkInside" | "priceRange" | "city" | "keyword">;

// catalogStats counts listings per type, tour availability and city for the header and filter badges.
function catalogStats(properties: Property[]): CatalogStats {
  const typeOf = (p: Property) => (p.property_type || "").toLowerCase();
  const houseCount = properties.filter((p) => typeOf(p) === "house").length;
  const villaCount = properties.filter((p) => typeOf(p) === "villa").length;
  return {
    totalCount: properties.length,
    totalValue: properties.reduce((sum, p) => sum + (p.price || 0), 0),
    count3D: properties.filter((p) => hasVirtualTour(p)).length,
    houseCount,
    villaCount,
    otherCount: Math.max(0, properties.length - houseCount - villaCount),
    cities: Array.from(new Set(properties.map((p) => p.city).filter(Boolean))).sort(),
  };
}

// matchesFilters reports whether one listing passes every active catalog filter.
function matchesFilters(item: Property, f: FilterValues): boolean {
  const type = (item.property_type || "").toLowerCase();
  if (f.walkInside && !hasVirtualTour(item)) return false;
  if (f.typeTab === "house" && type !== "house") return false;
  if (f.typeTab === "villa" && type !== "villa") return false;
  if (f.typeTab === "other" && (type === "house" || type === "villa")) return false;
  if (!matchesPriceRange(item.price, f.priceRange)) return false;
  if (f.city && (item.city || "").toLowerCase() !== f.city.toLowerCase()) return false;
  const q = f.keyword.trim().toLowerCase();
  return !q || [item.title, item.city, item.province, item.description].some((v) => (v || "").toLowerCase().includes(q));
}

// sortListings orders listings by the chosen option without mutating the input.
function sortListings(items: Property[], sortBy: SortByOption): Property[] {
  return [...items].sort((a, b) => {
    if (sortBy === "price_asc") return a.price - b.price;
    if (sortBy === "price_desc") return b.price - a.price;
    if (sortBy === "area_desc") return b.building_area - a.building_area;
    return b.id - a.id;
  });
}

// usePropertyFilters keeps the catalog filters (seeded from the URL) and derives the stats and visible listings.
export function usePropertyFilters(properties: Property[]) {
  const searchParams = useSearchParams();
  const initialType = searchParams.get("type")?.toLowerCase();
  const [typeTab, setTypeTab] = useState<TypeTab>(initialType === "house" || initialType === "villa" ? initialType : "all");
  const [walkInside, setWalkInside] = useState(searchParams.get("walkInside") === "1");
  const [priceRange, setPriceRange] = useState<PriceRangeFilter>(parsePriceRange(searchParams.get("priceRange")));
  const [city, setCity] = useState(searchParams.get("city") || "");
  const [keyword, setKeyword] = useState(searchParams.get("q") || "");
  const [sortBy, setSortBy] = useState<SortByOption>("newest");
  const debouncedKeyword = useDebounce(keyword, 300);

  const stats = useMemo(() => catalogStats(properties), [properties]);
  const visible = useMemo(() => {
    const values = { typeTab, walkInside, priceRange, city, keyword: debouncedKeyword };
    return sortListings(properties.filter((p) => matchesFilters(p, values)), sortBy);
  }, [properties, typeTab, walkInside, priceRange, city, debouncedKeyword, sortBy]);

  const activeCount = [typeTab !== "all", walkInside, priceRange !== "all", Boolean(city)].filter(Boolean).length;
  // reset clears every filter and the search keyword; the sort order is kept.
  const reset = () => {
    setTypeTab("all");
    setWalkInside(false);
    setPriceRange("all");
    setCity("");
    setKeyword("");
  };

  const filters: CatalogFilters = {
    typeTab, setTypeTab, walkInside, setWalkInside, priceRange, setPriceRange, city, setCity,
    keyword, setKeyword, sortBy, setSortBy, activeCount, reset,
  };
  return { filters, stats, visible, hasActiveFilters: activeCount > 0 || Boolean(keyword.trim()) };
}
