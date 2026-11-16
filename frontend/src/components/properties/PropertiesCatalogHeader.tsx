"use client";

import React from "react";
import Link from "next/link";
import { Plus, Search, X } from "lucide-react";
import { formatCompactIDR } from "@/lib/utils/formatters";
import { CustomSelect, SelectOption } from "@/components/ui/CustomSelect";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs";

import { PRICE_RANGES, PriceRangeFilter } from "@/lib/utils/priceRanges";

export type { PriceRangeFilter };
export type SortByOption = "newest" | "price_asc" | "price_desc" | "area_desc";

interface PropertiesCatalogHeaderProps {
  isEn: boolean;
  isAuthenticated: boolean;
  totalCount: number;
  totalValue: number;
  count3D: number;
  houseCount: number;
  villaCount: number;
  otherCount: number;
  cities: string[];
  viewMode: "grid" | "table";
  setViewMode: (mode: "grid" | "table") => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  priceRange: PriceRangeFilter;
  setPriceRange: (range: PriceRangeFilter) => void;
  selectedCity: string;
  setSelectedCity: (city: string) => void;
  keyword: string;
  setKeyword: (kw: string) => void;
  sortBy: SortByOption;
  setSortBy: (sort: SortByOption) => void;
}

// PropertiesCatalogHeader renders the top summary strip, view switcher, and custom-styled pill filters.
export function PropertiesCatalogHeader({
  isEn,
  isAuthenticated,
  totalCount,
  totalValue,
  count3D,
  houseCount,
  villaCount,
  otherCount,
  cities,
  viewMode,
  setViewMode,
  activeTab,
  setActiveTab,
  priceRange,
  setPriceRange,
  selectedCity,
  setSelectedCity,
  keyword,
  setKeyword,
  sortBy,
  setSortBy,
}: PropertiesCatalogHeaderProps) {
  const tabs = [
    { id: "all", label: isEn ? "All" : "Semua", count: totalCount },
    { id: "3d", label: isEn ? "Has Walk Inside 360°" : "Ada Walk Inside 360°", count: count3D },
    { id: "house", label: isEn ? "Houses" : "Rumah", count: houseCount },
    { id: "villa", label: "Villa", count: villaCount },
    ...(otherCount > 0
      ? [{ id: "other", label: isEn ? "Commercial & Apt" : "Komersial & Apt", count: otherCount }]
      : []),
  ];

  const priceOptions: SelectOption[] = [
    { value: "all", label: isEn ? "Price: Any" : "Harga: Semua" },
    ...PRICE_RANGES.map((r) => ({ value: r.value, label: r.label, description: r.description })),
  ];

  const cityOptions: SelectOption[] = [
    { value: "", label: isEn ? "Area: All Cities" : "Area: Semua Kota" },
    ...cities.map((city) => ({
      value: city,
      label: `Area: ${city}`,
    })),
  ];

  const sortOptions: SelectOption[] = [
    { value: "newest", label: isEn ? "Newest" : "Terbaru" },
    { value: "price_asc", label: isEn ? "Lowest Price" : "Harga Terendah" },
    { value: "price_desc", label: isEn ? "Highest Price" : "Harga Tertinggi" },
    { value: "area_desc", label: isEn ? "Largest Area" : "Luas Bangunan" },
  ];

  return (
    <div className="space-y-5">
      {/* Row 1: Title + Live Stats on Left | View Switcher + Add Listing on Right */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-950">
            {isEn ? "Listings" : "Daftar Properti"}
          </h1>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs sm:text-[13px] text-neutral-500">
            <span>
              <strong className="font-bold text-neutral-950">{totalCount}</strong>{" "}
              {isEn ? "active" : "aktif"} &middot; {formatCompactIDR(totalValue, isEn)}
            </span>
            <span>
              <strong className="font-bold text-neutral-950">{count3D}</strong>{" "}
              {isEn ? "with a virtual tour" : "punya tur virtual"}
            </span>
            <span>
              <strong className="font-bold text-neutral-950">{cities.length}</strong>{" "}
              {isEn ? "cities" : "kota"}
            </span>
            <span className="text-sage-700 font-semibold">
              {isEn ? "Look inside before visiting" : "Lihat isi rumah sebelum survei"}
            </span>
          </div>
        </div>

        {/* Right Controls: Segmented View Switcher & Add Listing CTA */}
        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as typeof viewMode)}>
            <TabsList>
              <TabsTrigger value="grid" className="px-3 py-2">Grid</TabsTrigger>
              <TabsTrigger value="table" className="px-3 py-2">{isEn ? "Table" : "Tabel"}</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            variant={activeTab === "3d" ? "default" : "outline"}
            aria-pressed={activeTab === "3d"}
            onClick={() => setActiveTab(activeTab === "3d" ? "all" : "3d")}
          >
            Walk Inside 360°
          </Button>

          <Button render={<Link href={isAuthenticated ? "/dashboard/properties/new" : "/login"} />}>
            <Plus />
            <span>{isEn ? "Add listing" : "Pasang iklan"}</span>
          </Button>
        </div>
      </div>

      {/* Row 2: Pill Filters, Price Range, Area Chip, Search, and Sort By */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pt-1">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
            <TabsList className="max-w-full overflow-x-auto no-scrollbar">
              {tabs.map((tab) => (
                <TabsTrigger key={tab.id} value={tab.id} className="px-3 py-2">
                  <span>{tab.label}</span>
                  <Badge variant="secondary">{tab.count}</Badge>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="hidden sm:block h-5 w-px bg-neutral-300/80 mx-1" />

          {/* Styled Price Dropdown Pill */}
          <CustomSelect
            variant="pill"
            options={priceOptions}
            value={priceRange}
            onChange={(val) => setPriceRange(val as PriceRangeFilter)}
          />

          {/* Area / City Chip or Styled Dropdown Pill */}
          {selectedCity ? (
            <Button
              variant="secondary"
              className="rounded-full px-3.5"
              onClick={() => setSelectedCity("")}
              aria-label={`Hapus filter area ${selectedCity}`}
            >
              <span>Area: {selectedCity}</span>
              <X />
            </Button>
          ) : (
            <CustomSelect
              variant="pill"
              options={cityOptions}
              value={selectedCity}
              onChange={setSelectedCity}
            />
          )}

          {/* Wide Search Input Pill */}
          <div className="relative flex-1 min-w-[260px] sm:min-w-[340px] lg:min-w-[420px] max-w-xl">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              aria-label={isEn ? "Search properties" : "Cari properti"}
              placeholder={
                isEn
                  ? "Search properties by title, city, or address..."
                  : "Cari properti berdasarkan nama, kota, atau alamat..."
              }
              className="rounded-full bg-background pl-9"
            />
          </div>
        </div>

        {/* Right: Styled Sort By Selector */}
        <div className="flex items-center gap-1 self-end xl:self-center text-xs text-neutral-500 shrink-0">
          <span>{isEn ? "Sort by:" : "Urutkan:"}</span>
          <CustomSelect
            variant="minimal"
            align="right"
            options={sortOptions}
            value={sortBy}
            onChange={(val) => setSortBy(val as SortByOption)}
          />
        </div>
      </div>
    </div>
  );
}
