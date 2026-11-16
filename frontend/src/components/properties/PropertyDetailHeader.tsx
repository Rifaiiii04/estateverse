"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Share2, MapPin } from "lucide-react";
import { MediaTab, Property } from "@/types/property";
import { Button } from "@/components/ui/Button";
import { MediaTabSwitcher } from "./MediaTabSwitcher";

interface PropertyDetailHeaderProps {
  property: Property;
  onShare: () => void;
  activeTab: MediaTab;
  availableTabs: MediaTab[];
  onSwitchTab: (tab: MediaTab) => void;
}

// PropertyDetailHeader renders a compact top bar with breadcrumbs, property title, address, and quick actions.
export function PropertyDetailHeader({
  property,
  onShare,
  activeTab,
  availableTabs,
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
        <MediaTabSwitcher tabs={availableTabs} active={activeTab} photoCount={photoCount} onSwitch={onSwitchTab} />

        <Button variant="outline" onClick={onShare}>
          <Share2 className="text-primary" aria-hidden="true" />
          <span>Bagikan</span>
        </Button>
      </div>
    </div>
  );
}
