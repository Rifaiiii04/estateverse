"use client";

import React from "react";
import Link from "next/link";
import { DashboardSummary } from "@/types/property";

interface DashboardMetricCardsProps {
  summary: DashboardSummary | null;
}

// GaugeChart renders an SVG speedometer arc displaying the listing quality index.
function GaugeChart({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, score));
  // 180 degree arc from 180 to 0
  const angle = (clamped / 100) * 180;
  const rad = (angle * Math.PI) / 180;
  const needleX = 40 - 24 * Math.cos(rad);
  const needleY = 40 - 24 * Math.sin(rad);

  return (
    <div className="relative w-20 h-12 flex items-end justify-center overflow-hidden">
      <svg viewBox="0 0 80 45" className="w-full h-full">
        {/* Background Arc */}
        <path
          d="M 10 40 A 30 30 0 0 1 70 40"
          fill="none"
          stroke="#e4e4e7"
          strokeWidth="6"
          strokeLinecap="round"
        />
        {/* Active Value Arc */}
        <path
          d="M 10 40 A 30 30 0 0 1 70 40"
          fill="none"
          stroke="#356859"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray="94.25"
          strokeDashoffset={94.25 - (94.25 * clamped) / 100}
        />
        {/* Center Needle Point */}
        <circle cx="40" cy="40" r="3.5" fill="#356859" />
        <line x1="40" y1="40" x2={needleX} y2={needleY} stroke="#356859" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: React.ReactNode;
  note: string;
  href: string;
  linkLabel: string;
  visual?: React.ReactNode;
}

// MetricCard renders one dashboard figure with an honest explanatory note and a link to details.
function MetricCard({ label, value, note, href, linkLabel, visual }: MetricCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-2xs flex flex-col justify-between space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <span className="text-xs font-semibold text-neutral-600 block">{label}</span>
          <div className="text-3xl font-extrabold text-neutral-950 tracking-tight">{value}</div>
        </div>
        {visual}
      </div>
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-neutral-100 text-[11px]">
        <span className="text-neutral-600">{note}</span>
        <Link href={href} className="text-sage-700 hover:text-sage-900 font-semibold shrink-0">
          {linkLabel} &rarr;
        </Link>
      </div>
    </div>
  );
}

// DashboardMetricCards shows four real decision metrics computed from the seller's own data.
export function DashboardMetricCards({ summary }: DashboardMetricCardsProps) {
  const total = summary?.total_properties ?? 0;
  const published = summary?.published_count ?? 0;
  const withTour = summary?.listings_with_tour ?? 0;
  const leads = summary?.total_leads ?? 0;
  const leadsAfterTour = summary?.leads_viewed_tour ?? 0;
  const tourViews = summary?.total_tour_views ?? 0;
  const views = summary?.total_views ?? 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
      <MetricCard
        label="Skor Kelengkapan Iklan"
        value={<>{summary?.smart_score ?? 0}<span className="text-xs text-neutral-500 font-medium">/100</span></>}
        note={`${withTour} dari ${total} iklan punya tur 360°`}
        href="#efficiency"
        linkLabel="Cara naikkan"
        visual={<GaugeChart score={summary?.smart_score ?? 0} />}
      />
      <MetricCard
        label="Total Iklan Properti"
        value={<>{total} <span className="text-xs text-neutral-500 font-medium">({published} tayang)</span></>}
        note={`${total - published} masih draft`}
        href="/dashboard/properties"
        linkLabel="Kelola iklan"
      />
      <MetricCard
        label="Calon Pembeli (Leads)"
        value={leads.toLocaleString("id-ID")}
        note={`${leadsAfterTour} sudah melihat tur sebelum menghubungi`}
        href="/dashboard/leads"
        linkLabel="Lihat leads"
      />
      <MetricCard
        label="Walk Inside Dibuka"
        value={tourViews.toLocaleString("id-ID")}
        note={`dari ${views.toLocaleString("id-ID")} kunjungan halaman iklan`}
        href="/dashboard/analytics"
        linkLabel="Statistik"
      />
    </div>
  );
}
