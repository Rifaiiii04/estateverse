"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Share2, MapPin, Box, Camera } from "lucide-react";
import { Property } from "@/types/property";

interface PropertyDetailHeaderProps {
  property: Property;
  onShare: () => void;
  activeTab: "photos" | "3d";
  onSwitchTab: (tab: "photos" | "3d") => void;
}

// PropertyDetailHeader renders a compact top bar with breadcrumbs, property title, address, and quick actions.
export function PropertyDetailHeader({
  property,
  onShare,
  activeTab,
  onSwitchTab,
}: PropertyDetailHeaderProps) {
  const photoCount = property.images?.length || 1;

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-neutral-200/80">
      <div className="space-y-1.5 min-w-0">
        {/* Compact Breadcrumbs & Type Badge */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
          <Link
            href="/properties"
            className="hover:text-sage-700 transition-colors inline-flex items-center gap-1 font-semibold text-neutral-700"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Katalog Properti</span>
          </Link>
          <span>/</span>
          <span className="capitalize">{property.city}</span>
          <span>/</span>
          <span className="px-2 py-0.5 rounded-md bg-sage-50 border border-sage-200 text-sage-800 text-[11px] font-bold uppercase tracking-wide">
            {property.property_type || "House"}
          </span>
        </div>

        {/* Title & Full Address */}
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-neutral-950 tracking-tight truncate">
          {property.title}
        </h1>

        <p className="text-xs sm:text-[13px] text-neutral-500 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-sage-600 shrink-0" />
          <span className="truncate">
            {property.address}, {property.city}, {property.province}
          </span>
        </p>
      </div>

      {/* Quick Media Switcher & Share Button */}
      <div className="flex flex-wrap items-center gap-2 self-start lg:self-center shrink-0">
        <div className="h-9 bg-neutral-100 p-1 rounded-xl border border-neutral-200/80 inline-flex items-center text-xs font-semibold">
          <button
            type="button"
            onClick={() => onSwitchTab("photos")}
            className={`h-full px-3 rounded-lg transition-all cursor-pointer inline-flex items-center gap-1.5 ${
              activeTab === "photos"
                ? "bg-white text-neutral-950 font-bold shadow-2xs"
                : "text-neutral-600 hover:text-neutral-950"
            }`}
          >
            <Camera className="w-3.5 h-3.5 text-sage-600" />
            <span>Foto ({photoCount})</span>
          </button>

          <button
            type="button"
            onClick={() => onSwitchTab("3d")}
            className={`h-full px-3 rounded-lg transition-all cursor-pointer inline-flex items-center gap-1.5 ${
              activeTab === "3d"
                ? "bg-sage-600 text-white font-bold shadow-2xs"
                : "text-neutral-600 hover:text-sage-700"
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>Lihat Tampilan 3D</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onShare}
          className="h-9 inline-flex items-center gap-1.5 px-3.5 rounded-xl border border-neutral-200 hover:border-sage-500 hover:text-sage-700 text-neutral-700 text-xs font-semibold transition-colors cursor-pointer bg-white shadow-2xs"
        >
          <Share2 className="w-3.5 h-3.5 text-sage-600" />
          <span>Bagikan</span>
        </button>
      </div>
    </div>
  );
}
