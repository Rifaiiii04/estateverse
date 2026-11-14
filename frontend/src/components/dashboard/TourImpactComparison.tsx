"use client";

import React from "react";
import { Scale } from "lucide-react";
import type { GroupStats, TourComparison } from "@/types/property";

/** Fewer visits than this per group make the comparison too noisy to read anything into. */
const MIN_VIEWS_PER_GROUP = 30;

// conversionLabel formats leads per detail-page visit as a percentage, or a dash without data.
function conversionLabel(g: GroupStats): string {
  return g.views > 0 ? `${((g.leads / g.views) * 100).toFixed(1)}%` : "—";
}

// GroupColumn shows one side of the with/without Walk Inside comparison.
function GroupColumn({ title, stats }: { title: string; stats: GroupStats }) {
  return (
    <div className="flex-1 rounded-xl border border-neutral-200 p-4 space-y-1">
      <h3 className="text-xs font-semibold text-neutral-700">{title}</h3>
      <p className="text-2xl font-extrabold text-neutral-950">{conversionLabel(stats)}</p>
      <p className="text-[11px] text-neutral-600">
        {stats.leads} leads dari {stats.views} kunjungan · {stats.listings} iklan
      </p>
    </div>
  );
}

// TourImpactComparison lets sellers measure, on their own data, whether Walk Inside listings convert visits into leads better.
export function TourImpactComparison({ comparison }: { comparison?: TourComparison }) {
  const empty = { listings: 0, views: 0, leads: 0 };
  const withTour = comparison?.with_tour ?? empty;
  const withoutTour = comparison?.without_tour ?? empty;
  const enoughData = withTour.views >= MIN_VIEWS_PER_GROUP && withoutTour.views >= MIN_VIEWS_PER_GROUP;

  return (
    <section aria-labelledby="tour-impact-title" className="bg-white rounded-2xl border border-neutral-200/80 p-5 sm:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Scale className="w-5 h-5 text-neutral-900" aria-hidden="true" />
        <h2 id="tour-impact-title" className="text-base font-bold text-neutral-950">Dampak Walk Inside di Iklan Anda</h2>
      </div>
      <p className="text-xs text-neutral-700">Persentase kunjungan halaman iklan yang berlanjut menjadi permintaan survei (leads).</p>
      <div className="flex flex-col sm:flex-row gap-3">
        <GroupColumn title="Iklan dengan Walk Inside 360°" stats={withTour} />
        <GroupColumn title="Iklan tanpa Walk Inside" stats={withoutTour} />
      </div>
      <p className="text-[11px] text-neutral-600">
        {enoughData
          ? "Ini perbandingan sederhana, bukan uji sebab-akibat: iklan bisa berbeda juga dalam harga, lokasi, dan foto."
          : `Data belum cukup untuk disimpulkan (butuh minimal ${MIN_VIEWS_PER_GROUP} kunjungan di tiap kelompok). Riset tentang efek tur virtual juga belum seragam, jadi ukur dari data Anda sendiri.`}
      </p>
    </section>
  );
}
