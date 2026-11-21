"use client";

import React, { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
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

// ImpactSection explains why EstateVerse helps, in plain language, with live platform figures from the database.
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
    <section id="impact" aria-labelledby="impact-title" className="py-14 sm:py-20 bg-white">
      <div className={cn(PAGE_CONTAINER, "space-y-10")}>
        <FadeIn>
          <div className="space-y-3 max-w-3xl">
            <span className="inline-flex items-center gap-2 text-xs font-bold text-sage-800 bg-sage-50 border border-sage-200 rounded-full px-3 py-1.5">
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              {t.impact.badge}
            </span>
            <h2 id="impact-title" className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-neutral-950 leading-tight">
              <span className="block">{t.impact.titleLine1}</span>
              <span className="block text-sage-700">{t.impact.titleLine2}</span>
            </h2>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <FadeIn className="bg-neutral-50 border border-neutral-200 rounded-2xl p-6 space-y-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-700">{t.impact.problemTitle}</h3>
            <p className="text-sm sm:text-base text-neutral-800 leading-relaxed">{t.impact.problem}</p>
          </FadeIn>
          <FadeIn delay={0.05} className="bg-sage-50 border border-sage-200 rounded-2xl p-6 space-y-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-sage-800">{t.impact.solutionTitle}</h3>
            <p className="text-sm sm:text-base text-neutral-800 leading-relaxed">{t.impact.solution}</p>
          </FadeIn>
        </div>

        <ul className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {t.impact.benefits.map((benefit) => (
            <li key={benefit.title} className="border border-neutral-200 rounded-2xl p-5 space-y-1.5">
              <h3 className="text-base font-bold text-neutral-950">{benefit.title}</h3>
              <p className="text-sm text-neutral-800 leading-relaxed">{benefit.text}</p>
            </li>
          ))}
        </ul>

        <div className="space-y-3">
          <h3 className="text-base font-bold text-neutral-950">{t.impact.statsTitle}</h3>
          <dl className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {STAT_KEYS.map((key) => (
              <div key={key} className="bg-white border border-neutral-200 rounded-2xl p-4">
                <dt className="text-xs text-neutral-700">{labels[key]}</dt>
                <dd className="text-2xl font-extrabold text-neutral-950">{stats ? stats[key].toLocaleString("id-ID") : "—"}</dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-neutral-600">{t.impact.statsNote}</p>
        </div>
      </div>
    </section>
  );
}
