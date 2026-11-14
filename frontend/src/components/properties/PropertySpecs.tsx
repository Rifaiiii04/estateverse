"use client";

import React from "react";
import { Maximize2, Building2, Bed, Bath, Layers } from "lucide-react";
import { formatArea } from "@/lib/utils/formatters";

interface PropertySpecsProps {
  landArea: number;
  buildingArea: number;
  bedrooms: number;
  bathrooms: number;
  floors: number;
}

// PropertySpecs renders property key metrics in a compact horizontal grid with sage icons.
export function PropertySpecs({
  landArea,
  buildingArea,
  bedrooms,
  bathrooms,
  floors,
}: PropertySpecsProps) {
  const specs = [
    { icon: Maximize2, label: "Luas Tanah", value: formatArea(landArea) },
    { icon: Building2, label: "Luas Bangunan", value: formatArea(buildingArea) },
    { icon: Bed, label: "Kamar Tidur", value: `${bedrooms} KT` },
    { icon: Bath, label: "Kamar Mandi", value: `${bathrooms} KM` },
    { icon: Layers, label: "Jumlah Lantai", value: `${floors} Lantai` },
  ];

  return (
    <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-neutral-200/90 shadow-2xs grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {specs.map((item, idx) => {
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className={`flex items-center gap-3 px-2 py-1 ${
              idx < specs.length - 1 ? "lg:border-r lg:border-neutral-200/70" : ""
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-sage-50 border border-sage-200/70 flex items-center justify-center shrink-0 text-sage-700">
              <Icon className="w-4 h-4 text-sage-600" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider block truncate">
                {item.label}
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-neutral-950 block truncate">
                {item.value}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
