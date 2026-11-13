"use client";

import React, { useState } from "react";
import { Calculator, ShieldCheck, ChevronRight } from "lucide-react";
import { formatIDR } from "@/lib/utils/formatters";

interface PropertyMortgageCardProps {
  price: number;
}

// PropertyMortgageCard provides buyers with an estimated monthly mortgage calculation and buying reassurance.
export function PropertyMortgageCard({ price }: PropertyMortgageCardProps) {
  const [tenorYears, setTenorYears] = useState(20);
  const dpPct = 0.2;
  const principal = price * (1 - dpPct);
  const annualRate = 0.065;
  const monthlyRate = annualRate / 12;
  const totalMonths = tenorYears * 12;

  // Calculates estimated monthly mortgage installment using annuity formula.
  const monthlyPayment = Math.round(
    (principal * (monthlyRate * Math.pow(1 + monthlyRate, totalMonths))) /
      (Math.pow(1 + monthlyRate, totalMonths) - 1)
  );

  return (
    <div className="bg-white p-6 rounded-2xl border border-neutral-200/90 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-sage-600" />
          <h4 className="text-sm font-bold text-neutral-950">Simulasi Cicilan KPR</h4>
        </div>
        <span className="text-[11px] font-semibold text-sage-700 bg-sage-50 border border-sage-200 px-2 py-0.5 rounded-md">DP 20%</span>
      </div>

      <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200/70 space-y-1">
        <span className="text-[11px] text-neutral-500 block">Estimasi Cicilan Bulanan:</span>
        <div className="text-lg sm:text-xl font-extrabold text-sage-700">
          {formatIDR(monthlyPayment)}
          <span className="text-xs font-normal text-neutral-500"> / bulan</span>
        </div>
        <span className="text-[10px] text-neutral-400 block">
          *Perkiraan bunga 6,5% per tahun selama {tenorYears} tahun.
        </span>
      </div>

      <div className="flex items-center gap-2">
        {[10, 15, 20, 25].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTenorYears(t)}
            className={`flex-1 py-1.5 text-[11px] font-semibold rounded-lg border transition-all cursor-pointer ${
              tenorYears === t
                ? "bg-sage-600 text-white border-sage-600 shadow-2xs"
                : "border-neutral-200 text-neutral-600 hover:border-sage-400 hover:text-sage-700"
            }`}
          >
            {t} Thn
          </button>
        ))}
      </div>

      <div className="pt-3 border-t border-neutral-100 flex items-center gap-2 text-xs text-neutral-500">
        <ShieldCheck className="w-4 h-4 text-sage-600 shrink-0" />
        <span>Surat kepemilikan lengkap (SHM) dan siap proses jual beli.</span>
      </div>
    </div>
  );
}
