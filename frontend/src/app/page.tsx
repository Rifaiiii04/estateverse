"use client";

import React, { useEffect, useState } from "react";
import { Property } from "@/types/property";
import { getPublicProperties } from "@/lib/api/properties";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/home/HeroSection";
import { SearchFilterBar } from "@/components/home/SearchFilterBar";
import { FeatureShowcase } from "@/components/home/FeatureShowcase";
import { AiConsultantSection } from "@/components/home/AiConsultantSection";
import { ImpactSection } from "@/components/home/ImpactSection";
import { AudienceSection } from "@/components/home/AudienceSection";
import { FaqSection } from "@/components/home/FaqSection";
import { PropertyCard } from "@/components/properties/PropertyCard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useLanguage } from "@/context/LanguageContext";
import { cn } from "@/lib/utils/cn";
import { PAGE_CONTAINER } from "@/lib/utils/layout";

// HomePage presents EstateVerse: Walk Inside 360° recorded by phone, for small sellers and first-time buyers.
export default function HomePage() {
  const { t } = useLanguage();
  const [dbProperties, setDbProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    getPublicProperties(1, 12)
      .then((res) => {
        if (isMounted) setDbProperties(res.properties || []);
      })
      .catch(() => {
        if (isMounted) setDbProperties([]);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const displayProperties = dbProperties.slice(0, 8);

  return (
    <>
      <Navbar />

      <main id="main-content" className="flex-1 bg-white">
        <HeroSection />

        <SearchFilterBar />

        {/* Featured Properties Section — shared 1440px container, 4-col on XL */}
        <section id="properties" className="py-12 sm:py-16 bg-neutral-50/50 border-y border-neutral-100">
          <div className={cn(PAGE_CONTAINER, "space-y-8")}>
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-neutral-200/70 pb-4">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-950">
                {t.catalog.title}
              </h2>
              <span className="text-xs sm:text-sm text-neutral-700 font-medium">
                {t.catalog.subtitle}
              </span>
            </div>

            {isLoading ? (
              <div className="py-16 flex items-center justify-center">
                <LoadingSpinner text={t.catalog.loading} />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {displayProperties.map((prop) => (
                  <PropertyCard key={prop.id} property={prop} />
                ))}
              </div>
            )}
          </div>
        </section>

        <ImpactSection />

        <AudienceSection />

        <FeatureShowcase />

        <AiConsultantSection />

        <FaqSection />
      </main>

      <Footer />
    </>
  );
}

