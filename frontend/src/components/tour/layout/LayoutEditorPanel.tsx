"use client";

import React from "react";
import { Ruler, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatArea, formatMeters } from "@/lib/measure/roomGeometry";
import { FloorPlanSketch } from "./FloorPlanSketch";
import type { LayoutEditor } from "./useLayoutEditor";

interface LayoutEditorPanelProps {
  editor: LayoutEditor;
  roomName: string;
  isSaving: boolean;
  onSave: () => void;
}

// LayoutEditorPanel holds the camera-height, calibration, and corner-tracing controls under the panorama.
export function LayoutEditorPanel({ editor, roomName, isSaving, onSave }: LayoutEditorPanelProps) {
  const { summary } = editor;
  const heightValid = editor.heightCm >= 50 && editor.heightCm <= 250;
  return (
    <div className="bg-white p-4 space-y-3 max-h-[45vh] overflow-y-auto">
      <div className="flex flex-wrap items-end gap-3">
        <NumberField id="layout-height" label="Tinggi HP saat merekam (cm)" value={editor.heightCm} onChange={editor.setHeightCm} />
        <div role="group" aria-label="Langkah pengukuran" className="flex gap-1.5">
          <Button type="button" size="sm" variant={editor.step === "corners" ? "default" : "outline"} onClick={() => editor.setStep("corners")}>Sudut lantai</Button>
          <Button type="button" size="sm" variant={editor.step === "calibrate" ? "default" : "outline"} onClick={() => editor.setStep("calibrate")}>
            <Ruler aria-hidden="true" /> Kalibrasi
          </Button>
        </div>
      </div>
      <p className="text-sm text-neutral-700" aria-live="polite">{editor.hint}</p>
      {editor.step === "calibrate" ? <CalibrationRow editor={editor} /> : <CornerRow editor={editor} />}
      <div className="flex flex-wrap items-center gap-4">
        <FloorPlanSketch points={editor.floorCorners} title={`Denah ${roomName}`} className="w-36 h-36 shrink-0" />
        <div className="space-y-1 text-sm">
          {summary ? (
            <>
              <p className="font-bold text-neutral-950">Luas ±{formatArea(summary.areaM2)}</p>
              {summary.sides && <p className="text-neutral-700">{formatMeters(summary.sides[0])} × {formatMeters(summary.sides[1])}</p>}
            </>
          ) : (
            <p className="text-neutral-600">Tandai minimal 3 sudut untuk menghitung luas.</p>
          )}
          <p className="text-xs text-neutral-500">Hasil berupa perkiraan. Kalibrasi dengan benda berukuran pasti membuatnya lebih akurat.</p>
        </div>
      </div>
      <Button type="button" onClick={onSave} isLoading={isSaving} disabled={!heightValid || (editor.corners.length > 0 && editor.corners.length < 3)}>
        Simpan Ukuran Ruangan
      </Button>
    </div>
  );
}

// CornerRow shows how many corners are traced and lets the seller undo or restart.
function CornerRow({ editor }: { editor: LayoutEditor }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="font-semibold">{editor.corners.length} sudut</span>
      <Button type="button" size="sm" variant="outline" onClick={editor.undoCorner} disabled={editor.corners.length === 0}>
        <Undo2 aria-hidden="true" /> Batalkan
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={editor.clearCorners} disabled={editor.corners.length === 0}>Ulangi</Button>
    </div>
  );
}

// CalibrationRow compares a measured reference length with its real size and applies the correction.
function CalibrationRow({ editor }: { editor: LayoutEditor }) {
  const measured = editor.measuredReferenceM;
  return (
    <div className="flex flex-wrap items-end gap-3 text-sm">
      <p className="min-w-[9rem]">Terukur: <span className="font-bold">{measured === null ? "—" : formatMeters(measured)}</span></p>
      <NumberField id="layout-reference" label="Ukuran asli (cm)" value={editor.referenceCm} onChange={editor.setReferenceCm} />
      <Button type="button" size="sm" onClick={editor.applyCalibration} disabled={measured === null || editor.referenceCm <= 0}>Terapkan</Button>
    </div>
  );
}

// NumberField is a compact labelled numeric input.
function NumberField({ id, label, value, onChange }: { id: string; label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label htmlFor={id} className="space-y-1 text-xs font-semibold text-neutral-700">
      <span className="block">{label}</span>
      <input id={id} type="number" inputMode="numeric" value={value || ""} onChange={(e) => onChange(Number(e.target.value))}
        className="w-32 rounded-lg border border-neutral-300 px-2.5 py-2 text-sm text-neutral-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-500" />
    </label>
  );
}
