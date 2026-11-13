"use client";

import React from "react";
import Link from "next/link";
import { Plus, Search, X } from "lucide-react";
import { formatCompactIDR } from "@/lib/utils/formatters";
import { CustomSelect, SelectOption } from "@/components/ui/CustomSelect";

export type PriceRangeFilter = "all" | "under_3b" | "3b_to_7b" | "over_7b";
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
    { id: "3d", label: isEn ? "3D Interactive" : "3D Interaktif", count: count3D },
    { id: "house", label: isEn ? "Houses" : "Rumah", count: houseCount },
    { id: "villa", label: "Villa", count: villaCount },
    ...(otherCount > 0
      ? [{ id: "other", label: isEn ? "Commercial & Apt" : "Komersial & Apt", count: otherCount }]
      : []),
  ];

  const priceOptions: SelectOption[] = [
    { value: "all", label: isEn ? "Price: Any" : "Harga: Semua" },
    { value: "under_3b", label: "< Rp 3 Miliar", description: isEn ? "Under 3B IDR" : "Di bawah 3 Miliar" },
    { value: "3b_to_7b", label: "Rp 3M – Rp 7 Miliar", description: isEn ? "Mid-luxury segment" : "Segmen menengah premium" },
    { value: "over_7b", label: "> Rp 7 Miliar", description: isEn ? "Signature luxury estate" : "Hunian & villa eksklusif" },
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
              {isEn ? "with 3D Home Tour" : "ada Tur Rumah 3D"}
            </span>
            <span>
              <strong className="font-bold text-neutral-950">{cities.length}</strong>{" "}
              {isEn ? "cities" : "kota"}
            </span>
            <span className="text-sage-700 font-semibold">
              {isEn ? "View Inside & Out in 3D" : "Bisa Dilihat Luar & Dalam 3D"}
            </span>
          </div>
        </div>

        {/* Right Controls: Segmented View Switcher & Add Listing CTA */}
        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
          <div className="h-9 bg-neutral-200/75 p-1 rounded-full inline-flex items-center text-xs font-semibold border border-neutral-200/60">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`h-full px-3.5 rounded-full transition-all cursor-pointer inline-flex items-center ${
                viewMode === "grid"
                  ? "bg-white text-neutral-950 font-bold shadow-2xs"
                  : "text-neutral-600 hover:text-neutral-950"
              }`}
            >
              Grid
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`h-full px-3.5 rounded-full transition-all cursor-pointer inline-flex items-center ${
                viewMode === "table"
                  ? "bg-white text-neutral-950 font-bold shadow-2xs"
                  : "text-neutral-600 hover:text-neutral-950"
              }`}
            >
              {isEn ? "Table" : "Tabel"}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === "3d" ? "all" : "3d")}
              className={`h-full px-3.5 rounded-full transition-all cursor-pointer inline-flex items-center ${
                activeTab === "3d"
                  ? "bg-sage-600 text-white font-bold shadow-2xs"
                  : "text-neutral-600 hover:text-neutral-950"
              }`}
            >
              3D Tour
            </button>
          </div>

          <Link
            href={isAuthenticated ? "/dashboard/properties/new" : "/login"}
            className="h-9 inline-flex items-center gap-1.5 bg-neutral-950 hover:bg-sage-700 text-white text-xs font-bold px-4 rounded-full transition-colors shadow-2xs border border-transparent"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isEn ? "Add listing" : "Pasang iklan"}</span>
          </Link>
        </div>
      </div>

      {/* Row 2: Pill Filters, Price Range, Area Chip, Search, and Sort By */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pt-1">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`h-9 px-3.5 rounded-full text-xs sm:text-[13px] font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 border ${
                  isActive
                    ? "bg-neutral-950 text-white border-neutral-950 shadow-2xs"
                    : "bg-white border-neutral-200 text-neutral-700 hover:border-sage-400"
                }`}
              >
                <span>{tab.label}</span>
                <span className={isActive ? "text-neutral-300" : "text-neutral-400"}>{tab.count}</span>
              </button>
            );
          })}

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
            <button
              type="button"
              onClick={() => setSelectedCity("")}
              className="h-9 inline-flex items-center gap-1.5 bg-sage-100/90 text-sage-800 border border-sage-200 rounded-full px-3.5 text-xs sm:text-[13px] font-bold hover:bg-sage-200/70 transition-colors cursor-pointer"
            >
              <span>Area: {selectedCity}</span>
              <X className="w-3.5 h-3.5 text-sage-700" />
            </button>
          ) : (
            <CustomSelect
              variant="pill"
              options={cityOptions}
              value={selectedCity}
              onChange={setSelectedCity}
            />
          )}

          {/* Wide Search Input Pill */}
          <div className="relative flex-1 min-w-[260px] sm:min-w-[340px] lg:min-w-[420px] max-w-xl h-9">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder={
                isEn
                  ? "Search properties by title, city, or address..."
                  : "Cari properti berdasarkan nama, kota, atau alamat..."
              }
              className="w-full h-full bg-white border border-neutral-200 hover:border-sage-400 rounded-full pl-9 pr-4 text-xs sm:text-[13px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-sage-600 focus:ring-2 focus:ring-sage-600/15 transition-all"
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
