"use client";

import React from "react";
import { Box, Camera, Compass } from "lucide-react";
import type { MediaTab } from "@/types/property";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs";

interface MediaTabSwitcherProps {
  tabs: MediaTab[];
  active: MediaTab;
  photoCount: number;
  onSwitch: (tab: MediaTab) => void;
}

// MediaTabSwitcher toggles between photos, the 360° tour, and the 3D model, showing only tabs with content.
export function MediaTabSwitcher({ tabs, active, photoCount, onSwitch }: MediaTabSwitcherProps) {
  const meta: Record<MediaTab, { label: string; icon: React.ReactNode }> = {
    photos: { label: `Foto (${photoCount})`, icon: <Camera aria-hidden="true" /> },
    tour: { label: "Walk Inside 360°", icon: <Compass aria-hidden="true" /> },
    "3d": { label: "Model 3D", icon: <Box aria-hidden="true" /> },
  };
  if (tabs.length < 2) return null;
  return (
    <Tabs value={active} onValueChange={(value) => onSwitch(value as MediaTab)}>
      <TabsList aria-label="Pilih tampilan properti" className="max-w-full overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <TabsTrigger key={tab} value={tab} className="px-3 py-2">
            {meta[tab].icon}
            <span>{meta[tab].label}</span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
