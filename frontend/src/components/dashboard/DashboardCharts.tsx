"use client";

import React from "react";
import { DashboardSummary } from "@/types/property";
import { formatIDR } from "@/lib/utils/formatters";

interface DashboardChartsProps {
  summary: DashboardSummary | null;
}

interface BarRow {
  label: string;
  value: number;
}

const TYPE_LABELS: Record<string, string> = {
  house: "Rumah",
  villa: "Villa",
  townhouse: "Townhouse",
  cluster: "Cluster",
  apartment: "Apartemen",
  land: "Kavling",
  commercial: "Komersial",
};

// HorizontalBars draws labelled bars scaled to the largest value, with the exact number beside each bar.
function HorizontalBars({ rows, emptyText }: { rows: BarRow[]; emptyText: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (rows.every((r) => r.value === 0)) {
    return <p className="text-xs text-neutral-600 py-6 text-center">{emptyText}</p>;
  }
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label} className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="font-semibold text-neutral-800">{r.label}</span>
            <span className="font-bold text-neutral-950">{r.value.toLocaleString("id-ID")}</span>
          </div>
          <div className="h-2.5 rounded-full bg-neutral-100 overflow-hidden" aria-hidden="true">
            <div className="h-full bg-sage-600 rounded-full" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

// DashboardCharts shows real portfolio composition and the buyer journey from page view to inquiry.
export function DashboardCharts({ summary }: DashboardChartsProps) {
  const typeRows = Object.entries(summary?.type_breakdown ?? {}).map(([type, count]) => ({
    label: TYPE_LABELS[type] ?? type,
    value: count,
  }));
  const views = summary?.total_views ?? 0;
  const leads = summary?.total_leads ?? 0;
  const funnel: BarRow[] = [
    { label: "Kunjungan halaman iklan", value: views },
    { label: "Membuka Walk Inside 360°", value: summary?.total_tour_views ?? 0 },
    { label: "Menghubungi penjual (leads)", value: leads },
    { label: "Leads yang sudah lihat Walk Inside", value: summary?.leads_viewed_tour ?? 0 },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      <section className="lg:col-span-6 bg-white rounded-2xl border border-neutral-200/80 p-5 sm:p-6 shadow-2xs space-y-4" aria-labelledby="portfolio-title">
        <div className="border-b border-neutral-100 pb-4 space-y-0.5">
          <h3 id="portfolio-title" className="text-xs font-semibold text-neutral-600">Total Nilai Properti Anda</h3>
          <p className="text-2xl sm:text-3xl font-extrabold text-neutral-950 tracking-tight">
            {formatIDR(summary?.total_portfolio_value ?? 0)}
          </p>
          <p className="text-[11px] text-neutral-600">Rata-rata per iklan: {formatIDR(summary?.average_price ?? 0)}</p>
        </div>
        <HorizontalBars rows={typeRows} emptyText="Belum ada iklan. Tambahkan properti pertama Anda." />
      </section>

      <section className="lg:col-span-6 bg-white rounded-2xl border border-neutral-200/80 p-5 sm:p-6 shadow-2xs space-y-4" aria-labelledby="journey-title">
        <div className="border-b border-neutral-100 pb-4 space-y-0.5">
          <h3 id="journey-title" className="text-xs font-semibold text-neutral-600">Perjalanan Calon Pembeli</h3>
          <p className="text-2xl sm:text-3xl font-extrabold text-neutral-950 tracking-tight">
            {views > 0 ? `${Math.min(100, (leads / views) * 100).toFixed(1)}%` : "—"}
            <span className="text-xs text-neutral-600 font-medium"> kunjungan menjadi leads</span>
          </p>
        </div>
        <HorizontalBars rows={funnel} emptyText="Belum ada kunjungan. Bagikan tautan iklan Anda ke WhatsApp atau media sosial." />
        <p className="text-[11px] text-neutral-600">
          Semua angka dihitung dari data asli: kunjungan dan pembukaan tur dicatat saat pembeli membuka iklan Anda.
        </p>
      </section>
    </div>
  );
}
