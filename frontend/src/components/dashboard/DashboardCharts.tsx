"use client";

import React, { useState } from "react";
import { formatIDR } from "@/lib/utils/formatters";
import { DashboardSummary } from "@/types/property";
import { CustomSelect, SelectOption } from "@/components/ui/CustomSelect";

const periodOptions: SelectOption[] = [
  { value: "month", label: "Bulan Ini" },
  { value: "year", label: "Tahun 2026" },
];

interface DashboardChartsProps {
  summary: DashboardSummary | null;
}

// AreaSplineChart renders an interactive SVG area chart depicting portfolio valuation trends.
function AreaSplineChart() {
  return (
    <div className="relative w-full h-44 sm:h-52 pt-4">
      <svg viewBox="0 0 500 160" className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#18181b" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#18181b" stopOpacity="0.00" />
          </linearGradient>
        </defs>

        {/* Horizontal Grid & Benchmark Lines */}
        <line x1="0" y1="30" x2="500" y2="30" stroke="#f4f4f5" strokeWidth="1" />
        <line x1="0" y1="80" x2="500" y2="80" stroke="#f4f4f5" strokeWidth="1" />
        <line x1="0" y1="130" x2="500" y2="130" stroke="#f4f4f5" strokeWidth="1" />
        <line x1="0" y1="75" x2="500" y2="75" stroke="#a1a1aa" strokeWidth="1" strokeDasharray="4 4" />
        <text x="4" y="70" fill="#a1a1aa" fontSize="10" fontWeight="500">Benchmark Pasar</text>

        {/* Secondary Comparison Line */}
        <path
          d="M 0 110 Q 50 120 100 115 T 200 95 T 300 100 T 400 90 T 500 85"
          fill="none"
          stroke="#d4d4d8"
          strokeWidth="2"
        />

        {/* Main Spline Area Fill */}
        <path
          d="M 0 95 Q 60 70 120 85 T 240 55 T 360 45 T 440 35 L 500 40 L 500 150 L 0 150 Z"
          fill="url(#chartGradient)"
        />

        {/* Main Spline Curve */}
        <path
          d="M 0 95 Q 60 70 120 85 T 240 55 T 360 45 T 440 35 L 500 40"
          fill="none"
          stroke="#09090b"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Active Hover / Highlighting Marker */}
        <line x1="360" y1="20" x2="360" y2="150" stroke="#09090b" strokeWidth="1" strokeDasharray="3 3" />
        <circle cx="360" cy="45" r="4" fill="#09090b" />
        <circle cx="360" cy="45" r="8" fill="#09090b" fillOpacity="0.15" />
      </svg>
      <div className="flex justify-between text-[10px] text-neutral-400 pt-2 px-1 font-medium">
        <span>Tgl 1</span>
        <span>Tgl 7</span>
        <span>Tgl 14</span>
        <span>Tgl 21</span>
        <span>Tgl 28</span>
      </div>
    </div>
  );
}

// DualBarChart renders a 6-month dual column comparison of 3D exterior vs interior engagement.
function DualBarChart() {
  const data = [
    { month: "Mei", exterior: 45, interior: 30 },
    { month: "Jun", exterior: 60, interior: 45 },
    { month: "Jul", exterior: 75, interior: 58 },
    { month: "Agu", exterior: 90, interior: 72 },
    { month: "Sep", exterior: 100, interior: 85 },
    { month: "Okt", exterior: 88, interior: 78 },
  ];

  return (
    <div className="w-full h-44 sm:h-52 flex flex-col justify-end pt-4">
      <div className="flex items-end justify-between gap-3 h-36 px-2">
        {data.map((item) => (
          <div key={item.month} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
            <div className="w-full flex items-end justify-center gap-1 h-30">
              {/* Explore House (Dark Column) */}
              <div
                className="w-2.5 sm:w-3.5 bg-neutral-900 rounded-t-xs hover:bg-neutral-700 transition-all cursor-pointer"
                style={{ height: `${item.exterior}%` }}
                title={`${item.month}: ${item.exterior * 10} Explore House`}
              />
              {/* Walk Inside (Light Column) */}
              <div
                className="w-2.5 sm:w-3.5 bg-neutral-300 rounded-t-xs hover:bg-neutral-400 transition-all cursor-pointer"
                style={{ height: `${item.interior}%` }}
                title={`${item.month}: ${item.interior * 10} Walk Inside`}
              />
            </div>
            <span className="text-[10px] text-neutral-400 font-semibold">{item.month}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// DashboardCharts renders the dual analytical charts for portfolio valuation and 3D navigation metrics.
export function DashboardCharts({ summary }: DashboardChartsProps) {
  const [period, setPeriod] = useState("month");
  const portfolioVal = summary?.total_portfolio_value || 0;
  const avgPrice = summary?.average_price || 0;
  const tours = summary?.total_3d_tours || 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* Left Chart: Portfolio Valuation & Sales Trajectory */}
      <div className="lg:col-span-7 bg-white rounded-2xl border border-neutral-200/80 p-5 sm:p-6 shadow-2xs flex flex-col justify-between space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-4">
          <div className="space-y-0.5">
            <span className="text-xs font-semibold text-neutral-400 block">Total Nilai Properti Anda</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-neutral-950 tracking-tight">
                {portfolioVal > 0 ? formatIDR(portfolioVal) : "Rp 0"}
              </span>
              <span className="text-[11px] text-neutral-400 font-medium">
                (Rata-rata: {avgPrice > 0 ? formatIDR(avgPrice) : "Rp 0"})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 text-[11px] font-semibold text-neutral-600 hidden sm:flex">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-neutral-950" />
                <span>Listing Aktif</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-neutral-300" />
                <span>Target Pasar</span>
              </span>
            </div>

            <CustomSelect
              variant="compact"
              align="right"
              options={periodOptions}
              value={period}
              onChange={setPeriod}
            />
          </div>
        </div>

        <AreaSplineChart />

        <div className="p-3 bg-neutral-50/70 rounded-xl border border-neutral-200/60 text-xs text-neutral-600 flex items-center justify-between">
          <span className="text-[11px]">
            <strong>Insight:</strong> Portofolio aktif berada di rentang harga kompetitif wilayah Sentul &amp; Jawa Barat.
          </span>
          <span className="text-[11px] font-bold text-neutral-950 shrink-0 ml-2">Transparan 3D</span>
        </div>
      </div>

      {/* Right Chart: 3D Interaction Activity */}
      <div className="lg:col-span-5 bg-white rounded-2xl border border-neutral-200/80 p-5 sm:p-6 shadow-2xs flex flex-col justify-between space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
          <div className="space-y-0.5">
            <span className="text-xs font-semibold text-neutral-400 block">Aktivitas Tur 3D</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-neutral-950 tracking-tight">
                {tours > 0 ? tours.toLocaleString("id-ID") : "0"}
              </span>
              <span className="text-xs text-neutral-500 font-medium">Interaksi</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-[10px] font-semibold text-neutral-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-xs bg-neutral-900" />
                <span>Eksterior</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-xs bg-neutral-300" />
                <span>Interior</span>
              </span>
            </div>
          </div>
        </div>

        <DualBarChart />

        <div className="p-3 bg-neutral-50/70 rounded-xl border border-neutral-200/60 text-xs text-neutral-600 flex items-center justify-between">
          <span className="text-[11px]">
            <strong>Tips:</strong> Calon pembeli yang melihat bagian dalam rumah 3D hingga 4x lebih sering menghubungi via WhatsApp.
          </span>
        </div>
      </div>
    </div>
  );
}
