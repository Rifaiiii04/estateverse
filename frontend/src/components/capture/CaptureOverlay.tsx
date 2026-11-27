"use client";

import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Camera, Focus } from "lucide-react";
import { SweepThumbnail } from "./SweepThumbnail";

interface OverlayProps {
  index: number;
  total: number;
  pitch: number;
  progress: number;
  preview: string;
  hint: string;
}

// Shows the growing panorama strip and the elevation needed to complete the current turn.
export function CaptureOverlay({ index, total, pitch, progress, preview, hint }: OverlayProps) {
  const Arrow = hint.startsWith("Angkat") ? ArrowUp : hint.startsWith("Turunkan") ? ArrowDown
    : hint.includes("ke kiri") ? ArrowLeft : hint.includes("ke kanan") ? ArrowRight : Focus;
  const stage = pitch === 0 ? "Setinggi mata" : pitch > 0 ? "Bagian atas" : "Bagian bawah";
  const degrees = Math.min(360, Math.max(0, Math.round(progress * 360)));
  return (
    <div className="pointer-events-none absolute inset-0 text-white">
      <div className="absolute top-5 left-4 flex items-center gap-2 rounded-full bg-black/65 px-4 py-2 text-sm font-semibold">
        <Camera className="size-4" aria-hidden="true" /> Panorama · {stage}
      </div>
      <div className="absolute inset-x-6 top-1/2 flex -translate-y-1/2 items-center justify-center gap-3" aria-hidden="true">
        <span className="h-px w-16 bg-white/80" />
        <div className="rounded-full bg-black/55 p-1 text-white"><Arrow className="size-7" /></div>
        <span className="h-px w-16 bg-white/80" />
      </div>
      <div className="absolute inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] mx-auto max-w-sm rounded-2xl bg-black/75 p-3">
        <p role="status" className="mb-2 text-center text-sm font-medium">{hint}</p>
        <SweepThumbnail preview={preview} />
        <div role="progressbar" aria-label="Cakupan putaran" aria-valuemin={0} aria-valuemax={360} aria-valuenow={degrees}
          className="mt-2 h-1 overflow-hidden rounded-full bg-white/20">
          <div className="h-full bg-sage-300 transition-[width]" style={{ width: `${degrees / 3.6}%` }} />
        </div>
        <div className="mt-2 flex justify-between gap-2 text-xs">
          <span>{total ? `Panorama ${index + 1} dari ${total}` : "Mengukur lensa saat kamera bergerak"}</span>
          <span>{degrees}° / 360°</span>
        </div>
      </div>
    </div>
  );
}
