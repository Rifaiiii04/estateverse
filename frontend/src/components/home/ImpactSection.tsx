"use client";

import React, { useEffect, useState } from "react";
import type { ImpactStats } from "@/types/property";
import { getImpactStats } from "@/lib/api/engagement";
import { useLanguage } from "@/context/LanguageContext";
import { cn } from "@/lib/utils/cn";
import { PAGE_CONTAINER } from "@/lib/utils/layout";
import { FadeIn } from "@/components/ui/MotionPrimitives";

const STAT_KEYS: (keyof ImpactStats)[] = [
  "active_sellers",
  "published_listings",
  "listings_with_tour",
  "tour_views",
  "buyer_inquiries",
  "inquiries_after_tour",
];

// ImpactSection shows live platform figures straight from the database as proof that the site is in real use.
export function ImpactSection() {
  const { t } = useLanguage();
  const [stats, setStats] = useState<ImpactStats | null>(null);

  useEffect(() => {
    let active = true;
    getImpactStats()
      .then((s) => active && setStats(s))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const labels: Record<keyof ImpactStats, string> = {
    active_sellers: t.impact.stats.activeSellers,
    published_listings: t.impact.stats.publishedListings,
    listings_with_tour: t.impact.stats.listingsWithTour,
    tour_rooms: t.impact.stats.listingsWithTour,
    tour_views: t.impact.stats.tourViews,
    buyer_inquiries: t.impact.stats.buyerInquiries,
    inquiries_after_tour: t.impact.stats.inquiriesAfterTour,
  };

  return (
    <section id="impact" aria-labelledby="impact-title" className="py-14 sm:py-16 bg-white">
      <FadeIn className={cn(PAGE_CONTAINER, "space-y-4")}>
        <h2 id="impact-title" className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-950">
          {t.impact.statsTitle}
        </h2>
        <dl className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {STAT_KEYS.map((key) => (
            <div key={key} className="bg-white border border-neutral-200 rounded-2xl p-4">
              <dt className="text-xs text-neutral-700">{labels[key]}</dt>
              <dd className="text-2xl font-extrabold text-neutral-950">{stats ? stats[key].toLocaleString("id-ID") : "—"}</dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-neutral-600">{t.impact.statsNote}</p>
      </FadeIn>
    </section>
  );
}
