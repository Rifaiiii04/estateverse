"use client";

import React from "react";
import { CheckCircle2, Sparkles } from "lucide-react";

interface PropertyBenefitsCardProps {
  benefits?: string[];
}

// PropertyBenefitsCard displays the property's location advantages and custom seller highlights.
export function PropertyBenefitsCard({ benefits }: PropertyBenefitsCardProps) {
  // Shows only what the seller actually wrote; listings without highlights render nothing.
  if (!benefits || benefits.length === 0) return null;
  const displayBenefits = benefits;

  return (
    <div className="bg-white p-5 rounded-2xl border border-neutral-200/90 shadow-2xs space-y-3.5">
      <div className="flex items-center justify-between border-b border-neutral-100 pb-2.5">
        <h3 className="text-sm sm:text-base font-bold text-neutral-950 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-sage-600" />
          <span>Keunggulan Lokasi &amp; Benefit Rumah</span>
        </h3>
        <span className="text-[11px] font-semibold text-sage-700 bg-sage-50 border border-sage-200 px-2.5 py-0.5 rounded-lg">
          {displayBenefits.length} Keunggulan
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {displayBenefits.map((item, idx) => (
          <div
            key={`${item}-${idx}`}
            className="flex items-center gap-2.5 p-2.5 rounded-xl bg-neutral-50/80 border border-neutral-200/70 text-xs sm:text-[13px] font-semibold text-neutral-800"
          >
            <CheckCircle2 className="w-4 h-4 text-sage-600 shrink-0" />
            <span className="leading-snug">{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
