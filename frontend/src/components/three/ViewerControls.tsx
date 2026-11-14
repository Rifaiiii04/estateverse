"use client";

import React from "react";
import { Box, Footprints, Map, Layers, RotateCcw, Maximize, Minimize } from "lucide-react";
import { useToast } from "@/context/ToastContext";

export type ViewMode = "explore" | "walk" | "estate";

interface ViewerControlsProps {
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  roofOff: boolean;
  onToggleRoof: () => void;
  onResetCamera: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

// ViewerControls provides a responsive architectural HUD overlay with 60-30-10 sage mode selectors.
export function ViewerControls({
  mode,
  onModeChange,
  roofOff,
  onToggleRoof,
  onResetCamera,
  isFullscreen = false,
  onToggleFullscreen,
}: ViewerControlsProps) {
  const { toast } = useToast();

  // Displays preview status toast for upcoming estate scale exploration feature.
  const handleEstateClick = () => {
    toast.info(
      "Fitur Lihat Lingkungan Sekitar sedang dalam pengembangan untuk pembaruan berikutnya.",
      "Fitur Segera Hadir"
    );
  };

  return (
    <div className="absolute top-3 left-3 right-3 sm:top-4 sm:left-4 sm:right-4 flex flex-wrap items-center justify-between gap-2 pointer-events-none z-10">
      {/* Primary Mode Switcher */}
      <div className="flex items-center gap-1 bg-white/95 backdrop-blur-md p-1 rounded-2xl border border-neutral-200/90 shadow-md pointer-events-auto">
        <button
          type="button"
          onClick={() => onModeChange("explore")}
          className={`px-2.5 sm:px-3.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
            mode === "explore"
              ? "bg-sage-600 text-white shadow-xs"
              : "text-neutral-600 hover:text-sage-700 hover:bg-sage-50"
          }`}
        >
          <Box className="w-3.5 h-3.5" />
          <span>Lihat Luar 360°</span>
        </button>

        <button
          type="button"
          onClick={() => onModeChange("walk")}
          className={`px-2.5 sm:px-3.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
            mode === "walk"
              ? "bg-sage-600 text-white shadow-xs"
              : "text-neutral-600 hover:text-sage-700 hover:bg-sage-50"
          }`}
        >
          <Footprints className="w-3.5 h-3.5" />
          <span>Masuk ke Dalam</span>
        </button>

        <button
          type="button"
          onClick={handleEstateClick}
          className="hidden md:flex px-2.5 py-1.5 rounded-xl text-xs font-medium text-neutral-500 hover:text-neutral-600 transition-colors items-center gap-1.5 cursor-not-allowed"
          title="Lihat Lingkungan Sekitar (Segera Hadir)"
        >
          <Map className="w-3.5 h-3.5" />
          <span>Lihat Lingkungan</span>
          <span className="text-[10px] bg-sage-50 text-sage-700 border border-sage-200 px-1.5 py-0.5 rounded-md font-semibold">
            Segera
          </span>
        </button>
      </div>

      {/* Auxiliary Action Tools */}
      <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto">
        {mode === "explore" && (
          <button
            type="button"
            onClick={onToggleRoof}
            className={`text-[11px] sm:text-xs font-semibold px-2.5 sm:px-3.5 py-1.5 rounded-xl border backdrop-blur-md shadow-md transition-all flex items-center gap-1.5 cursor-pointer ${
              roofOff
                ? "bg-sage-600 text-white border-sage-700 ring-2 ring-sage-600/20"
                : "bg-white/95 text-neutral-800 border-neutral-200/90 hover:border-sage-400 hover:bg-sage-50/50"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">{roofOff ? "Tutup Atap" : "Buka Atap"}</span>
            <span className="hidden sm:inline">{roofOff ? "" : "(Lihat Denah)"}</span>
          </button>
        )}

        <button
          type="button"
          onClick={onResetCamera}
          className="text-[11px] sm:text-xs font-semibold bg-white/95 text-neutral-800 border border-neutral-200/90 hover:border-sage-400 hover:bg-sage-50/50 backdrop-blur-md shadow-md rounded-xl px-2.5 sm:px-3 py-1.5 transition-all flex items-center gap-1.5 cursor-pointer"
          title="Kembalikan ke Posisi Awal"
        >
          <RotateCcw className="w-3.5 h-3.5 text-sage-600" />
          <span className="hidden sm:inline">Posisi Awal</span>
        </button>

        {onToggleFullscreen && (
          <button
            type="button"
            onClick={onToggleFullscreen}
            className="text-xs font-semibold bg-white/95 text-neutral-800 border border-neutral-200/90 hover:border-sage-400 hover:bg-sage-50/50 backdrop-blur-md shadow-md rounded-xl p-1.5 transition-all flex items-center justify-center cursor-pointer"
            title={isFullscreen ? "Keluar Layar Penuh" : "Tampilan Layar Penuh"}
          >
            {isFullscreen ? (
              <Minimize className="w-4 h-4 text-sage-700" />
            ) : (
              <Maximize className="w-4 h-4 text-sage-700" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
