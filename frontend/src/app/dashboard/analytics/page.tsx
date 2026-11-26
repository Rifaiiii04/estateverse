"use client";

import React, { useEffect, useState } from "react";
import { Box, Eye, Clock, Users, BarChart3 } from "lucide-react";
import { Property, DashboardSummary } from "@/types/property";
import { getDashboardSummary, getDashboardProperties } from "@/lib/api/properties";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { TourImpactComparison } from "@/components/dashboard/TourImpactComparison";
import { propertyTypeLabel } from "@/lib/utils/propertyType";

// DashboardAnalyticsPage displays real database portfolio analytics, 3D engagement, and per-listing metrics.
export default function DashboardAnalyticsPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    Promise.all([getDashboardSummary(), getDashboardProperties()])
      .then(([sum, props]) => {
        if (isMounted) {
          setSummary(sum);
          setProperties(props);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const totalViews = summary?.total_views ?? 0;
  const tourViews = summary?.total_tour_views ?? 0;
  const totalLeads = summary?.total_leads ?? 0;
  const leadsAfterTour = summary?.leads_viewed_tour ?? 0;
  const tourRate = totalViews > 0 ? Math.round((tourViews / totalViews) * 100) : 0;
  const afterTourRate = totalLeads > 0 ? Math.round((leadsAfterTour / totalLeads) * 100) : 0;

  const metricHighlights = [
    {
      title: "Kunjungan Iklan",
      value: totalViews.toLocaleString("id-ID"),
      change: "Halaman detail dibuka pembeli",
      icon: Eye,
      desc: "Dicatat setiap kali halaman iklan Anda dibuka",
    },
    {
      title: "Walk Inside Dibuka",
      value: tourViews.toLocaleString("id-ID"),
      change: `${tourRate}% dari kunjungan`,
      icon: Box,
      desc: "Pembeli yang menjelajah tur 360° atau model 3D",
    },
    {
      title: "Calon Pembeli (Leads)",
      value: totalLeads.toLocaleString("id-ID"),
      change: "Formulir survei & pertanyaan",
      icon: Users,
      desc: "Pembeli yang mengirim permintaan lewat formulir",
    },
    {
      title: "Leads Setelah Lihat Tur",
      value: `${afterTourRate}%`,
      change: `${leadsAfterTour} dari ${totalLeads} leads`,
      icon: Clock,
      desc: "Pembeli yang sudah melihat tur sebelum minta survei — survei lebih tepat sasaran",
    },
  ];

  if (isLoading) {
    return (
      <div className="py-24 flex justify-center">
        <LoadingSpinner text="Memuat statistik iklan properti Anda..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Page Header */}
      <div className="border-b border-neutral-200/80 pb-5">
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-neutral-950">
          Statistik &amp; Performa Iklan
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 font-normal mt-0.5">
          Pantau jumlah pengunjung dan performa seluruh iklan properti Anda secara langsung.
        </p>
      </div>

      {/* 4 Analytical Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {metricHighlights.map((m) => {
          const IconComp = m.icon;
          return (
            <div
              key={m.title}
              className="bg-white rounded-2xl p-5 border border-neutral-200/80 shadow-2xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                  {m.title}
                </span>
                <div className="w-9 h-9 rounded-xl bg-sage-600 text-white flex items-center justify-center shrink-0" aria-hidden="true">
                  <IconComp className="w-4 h-4" />
                </div>
              </div>

              <div>
                <span className="text-2xl sm:text-3xl font-extrabold text-neutral-950 tracking-tight block">
                  {m.value}
                </span>
                <span className="text-xs font-semibold text-emerald-600 mt-0.5 block">
                  {m.change}
                </span>
              </div>

              <p className="text-[11px] text-neutral-600 leading-snug pt-1 border-t border-neutral-100">
                {m.desc}
              </p>
            </div>
          );
        })}
      </div>

      <TourImpactComparison comparison={summary?.tour_comparison} />

      {/* Performance by Property Table */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-sage-600" aria-hidden="true" />
          <h2 className="text-base font-bold text-neutral-950">
            Rincian Performa Iklan ({properties.length} Properti)
          </h2>
        </div>

        {properties.length === 0 ? (
          <div className="py-12 text-center text-xs text-neutral-500">
            Belum ada iklan properti yang dipasang.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-neutral-100 text-neutral-600 font-bold uppercase tracking-wider">
                  <th className="pb-3">Judul Properti</th>
                  <th className="pb-3">Tipe &amp; Lokasi</th>
                  <th className="pb-3">Harga Penawaran</th>
                  <th className="pb-3">Model 3D</th>
                  <th className="pb-3">Status Tayang</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 font-medium text-neutral-700">
                {properties.map((row) => (
                  <tr key={row.id} className="hover:bg-neutral-50/60 transition-colors">
                    <td className="py-3.5 font-bold text-neutral-950">{row.title}</td>
                    <td className="py-3.5">{propertyTypeLabel(row.property_type)} &bull; {row.city}</td>
                    <td className="py-3.5">Rp {row.price.toLocaleString("id-ID")}</td>
                    <td className="py-3.5">
                      {row.model_3d_path ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-[10px]">
                          Ada
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-500 font-semibold text-[10px]">
                          —
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 capitalize font-bold text-neutral-950">{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
