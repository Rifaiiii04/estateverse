"use client";

import React, { useState } from "react";
import { RotateCcw, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/Sheet";
import type { PriceRangeFilter } from "@/lib/utils/priceRanges";
import { CatalogSearchInput, TypeChips, WalkInsideToggle, cityOptions, priceOptions, sortOptions } from "./CatalogFilterControls";
import type { CatalogFilters, CatalogStats, SortByOption } from "./usePropertyFilters";

interface PropertyFilterSheetProps {
  filters: CatalogFilters;
  stats: CatalogStats;
  resultCount: number;
  isEn: boolean;
}

// PropertyFilterSheet is the phone toolbar: a search box plus a filter button that opens every filter in a bottom sheet.
export function PropertyFilterSheet({ filters, stats, resultCount, isEn }: PropertyFilterSheetProps) {
  const [open, setOpen] = useState(false);
  const label = isEn ? "Filters" : "Filter";

  return (
    <div className="flex items-center gap-2 md:hidden">
      <CatalogSearchInput filters={filters} isEn={isEn} className="flex-1" />
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          render={<Button variant="outline" size="icon-lg" className="relative size-11 rounded-full" aria-label={label} />}
        >
          <SlidersHorizontal />
          {filters.activeCount > 0 && (
            <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
              {filters.activeCount}
            </span>
          )}
        </SheetTrigger>
        <SheetContent side="bottom" className="max-h-[85dvh] rounded-t-2xl pb-[env(safe-area-inset-bottom)]">
          <SheetHeader className="pb-0">
            <SheetTitle className="text-lg font-bold">{label}</SheetTitle>
          </SheetHeader>
          <FilterFields filters={filters} stats={stats} isEn={isEn} />
          <SheetFooter className="grid grid-cols-2 border-t">
            <Button variant="outline" size="lg" onClick={filters.reset}>
              <RotateCcw />
              <span>{isEn ? "Reset" : "Atur ulang"}</span>
            </Button>
            <Button size="lg" onClick={() => setOpen(false)}>
              {isEn ? `Show ${resultCount} homes` : `Tampilkan ${resultCount} rumah`}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// FilterFields lays out the type, Walk Inside, price, area and sort controls inside the sheet.
function FilterFields({ filters, stats, isEn }: Omit<PropertyFilterSheetProps, "resultCount">) {
  return (
    <div className="flex min-h-0 flex-col gap-5 overflow-y-auto px-4">
      <section className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground">{isEn ? "Property type" : "Tipe properti"}</p>
        <TypeChips filters={filters} stats={stats} isEn={isEn} />
      </section>
      <WalkInsideToggle filters={filters} count={stats.count3D} isEn={isEn} />
      <CustomSelect
        label={isEn ? "Price range" : "Kisaran harga"}
        options={priceOptions(isEn)}
        value={filters.priceRange}
        onChange={(value) => filters.setPriceRange(value as PriceRangeFilter)}
      />
      <CustomSelect
        label="Area"
        options={cityOptions(isEn, stats.cities)}
        value={filters.city}
        onChange={filters.setCity}
        placeholder={isEn ? "Area: All Cities" : "Area: Semua Kota"}
      />
      <CustomSelect
        label={isEn ? "Sort by" : "Urutkan"}
        options={sortOptions(isEn)}
        value={filters.sortBy}
        onChange={(value) => filters.setSortBy(value as SortByOption)}
      />
    </div>
  );
}
