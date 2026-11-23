"use client";

import React from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { PRICE_RANGES } from "@/lib/utils/priceRanges";
import type { SelectOption } from "@/components/ui/CustomSelect";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import type { CatalogFilters, CatalogStats, TypeTab } from "./usePropertyFilters";

// priceOptions lists the price ranges offered by the catalog filters.
export function priceOptions(isEn: boolean): SelectOption[] {
  return [
    { value: "all", label: isEn ? "Price: Any" : "Harga: Semua" },
    ...PRICE_RANGES.map((r) => ({ value: r.value, label: r.label, description: r.description })),
  ];
}

// cityOptions lists every city that currently has a listing.
export function cityOptions(isEn: boolean, cities: string[]): SelectOption[] {
  return [
    { value: "", label: isEn ? "Area: All Cities" : "Area: Semua Kota" },
    ...cities.map((city) => ({ value: city, label: `Area: ${city}` })),
  ];
}

// sortOptions lists the available catalog sort orders.
export function sortOptions(isEn: boolean): SelectOption[] {
  return [
    { value: "newest", label: isEn ? "Newest" : "Terbaru" },
    { value: "price_asc", label: isEn ? "Lowest Price" : "Harga Terendah" },
    { value: "price_desc", label: isEn ? "Highest Price" : "Harga Tertinggi" },
    { value: "area_desc", label: isEn ? "Largest Area" : "Luas Bangunan" },
  ];
}

// typeChoices lists the property type filters with how many listings each one holds.
function typeChoices(stats: CatalogStats, isEn: boolean): { id: TypeTab; label: string; count: number }[] {
  return [
    { id: "all", label: isEn ? "All" : "Semua", count: stats.totalCount },
    { id: "house", label: isEn ? "Houses" : "Rumah", count: stats.houseCount },
    { id: "villa", label: "Villa", count: stats.villaCount },
    ...(stats.otherCount > 0
      ? [{ id: "other" as const, label: isEn ? "Commercial & Apt" : "Komersial & Apt", count: stats.otherCount }]
      : []),
  ];
}

// TypeChips is the wrapping, thumb-sized type picker used inside the phone filter sheet.
export function TypeChips({ filters, stats, isEn }: { filters: CatalogFilters; stats: CatalogStats; isEn: boolean }) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={isEn ? "Property type" : "Tipe properti"}>
      {typeChoices(stats, isEn).map((choice) => (
        <Button
          key={choice.id}
          variant={filters.typeTab === choice.id ? "secondary" : "outline"}
          aria-pressed={filters.typeTab === choice.id}
          className={cn("h-10 rounded-full px-3.5", filters.typeTab === choice.id && "border-primary/40 text-primary")}
          onClick={() => filters.setTypeTab(choice.id)}
        >
          <span>{choice.label}</span>
          <Badge variant="secondary">{choice.count}</Badge>
        </Button>
      ))}
    </div>
  );
}

// TypeTabs switches the property type filter on wider screens and shows how many listings each type has.
export function TypeTabs({ filters, stats, isEn }: { filters: CatalogFilters; stats: CatalogStats; isEn: boolean }) {
  const tabs = typeChoices(stats, isEn);
  return (
    <Tabs value={filters.typeTab} onValueChange={(value) => filters.setTypeTab(value as TypeTab)}>
      <TabsList className="max-w-full overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.id} value={tab.id} className="px-3 py-2">
            <span>{tab.label}</span>
            <Badge variant="secondary">{tab.count}</Badge>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

// WalkInsideToggle is the checkbox that keeps only listings with a Walk Inside 360° tour.
export function WalkInsideToggle({ filters, count }: { filters: CatalogFilters; count: number }) {
  return (
    <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm font-medium text-neutral-800">
      <Checkbox checked={filters.walkInside} onCheckedChange={filters.setWalkInside} />
      <span>Walk Inside 360°</span>
      <Badge variant="secondary">{count}</Badge>
    </label>
  );
}

// CatalogSearchInput is the rounded keyword search used on every screen size.
export function CatalogSearchInput({ filters, isEn, className }: {
  filters: CatalogFilters;
  isEn: boolean;
  className?: string;
}) {
  return (
    <div className={cn("relative min-w-0", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={filters.keyword}
        onChange={(e) => filters.setKeyword(e.target.value)}
        aria-label={isEn ? "Search properties" : "Cari properti"}
        placeholder={isEn ? "Search by title, city, or address..." : "Cari nama, kota, atau alamat..."}
        className="rounded-full bg-background pl-9"
      />
    </div>
  );
}
