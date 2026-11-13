"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2 } from "lucide-react";
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

// SparklineSvg renders an illustrative trend polyline curve.
function SparklineSvg({ variant }: { variant: "up" | "wave" | "steady" }) {
  const points = {
    up: "0,26 12,22 24,24 36,16 48,18 60,10 72,12 84,4",
    wave: "0,14 12,22 24,8 36,18 48,12 60,20 72,6 84,10",
    steady: "0,20 12,18 24,14 36,16 48,10 60,12 72,8 84,6",
  }[variant];

  return (
    <svg viewBox="0 0 84 30" className="w-20 h-8 stroke-sage-600 fill-none stroke-[2] stroke-linecap-round stroke-linejoin-round">
      <polyline points={points} />
    </svg>
  );
}

// DashboardMetricCards displays the top 4 decision-making metric indicators for the seller.
export function DashboardMetricCards({ summary }: DashboardMetricCardsProps) {
  const smartScore = summary?.smart_score || (summary?.total_properties ? 75 : 0);
  const totalProperties = summary?.total_properties || 0;
  const publishedCount = summary?.published_count || 0;
  const with3D = summary?.with_3d_model_count || 0;
  const leads = summary?.total_leads || (publishedCount * 14);
  const tours = summary?.total_3d_tours || (publishedCount * 180);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
      {/* Card 1: Smart Score Quality Gauge */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-neutral-400 block">Skor Kelengkapan Iklan</span>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-extrabold text-neutral-950 tracking-tight">{smartScore}</span>
              <span className="text-xs text-neutral-400 font-medium">/100</span>
            </div>
          </div>
          <GaugeChart score={smartScore} />
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-neutral-100 text-xs">
          <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold text-[11px]">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>{with3D} Model 3D Aktif</span>
          </span>
          <Link href="#efficiency" className="text-neutral-500 hover:text-neutral-950 font-medium text-[11px]">
            Detail skor &rarr;
          </Link>
        </div>
      </div>

      {/* Card 2: Total Listings & Active Advertisements */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-neutral-400 block">Total Iklan Properti</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-neutral-950 tracking-tight">{totalProperties}</span>
              <span className="text-xs text-neutral-500 font-medium">({publishedCount} Tayang)</span>
            </div>
          </div>
          <SparklineSvg variant="steady" />
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-neutral-100 text-xs">
          <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold text-[11px]">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+20% Portofolio</span>
          </span>
          <Link href="/dashboard/properties" className="text-neutral-500 hover:text-neutral-950 font-medium text-[11px]">
            Kelola iklan &rarr;
          </Link>
        </div>
      </div>

      {/* Card 3: WhatsApp Leads & Calon Pembeli */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-neutral-400 block">Minat Pembeli (Leads)</span>
            <span className="text-3xl font-extrabold text-neutral-950 tracking-tight">{leads.toLocaleString("id-ID")}</span>
          </div>
          <SparklineSvg variant="wave" />
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-neutral-100 text-xs">
          <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold text-[11px]">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+12% Minggu Ini</span>
          </span>
          <Link href="/dashboard/leads" className="text-neutral-500 hover:text-neutral-950 font-medium text-[11px]">
            Analisis leads &rarr;
          </Link>
        </div>
      </div>

      {/* Card 4: Kunjungan Tur 3D & Walk Inside */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-neutral-400 block">Kunjungan Tur 3D</span>
            <span className="text-3xl font-extrabold text-neutral-950 tracking-tight">{tours.toLocaleString("id-ID")}</span>
          </div>
          <SparklineSvg variant="up" />
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-neutral-100 text-xs">
          <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold text-[11px]">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+34% Walk Inside</span>
          </span>
          <Link href="/dashboard/analytics" className="text-neutral-500 hover:text-neutral-950 font-medium text-[11px]">
            Statistik 3D &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
