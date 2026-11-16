"use client";

import { hasVirtualTour } from "@/lib/utils/media";
import React, { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SlidersHorizontal, RotateCcw } from "lucide-react";
import { Property } from "@/types/property";
import { getPublicProperties } from "@/lib/api/properties";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PropertyGridView } from "@/components/properties/PropertyGridView";
import { PropertyTableView } from "@/components/properties/PropertyTableView";
import {
  PropertiesCatalogHeader,
  PriceRangeFilter,
  SortByOption,
} from "@/components/properties/PropertiesCatalogHeader";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/Button";
import { FadeIn, smoothEase } from "@/components/ui/MotionPrimitives";
import { AnimatePresence, motion } from "framer-motion";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { matchesPriceRange, parsePriceRange } from "@/lib/utils/priceRanges";

// PropertiesContent orchestrates data fetching, filtering, sorting, and full-width responsive display.
function PropertiesContent() {
  const searchParams = useSearchParams();
  const { lang } = useLanguage();
  const { isAuthenticated } = useAuth();
  const isEn = lang === "en";

  const initialType = searchParams.get("type")?.toLowerCase() || "all";
  const [dbProps, setDbProps] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [activeTab, setActiveTab] = useState<string>(
    initialType === "house" || initialType === "villa" ? initialType : "all"
  );
  const [priceRange, setPriceRange] = useState<PriceRangeFilter>(parsePriceRange(searchParams.get("priceRange")));
  const [selectedCity, setSelectedCity] = useState<string>(searchParams.get("city") || "");
  const [keyword, setKeyword] = useState<string>(searchParams.get("q") || "");
  const debouncedKeyword = useDebounce(keyword, 300);
  const [sortBy, setSortBy] = useState<SortByOption>("newest");

  useEffect(() => {
    let mounted = true;
    getPublicProperties(1, 50)
      .then((res) => {
        if (mounted) setDbProps(res.properties || []);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    const totalCount = dbProps.length;
    const totalValue = dbProps.reduce((sum, p) => sum + (p.price || 0), 0);
    const count3D = dbProps.filter((p) => hasVirtualTour(p)).length;
    const houseCount = dbProps.filter((p) => (p.property_type || "").toLowerCase() === "house").length;
    const villaCount = dbProps.filter((p) => (p.property_type || "").toLowerCase() === "villa").length;
    const otherCount = Math.max(0, totalCount - houseCount - villaCount);
    const cities = Array.from(new Set(dbProps.map((p) => p.city).filter(Boolean))).sort();
    return { totalCount, totalValue, count3D, houseCount, villaCount, otherCount, cities };
  }, [dbProps]);

  const filteredProperties = useMemo(() => {
    const filtered = dbProps.filter((item) => {
      const pType = (item.property_type || "").toLowerCase();
      if (activeTab === "3d" && !hasVirtualTour(item)) return false;
      if (activeTab === "house" && pType !== "house") return false;
      if (activeTab === "villa" && pType !== "villa") return false;
      if (activeTab === "other" && (pType === "house" || pType === "villa")) return false;

      if (!matchesPriceRange(item.price, priceRange)) return false;

      if (selectedCity && item.city.toLowerCase() !== selectedCity.toLowerCase()) return false;

      if (debouncedKeyword.trim()) {
        const q = debouncedKeyword.toLowerCase();
        const match =
          item.title.toLowerCase().includes(q) ||
          item.city.toLowerCase().includes(q) ||
          item.province.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "price_asc") return a.price - b.price;
      if (sortBy === "price_desc") return b.price - a.price;
      if (sortBy === "area_desc") return b.building_area - a.building_area;
      return b.id - a.id;
    });
  }, [dbProps, activeTab, priceRange, selectedCity, debouncedKeyword, sortBy]);

  const hasActiveFilters =
    activeTab !== "all" || priceRange !== "all" || Boolean(selectedCity) || Boolean(keyword.trim());

  return (
    <div className="w-full max-w-[1840px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-7 sm:py-9 space-y-6">
      {/* Header & Pill Filter Toolbar */}
      <FadeIn y={12}>
        <PropertiesCatalogHeader
          isEn={isEn}
          isAuthenticated={isAuthenticated}
          totalCount={stats.totalCount}
          totalValue={stats.totalValue}
          count3D={stats.count3D}
          houseCount={stats.houseCount}
          villaCount={stats.villaCount}
          otherCount={stats.otherCount}
          cities={stats.cities}
          viewMode={viewMode}
          setViewMode={setViewMode}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          priceRange={priceRange}
          setPriceRange={setPriceRange}
          selectedCity={selectedCity}
          setSelectedCity={setSelectedCity}
          keyword={keyword}
          setKeyword={setKeyword}
          sortBy={sortBy}
          setSortBy={setSortBy}
        />
      </FadeIn>

      {/* Active Filter Reset Bar (only shown when filtered) */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between text-xs text-neutral-500 pt-1">
          <span>
            {isEn
              ? `Showing ${filteredProperties.length} of ${stats.totalCount} listings`
              : `Menampilkan ${filteredProperties.length} dari ${stats.totalCount} properti`}
          </span>
          <Button
            variant="link"
            size="sm"
            onClick={() => {
              setActiveTab("all");
              setPriceRange("all");
              setSelectedCity("");
              setKeyword("");
            }}
          >
            <RotateCcw />
            <span>{isEn ? "Reset all filters" : "Atur ulang filter"}</span>
          </Button>
        </div>
      )}

      {/* Properties Grid or Table View */}
      {loading ? (
        <div className="py-24 flex items-center justify-center">
          <LoadingSpinner text={isEn ? "Loading homes..." : "Memuat daftar rumah..."} />
        </div>
      ) : filteredProperties.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-white rounded-2xl border border-neutral-200/80 p-8 shadow-2xs">
          <SlidersHorizontal className="w-8 h-8 text-sage-600 mx-auto" />
          <p className="text-sm font-bold text-neutral-900">
            {isEn ? "No properties match your filter" : "Tidak ada properti yang cocok dengan filter"}
          </p>
          <p className="text-xs text-neutral-500">
            {isEn
              ? "Try adjusting your price range, city filter, or search keyword."
              : "Coba sesuaikan rentang harga, area kota, atau kata kunci pencarian Anda."}
          </p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {viewMode === "table" ? (
            <motion.div
              key="table"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: smoothEase }}
            >
              <PropertyTableView properties={filteredProperties} />
            </motion.div>
          ) : (
            <motion.div
              key="grid"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: smoothEase }}
            >
              <PropertyGridView properties={filteredProperties} isEn={isEn} />
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}

// PropertiesPage renders the near-full-width architectural property catalog with responsive grid and table views.
export default function PropertiesPage() {
  return (
    <>
      <Navbar />
      <main id="main-content" className="flex-1 bg-[#f6f8f6] min-h-screen">
        <Suspense
          fallback={
            <div className="py-24 flex justify-center">
              <LoadingSpinner />
            </div>
          }
        >
          <PropertiesContent />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
