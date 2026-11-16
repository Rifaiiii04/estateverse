"use client";

import { PRICE_RANGES } from "@/lib/utils/priceRanges";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { SlidersHorizontal, RotateCcw, Search } from "lucide-react";
import { CustomSelect, SelectOption } from "@/components/ui/CustomSelect";
import { FadeIn } from "@/components/ui/MotionPrimitives";
import { Button } from "@/components/ui/Button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs";
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
    { value: "", label: isEn ? "All Locations" : "Semua Lokasi" },
    { value: "Purwokerto", label: "Purwokerto", description: "Banyumas, Jawa Tengah" },
    { value: "Banyumas", label: "Banyumas", description: "Jawa Tengah" },
    { value: "Purbalingga", label: "Purbalingga", description: "Jawa Tengah" },
    { value: "Cilacap", label: "Cilacap", description: "Jawa Tengah" },
    { value: "Tegal", label: "Tegal", description: "Jawa Tengah" },
    { value: "Semarang", label: "Semarang", description: "Jawa Tengah" },
    { value: "Solo", label: "Solo (Surakarta)", description: "Jawa Tengah" },
    { value: "Yogyakarta", label: "Yogyakarta", description: "DI Yogyakarta" },
  ];

  const typeOptions: SelectOption[] = [
    { value: "", label: isEn ? "All Property Types" : "Semua Tipe Properti" },
    { value: "house", label: isEn ? "House" : "Rumah", description: isEn ? "Landed family home" : "Rumah tapak untuk keluarga" },
    { value: "townhouse", label: "Townhouse", description: isEn ? "Row house in town" : "Rumah deret di perkotaan" },
    { value: "cluster", label: "Cluster", description: isEn ? "Small gated housing" : "Perumahan kecil satu gerbang" },
    { value: "villa", label: "Villa", description: isEn ? "Holiday home" : "Rumah peristirahatan" },
  ];

  const priceOptions: SelectOption[] = [
    { value: "", label: isEn ? "All Price Ranges" : "Semua Rentang Harga" },
    ...PRICE_RANGES.map((r) => ({ value: r.value, label: r.label, description: r.description })),
  ];

  const areaOptions: SelectOption[] = [
    { value: "", label: isEn ? "All Sizes (m²)" : "Semua Ukuran (m²)" },
    { value: "100", label: "< 100 m²", description: isEn ? "Compact & low maintenance" : "Kompak efisien & modern" },
    { value: "250", label: "100 - 250 m²", description: isEn ? "Ideal family comfort" : "Ukuran ideal keluarga" },
    { value: "500", label: "> 250 m²", description: isEn ? "Large family home" : "Rumah besar & halaman luas" },
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
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
            <TabsList className="w-full overflow-x-auto no-scrollbar">
              {tabs.map((tab) => (
                <TabsTrigger key={tab.id} value={tab.id}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

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
            <Button variant="ghost" className="self-start" onClick={handleApply}>
              <SlidersHorizontal className="text-primary" />
              <span>{t.search.moreFilters}</span>
            </Button>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <Button variant="ghost" onClick={handleReset}>
                <RotateCcw />
                <span>{t.search.reset}</span>
              </Button>

              <Button size="lg" className="flex-1 px-4 sm:flex-initial" onClick={handleApply}>
                <Search />
                <span>{t.search.submit}</span>
              </Button>
            </div>
          </div>
        </div>
      </FadeIn>
    </section>
  );
}
