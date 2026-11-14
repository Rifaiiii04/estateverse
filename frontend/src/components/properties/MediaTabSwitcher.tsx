"use client";

import React from "react";
import { Box, Camera, Compass } from "lucide-react";
import type { MediaTab } from "@/types/property";

interface MediaTabSwitcherProps {
  tabs: MediaTab[];
  active: MediaTab;
  photoCount: number;
  onSwitch: (tab: MediaTab) => void;
}

// MediaTabSwitcher toggles between photos, the 360° tour, and the 3D model, showing only tabs with content.
export function MediaTabSwitcher({ tabs, active, photoCount, onSwitch }: MediaTabSwitcherProps) {
  const meta: Record<MediaTab, { label: string; icon: React.ReactNode }> = {
    photos: { label: `Foto (${photoCount})`, icon: <Camera className="w-3.5 h-3.5" aria-hidden="true" /> },
    tour: { label: "Walk Inside 360°", icon: <Compass className="w-3.5 h-3.5" aria-hidden="true" /> },
    "3d": { label: "Model 3D", icon: <Box className="w-3.5 h-3.5" aria-hidden="true" /> },
  };
  if (tabs.length < 2) return null;
  return (
    <div role="tablist" aria-label="Pilih tampilan properti" className="h-9 bg-neutral-100 p-1 rounded-xl border border-neutral-200/80 inline-flex items-center text-xs font-semibold">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          role="tab"
          aria-selected={active === tab}
          onClick={() => onSwitch(tab)}
          className={`h-full px-3 rounded-lg transition-all cursor-pointer inline-flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-600 ${
            active === tab ? "bg-sage-600 text-white font-bold shadow-2xs" : "text-neutral-700 hover:text-sage-800"
          }`}
        >
          {meta[tab].icon}
          <span>{meta[tab].label}</span>
        </button>
      ))}
    </div>
  );
}
