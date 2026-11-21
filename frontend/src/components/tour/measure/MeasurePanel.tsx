"use client";

import React from "react";
import { Armchair, MoveVertical, RotateCw, Ruler, Trash2 } from "lucide-react";
import { formatMeters } from "@/lib/measure/roomGeometry";
import { FURNITURE_PRESETS } from "./furniturePresets";
import { measuredDistance, MeasureMode, MeasureState } from "./useMeasureTool";

interface MeasurePanelProps {
  state: MeasureState;
  cameraHeightCm: number;
  calibrated: boolean;
  raised: boolean;
  onMode: (mode: MeasureMode) => void;
  onPreset: (presetId: string) => void;
  onRotate: () => void;
  onClear: () => void;
}

const MODES: { mode: MeasureMode; label: string; icon: typeof Ruler }[] = [
  { mode: "distance", label: "Jarak", icon: Ruler },
  { mode: "height", label: "Tinggi", icon: MoveVertical },
  { mode: "furniture", label: "Furnitur", icon: Armchair },
];

// MeasurePanel is the compact control strip for measuring distances, heights, and trying furniture in the tour.
export function MeasurePanel(props: MeasurePanelProps) {
  const { state, cameraHeightCm, calibrated, raised, onMode, onPreset, onRotate, onClear } = props;
  return (
    <div className={`absolute inset-x-3 ${raised ? "bottom-16" : "bottom-3"} space-y-1.5 rounded-xl bg-black/75 p-2.5 text-white sm:inset-x-auto sm:left-3 sm:w-72`}>
      <div role="group" aria-label="Pilih alat ukur" className="grid grid-cols-3 gap-1">
        {MODES.map(({ mode, label, icon: Icon }) => (
          <button key={mode} type="button" onClick={() => onMode(mode)} aria-pressed={state.mode === mode}
            className={`flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-lg text-[11px] font-semibold cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${state.mode === mode ? "bg-sage-600" : "bg-white/10 hover:bg-white/20"}`}>
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>
      {state.mode === "furniture" && (
        <select value={state.presetId} onChange={(e) => onPreset(e.target.value)} aria-label="Pilih furnitur"
          className="w-full rounded-lg bg-white/10 px-2 py-2 text-xs text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
          {FURNITURE_PRESETS.map((p) => <option key={p.id} value={p.id} className="text-neutral-900">{p.label}</option>)}
        </select>
      )}
      <div className="flex items-center justify-between gap-2">
        <p aria-live="polite" className="text-sm font-bold">{resultText(state)}</p>
        <div className="flex shrink-0 gap-1.5">
          {state.mode === "furniture" && <PanelButton label="Putar" icon={RotateCw} onClick={onRotate} />}
          <PanelButton label="Hapus" icon={Trash2} onClick={onClear} />
        </div>
      </div>
      <p className="text-[11px] leading-snug text-white/85">{state.hint}</p>
      <p className="text-[10px] leading-snug text-white/65">
        Perkiraan dari panorama · tinggi kamera {cameraHeightCm} cm {calibrated ? "(diatur penjual)" : "(standar, belum dikalibrasi)"}
      </p>
    </div>
  );
}

// PanelButton is a small labelled action button inside the measuring panel.
function PanelButton({ label, icon: Icon, onClick }: { label: string; icon: typeof Ruler; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-white/10 px-2.5 text-xs font-semibold cursor-pointer hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </button>
  );
}

// resultText summarizes the current measurement in one line.
function resultText(state: MeasureState): string {
  const distance = measuredDistance(state);
  if (distance !== null) return `Jarak ±${formatMeters(distance)}`;
  if (state.mode === "height" && state.heightM !== null) return `Tinggi ±${formatMeters(state.heightM)}`;
  if (state.mode === "furniture") return `${state.furniture.length} furnitur di ruangan`;
  return "Belum ada ukuran";
}
