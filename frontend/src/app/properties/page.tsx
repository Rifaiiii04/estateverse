"use client";

import React, { useEffect, useState, Suspense } from "react";
import { SlidersHorizontal, RotateCcw } from "lucide-react";
import { Property } from "@/types/property";
import { getPublicProperties } from "@/lib/api/properties";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PropertyGridView } from "@/components/properties/PropertyGridView";
import { PropertyTableView } from "@/components/properties/PropertyTableView";
import { PropertiesCatalogHeader } from "@/components/properties/PropertiesCatalogHeader";
import { usePropertyFilters } from "@/components/properties/usePropertyFilters";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/Button";
import { FadeIn, smoothEase } from "@/components/ui/MotionPrimitives";
import { AnimatePresence, motion } from "framer-motion";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { useIsMobile } from "@/lib/hooks/useIsMobile";

// PropertiesContent orchestrates data fetching, filtering, sorting, and full-width responsive display.
function PropertiesContent() {
  const { lang } = useLanguage();
  const { isAuthenticated } = useAuth();
  const isEn = lang === "en";

  const [dbProps, setDbProps] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const { filters, stats, visible: filteredProperties, hasActiveFilters } = usePropertyFilters(dbProps);
  // Phones always get the card grid; the table only fits tablets and larger.
  const shownView = useIsMobile() ? "grid" : viewMode;

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

  return (
    <div className="w-full max-w-[1840px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-6 sm:py-9 space-y-5 sm:space-y-6">
      {/* Header, desktop filter toolbar, and phone search + filter sheet */}
      <FadeIn y={12}>
        <PropertiesCatalogHeader
          isEn={isEn}
          isAuthenticated={isAuthenticated}
          stats={stats}
          filters={filters}
          resultCount={filteredProperties.length}
          viewMode={viewMode}
          setViewMode={setViewMode}
        />
      </FadeIn>

      {/* Active Filter Reset Bar (only shown when filtered) */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between gap-3 text-xs text-neutral-500 pt-1">
          <span>
            {isEn
              ? `Showing ${filteredProperties.length} of ${stats.totalCount} listings`
              : `Menampilkan ${filteredProperties.length} dari ${stats.totalCount} properti`}
          </span>
          <Button variant="link" size="sm" onClick={filters.reset}>
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
          {shownView === "table" ? (
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
