"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { SlidersHorizontal, RotateCcw, Search } from "lucide-react";
import { CustomSelect, SelectOption } from "@/components/ui/CustomSelect";
import { FadeIn } from "@/components/ui/MotionPrimitives";
import { useLanguage } from "@/context/LanguageContext";

interface SearchFilterBarProps {
  onFilterChange?: (filters: { tab: string; city: string; type: string; priceRange: string }) => void;
}

// SearchFilterBar renders an architectural search and filter widget with tabbed categories and styled options.
export function SearchFilterBar({ onFilterChange }: SearchFilterBarProps) {
  const { lang, t } = useLanguage();
  const [activeTab, setActiveTab] = useState("buy");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedPrice, setSelectedPrice] = useState("");
  const [selectedArea, setSelectedArea] = useState("");

  const isEn = lang === "en";

  const locationOptions: SelectOption[] = [
    { value: "", label: isEn ? "All Indonesia Locations" : "Semua Lokasi Indonesia" },
    { value: "Bogor", label: "Bogor, Jawa Barat", description: isEn ? "Sentul City & Highland" : "Sentul City & Bogor Kota" },
    { value: "Bandung", label: "Bandung, Jawa Barat", description: isEn ? "Dago & North Bandung" : "Dago & Bandung Utara" },
    { value: "Jakarta", label: "DKI Jakarta", description: isEn ? "South & Central Jakarta" : "Jakarta Selatan & Pusat" },
    { value: "Bali", label: "Badung & Denpasar, Bali", description: isEn ? "Canggu, Seminyak, Uluwatu" : "Canggu, Seminyak, Uluwatu" },
    { value: "Surabaya", label: "Surabaya, Jawa Timur", description: isEn ? "West & East Surabaya" : "Surabaya Barat & Timur" },
  ];

  const typeOptions: SelectOption[] = [
    { value: "", label: isEn ? "All Property Typologies" : "Semua Tipe Properti" },
    { value: "house", label: isEn ? "Modern Minimalist House" : "Rumah Modern Minimalis", description: isEn ? "Architectural family residence" : "Hunian keluarga arsitektural" },
    { value: "villa", label: isEn ? "Luxury Villa & Resort" : "Villa Mewah & Resort", description: isEn ? "Private pool & ocean panorama" : "Private pool & pemandangan alam" },
    { value: "townhouse", label: isEn ? "Exclusive Townhouse" : "Townhouse Eksklusif", description: isEn ? "Urban connectivity" : "Akses strategis perkotaan" },
    { value: "cluster", label: isEn ? "Gated 3D Cluster" : "Cluster Residensial 3D", description: isEn ? "24/7 security & community amenities" : "Keamanan 24 jam & fasilitas terpadu" },
  ];

  const priceOptions: SelectOption[] = [
    { value: "", label: isEn ? "All Price Ranges" : "Semua Rentang Harga" },
    { value: "low", label: "< Rp 500.000.000", description: isEn ? "Affordable starter homes" : "Hunian terjangkau / subsidi" },
    { value: "mid", label: "Rp 500 Jt - Rp 2 Miliar", description: isEn ? "Popular modern family segment" : "Segmen favorit keluarga modern" },
    { value: "high", label: "> Rp 2.000.000.000", description: isEn ? "Luxury estate & high-end villas" : "Segmen premium & luxury estate" },
  ];

  const areaOptions: SelectOption[] = [
    { value: "", label: isEn ? "All Sizes (m²)" : "Semua Ukuran (m²)" },
    { value: "100", label: "< 100 m²", description: isEn ? "Compact & low maintenance" : "Kompak efisien & modern" },
    { value: "250", label: "100 - 250 m²", description: isEn ? "Ideal family comfort" : "Ukuran ideal keluarga" },
    { value: "500", label: "> 250 m²", description: isEn ? "Spacious luxury grounds" : "Mewah & halaman luas" },
  ];

  const tabs = [
    { id: "buy", label: t.search.tabBuy },
    { id: "rent", label: t.search.tabRent },
    { id: "new", label: t.search.tabNew },
    { id: "commercial", label: t.search.tabCommercial },
  ];

  const router = useRouter();

  // Applies the current filter selection or navigates to the catalog page.
  const handleApply = () => {
    if (onFilterChange) {
      onFilterChange({
        tab: activeTab,
        city: selectedCity,
        type: selectedType,
        priceRange: selectedPrice,
      });
      return;
    }
    const params = new URLSearchParams();
    if (selectedType) params.set("type", selectedType);
    if (selectedCity) params.set("city", selectedCity);
    if (selectedPrice) params.set("priceRange", selectedPrice);
    const qs = params.toString();
    router.push(qs ? `/properties?${qs}` : "/properties");
  };

  // Resets all filter dropdowns back to default unselected states.
  const handleReset = () => {
    setSelectedCity("");
    setSelectedType("");
    setSelectedPrice("");
    setSelectedArea("");
    if (onFilterChange) {
      onFilterChange({ tab: activeTab, city: "", type: "", priceRange: "" });
    }
  };

  return (
    <section className="py-10 sm:py-12 bg-white">
      <FadeIn className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-7 sm:space-y-8">
        {/* Section Heading Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start">
          <div className="lg:col-span-7">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-neutral-950 leading-[1.15]">
              <span className="block">{t.search.titleLine1}</span>
              <span className="block">{t.search.titleLine2}</span>
            </h2>
          </div>

          <div className="lg:col-span-5">
            <p className="text-sm sm:text-[15px] text-neutral-600 leading-relaxed max-w-xl">
              {t.search.description}
            </p>
          </div>
        </div>

        {/* Elevated Filter Bar Container (30% Secondary Surface & Border + 10% Sage Accents) */}
        <div className="bg-neutral-50/70 rounded-2xl sm:rounded-3xl border border-neutral-200 p-4 sm:p-6 lg:p-7 shadow-2xs">
          {/* Top Category Tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b border-neutral-200/80 pb-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`h-9 px-4 rounded-xl text-xs sm:text-[13px] font-semibold transition-all cursor-pointer inline-flex items-center border ${
                  activeTab === tab.id
                    ? "bg-sage-600 text-white border-sage-600 shadow-2xs"
                    : "bg-white border-neutral-200 text-neutral-600 hover:text-sage-700 hover:border-sage-400"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Form Filter Dropdowns Grid with Styled Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 py-5">
            <CustomSelect
              label={t.search.locLabel}
              options={locationOptions}
              value={selectedCity}
              onChange={setSelectedCity}
              placeholder={t.search.locPlaceholder}
            />

            <CustomSelect
              label={t.search.typeLabel}
              options={typeOptions}
              value={selectedType}
              onChange={setSelectedType}
              placeholder={t.search.typePlaceholder}
            />

            <CustomSelect
              label={t.search.priceLabel}
              options={priceOptions}
              value={selectedPrice}
              onChange={setSelectedPrice}
              placeholder={t.search.pricePlaceholder}
            />

            <CustomSelect
              label={t.search.sizeLabel}
              options={areaOptions}
              value={selectedArea}
              onChange={setSelectedArea}
              placeholder={t.search.sizePlaceholder}
            />
          </div>

          {/* Bottom Filter Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-neutral-200/70 text-xs">
            <button
              type="button"
              onClick={handleApply}
              className="inline-flex items-center gap-1.5 text-neutral-600 hover:text-sage-700 font-medium transition-colors cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-sage-600" />
              <span>{t.search.moreFilters}</span>
            </button>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center justify-center gap-1.5 text-neutral-500 hover:text-neutral-900 transition-colors px-3 py-2.5 rounded-xl cursor-pointer font-medium"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t.search.reset}</span>
              </button>

              <button
                type="button"
                onClick={handleApply}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 bg-sage-600 text-white hover:bg-sage-700 font-semibold px-5 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
                <span>{t.search.submit}</span>
              </button>
            </div>
          </div>
        </div>
      </FadeIn>
    </section>
  );
}
