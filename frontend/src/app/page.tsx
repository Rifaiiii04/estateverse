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
import { ProblemSolutionSection } from "@/components/home/ProblemSolutionSection";
import { WalkInsideExplainer } from "@/components/home/WalkInsideExplainer";
import { AudienceSection } from "@/components/home/AudienceSection";
import { FaqSection } from "@/components/home/FaqSection";
import { PropertyCard } from "@/components/properties/PropertyCard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useLanguage } from "@/context/LanguageContext";
import { cn } from "@/lib/utils/cn";
import { PAGE_CONTAINER } from "@/lib/utils/layout";
import { hasShowablePhotos } from "@/lib/utils/media";

// HomePage presents EstateVerse from the user's side: the problems of first-time buyers and small sellers, then how we help.
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

  // Listings whose every photo is unreadable are left off the home page so it never shows broken cards.
  const displayProperties = dbProperties.filter(hasShowablePhotos).slice(0, 8);

  return (
    <>
      <Navbar />

      <main id="main-content" className="flex-1 bg-white">
        <HeroSection />

        <SearchFilterBar />

        {/* User-first story: the buyer's and seller's problems, then what Walk Inside is, then real listings. */}
        <ProblemSolutionSection />

        <WalkInsideExplainer />

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

        <FeatureShowcase />

        <AudienceSection />

        <ImpactSection />

        <AiConsultantSection />

        <FaqSection />
      </main>

      <Footer />
    </>
  );
}

