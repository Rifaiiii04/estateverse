"use client";

import React from "react";
import Link from "next/link";
import { Plus, X } from "lucide-react";
import { formatCompactIDR } from "@/lib/utils/formatters";
import type { PriceRangeFilter } from "@/lib/utils/priceRanges";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { Button } from "@/components/ui/Button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { CatalogSearchInput, TypeTabs, WalkInsideToggle, cityOptions, priceOptions, sortOptions } from "./CatalogFilterControls";
import { PropertyFilterSheet } from "./PropertyFilterSheet";
import type { CatalogFilters, CatalogStats, SortByOption } from "./usePropertyFilters";

interface PropertiesCatalogHeaderProps {
  isEn: boolean;
  isAuthenticated: boolean;
  stats: CatalogStats;
  filters: CatalogFilters;
  resultCount: number;
  viewMode: "grid" | "table";
  setViewMode: (mode: "grid" | "table") => void;
}

// PropertiesCatalogHeader renders the title, live stats, view switcher and the filters (toolbar on desktop, sheet on phones).
export function PropertiesCatalogHeader(props: PropertiesCatalogHeaderProps) {
  const { isEn, isAuthenticated, stats, filters, resultCount, viewMode, setViewMode } = props;
  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-950">
              {isEn ? "Listings" : "Daftar Properti"}
            </h1>
            <CatalogStatsLine stats={stats} isEn={isEn} />
          </div>
          <AddListingButton isEn={isEn} isAuthenticated={isAuthenticated} className="md:hidden" />
        </div>

        <div className="hidden items-center gap-2.5 md:flex">
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as typeof viewMode)}>
            <TabsList>
              <TabsTrigger value="grid" className="px-3 py-2">Grid</TabsTrigger>
              <TabsTrigger value="table" className="px-3 py-2">{isEn ? "Table" : "Tabel"}</TabsTrigger>
            </TabsList>
          </Tabs>
          <AddListingButton isEn={isEn} isAuthenticated={isAuthenticated} />
        </div>
      </div>

      <DesktopToolbar filters={filters} stats={stats} isEn={isEn} />
      <PropertyFilterSheet filters={filters} stats={stats} resultCount={resultCount} isEn={isEn} />
    </div>
  );
}

// CatalogStatsLine summarises how many listings, tours and cities the catalog holds.
function CatalogStatsLine({ stats, isEn }: { stats: CatalogStats; isEn: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-[13px] text-neutral-500">
      <span>
        <strong className="font-bold text-neutral-950">{stats.totalCount}</strong> {isEn ? "active" : "aktif"} &middot;{" "}
        {formatCompactIDR(stats.totalValue, isEn)}
      </span>
      <span>
        <strong className="font-bold text-neutral-950">{stats.count3D}</strong>{" "}
        {isEn ? "with a 360° tour" : "punya tur 360°"}
      </span>
      <span>
        <strong className="font-bold text-neutral-950">{stats.cities.length}</strong> {isEn ? "cities" : "kota"}
      </span>
      <span className="hidden text-sage-700 font-semibold sm:inline">
        {isEn ? "Look inside before visiting" : "Lihat isi rumah sebelum survei"}
      </span>
    </div>
  );
}

// AddListingButton sends sellers to the new-listing form, or to login first.
function AddListingButton({ isEn, isAuthenticated, className }: { isEn: boolean; isAuthenticated: boolean; className?: string }) {
  return (
    <Button className={className} render={<Link href={isAuthenticated ? "/dashboard/properties/new" : "/login"} />}>
      <Plus />
      <span>{isEn ? "Add listing" : "Pasang iklan"}</span>
    </Button>
  );
}

// DesktopToolbar shows every filter inline on tablets and larger screens.
function DesktopToolbar({ filters, stats, isEn }: { filters: CatalogFilters; stats: CatalogStats; isEn: boolean }) {
  return (
    <div className="hidden flex-col gap-3 pt-1 md:flex xl:flex-row xl:items-center xl:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-2">
        <TypeTabs filters={filters} stats={stats} isEn={isEn} />
        <WalkInsideToggle filters={filters} count={stats.count3D} />
        <div className="hidden h-5 w-px bg-neutral-300/80 xl:block" />
        <CustomSelect
          variant="pill"
          options={priceOptions(isEn)}
          value={filters.priceRange}
          onChange={(value) => filters.setPriceRange(value as PriceRangeFilter)}
        />
        {filters.city ? (
          <Button
            variant="secondary"
            className="rounded-full px-3.5"
            onClick={() => filters.setCity("")}
            aria-label={`Hapus filter area ${filters.city}`}
          >
            <span>Area: {filters.city}</span>
            <X />
          </Button>
        ) : (
          <CustomSelect
            variant="pill"
            options={cityOptions(isEn, stats.cities)}
            value={filters.city}
            onChange={filters.setCity}
            placeholder={isEn ? "Area: All Cities" : "Area: Semua Kota"}
          />
        )}
        <CatalogSearchInput filters={filters} isEn={isEn} className="flex-1 md:min-w-[260px] lg:min-w-[340px] max-w-xl" />
      </div>

      <div className="flex shrink-0 items-center gap-1 self-end text-xs text-neutral-500 xl:self-center">
        <span>{isEn ? "Sort by:" : "Urutkan:"}</span>
        <CustomSelect
          variant="minimal"
          align="right"
          options={sortOptions(isEn)}
          value={filters.sortBy}
          onChange={(value) => filters.setSortBy(value as SortByOption)}
        />
      </div>
    </div>
  );
}
