"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, ChevronRight, Box, Image as PhotoIcon, MessageCircle } from "lucide-react";
import { Property, DashboardSummary } from "@/types/property";

interface ListingEfficiencyProps {
  summary: DashboardSummary | null;
  properties: Property[];
}

// ListingEfficiency renders the seller performance readiness bars and actionable business decision tips.
export function ListingEfficiency({ summary, properties }: ListingEfficiencyProps) {
  const total = summary?.total_properties || 0;
  const with3D = summary?.listings_with_tour || 0;
  const draftCount = summary?.draft_count || 0;

  // Compute real completeness percentages
  const ratio3D = total > 0 ? Math.round((with3D / total) * 100) : 0;
  const propertiesWithImages = properties.filter((p) => p.images && p.images.length > 0).length;
  const ratioImages = total > 0 ? Math.round((propertiesWithImages / total) * 100) : 0;
  const propertiesWithPhone = properties.filter((p) => Boolean(p.whatsapp_number)).length;
  const ratioPhone = total > 0 ? Math.round((propertiesWithPhone / total) * 100) : 0;

  return (
    <div id="efficiency" className="bg-white rounded-2xl border border-neutral-200/80 p-5 sm:p-6 shadow-2xs space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-100 pb-5">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-neutral-950">
            Kelengkapan Iklan
          </h2>
          <p className="text-xs text-neutral-600">
            Semakin lengkap informasi iklan, semakin cepat menarik minat pembeli.
          </p>
        </div>
        <span className="text-xs font-bold px-2.5 py-1 bg-neutral-100 text-neutral-800 rounded-lg whitespace-nowrap shrink-0">
          % Lengkap
        </span>
      </div>

      {/* Progress Bars */}
      <div className="space-y-4">
        {/* Model 3D Readiness */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-neutral-700">
              <Box className="w-3.5 h-3.5 text-neutral-900" />
              <span>Tur Virtual 360°</span>
            </span>
            <span className="text-neutral-950 font-bold">{ratio3D}%</span>
          </div>
          <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
            <div className="h-full bg-neutral-950 rounded-full transition-all duration-500" style={{ width: `${ratio3D}%` }} />
          </div>
        </div>

        {/* Gallery Photos */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-neutral-700">
              <PhotoIcon className="w-3.5 h-3.5 text-neutral-900" aria-hidden="true" />
              <span>Foto-Foto Rumah</span>
            </span>
            <span className="text-neutral-950 font-bold">{ratioImages}%</span>
          </div>
          <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
            <div className="h-full bg-neutral-700 rounded-full transition-all duration-500" style={{ width: `${ratioImages}%` }} />
          </div>
        </div>

        {/* WhatsApp & Contact */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-neutral-700">
              <MessageCircle className="w-3.5 h-3.5 text-neutral-900" />
              <span>Nomor WhatsApp Aktif</span>
            </span>
            <span className="text-neutral-950 font-bold">{ratioPhone}%</span>
          </div>
          <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
            <div className="h-full bg-neutral-500 rounded-full transition-all duration-500" style={{ width: `${ratioPhone}%` }} />
          </div>
        </div>
      </div>

      {/* Recommendations: a divided section on phones, an inset panel on wider screens (no card inside a card on mobile) */}
      <div className="space-y-3 border-t border-neutral-100 pt-5 md:pt-4 md:bg-neutral-50/80 md:rounded-xl md:p-4 md:border md:border-neutral-200/80">
        <div className="flex items-center gap-2 text-xs font-bold text-neutral-950">
          <Sparkles className="w-4 h-4 text-neutral-900" />
          <span>Saran untuk Iklan Anda</span>
        </div>

        <ul className="space-y-2 text-xs text-neutral-600">
          {with3D < total && (
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-900 mt-1.5 shrink-0" />
              <span>
                <strong>Rekam tur 360°:</strong> {total - with3D} iklan belum punya tur virtual. Buka halaman edit iklan dari HP, lalu rekam tiap ruangan — pembeli bisa melihat isi rumah sebelum survei.
              </span>
            </li>
          )}

          {(summary?.reports_count ?? 0) > 0 && (
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-600 mt-1.5 shrink-0" />
              <span>
                <strong>Ada {summary?.reports_count} laporan pengunjung:</strong> periksa kembali harga, foto, dan status iklan Anda agar sesuai kondisi sebenarnya.
              </span>
            </li>
          )}

          {draftCount > 0 && (
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-900 mt-1.5 shrink-0" />
              <span>
                <strong>Tayangkan Konsep:</strong> Anda memiliki {draftCount} iklan yang belum ditayangkan. Ubah status menjadi tayang agar terlihat pembeli.
              </span>
            </li>
          )}

          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
            <span>
              <strong>Balas Cepat:</strong> Pastikan nomor WhatsApp selalu aktif agar mudah dihubungi calon pembeli.
            </span>
          </li>
        </ul>

        <Link href="/dashboard/properties/new" className="inline-flex items-center gap-1 text-[11px] font-bold text-neutral-950 hover:underline pt-1">
          <span>Pasang properti baru sekarang</span>
          <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
