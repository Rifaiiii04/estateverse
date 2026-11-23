"use client";

import { useEffect, useRef } from "react";
import { Camera, ChevronRight } from "lucide-react";
import { captureStage, guideHint } from "@/lib/capture/captureGuide";
import { directionFromAngles, type CaptureTarget } from "@/lib/capture/captureTargets";
import type { LiveSweep } from "@/lib/capture/sweepAcquisition";
import { SweepThumbnail } from "./SweepThumbnail";
import { SWEEP_AIM_DEG } from "../../../../shared/captureSweep.ts";

const AIM_COSINE = Math.cos(SWEEP_AIM_DEG * Math.PI / 180);

interface OverlayProps {
  targets: CaptureTarget[];
  count: number;
  live: LiveSweep;
  preview: string;
  error: string;
}

// Keeps directional feedback in sync with the next stretch of the sweep between React state updates.
function useSweepArrow(live: LiveSweep, targets: CaptureTarget[], target: CaptureTarget, error: string) {
  const arrow = useRef<HTMLDivElement>(null);
  const hint = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    let frame = 0;
    // Points toward the remaining camera rotation and updates text only when the guidance changes.
    const draw = () => {
      frame = requestAnimationFrame(draw);
      const sample = live.sample;
      if (!sample || !arrow.current || !hint.current) return;
      const dir = directionFromAngles(target.yaw, target.pitch).applyQuaternion(sample.quaternion.clone().invert());
      const aligned = -dir.z >= AIM_COSINE;
      const degrees = aligned ? 0 : Math.atan2(-dir.y, dir.x) * 180 / Math.PI;
      arrow.current.style.transform = `rotate(${degrees}deg)`;
      const message = guideHint(targets, target, { quaternion: sample.quaternion, speed: live.speed });
      const stale = performance.now() - sample.timestamp > 3000;
      const text = stale ? "Gerakkan HP sedikit agar sensor arah kembali aktif." : aligned && error ? error : message;
      if (hint.current.textContent !== text) hint.current.textContent = text;
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [live, targets, target, error]);
  return { arrow, hint };
}

// Shows the path direction above a thumbnail of the images already recorded on the sphere.
export function CaptureOverlay({ targets, count, live, preview, error }: OverlayProps) {
  const target = targets[Math.min(count, targets.length - 1)];
  const stage = captureStage(targets, target);
  const { arrow, hint } = useSweepArrow(live, targets, target, error);
  const calibrating = targets.length === 3;
  return (
    <div className="pointer-events-none absolute inset-0 text-white">
      <div className="absolute top-5 left-4 flex items-center gap-2 rounded-full bg-black/65 px-4 py-2 text-sm font-semibold">
        <Camera className="size-4" aria-hidden="true" /> Panorama · {calibrating ? "Ukur lensa" : stage.label}
      </div>
      <div className="absolute inset-x-6 top-1/2 flex -translate-y-1/2 items-center justify-center gap-3" aria-hidden="true">
        <span className="h-px w-16 bg-white/80" />
        <div ref={arrow} className="rounded-full bg-black/55 p-1 text-white"><ChevronRight className="size-7" /></div>
        <span className="h-px w-16 bg-white/80" />
      </div>
      <div className="absolute inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] mx-auto max-w-sm rounded-2xl bg-black/75 p-3">
        <p ref={hint} role="status" className="mb-2 text-center text-sm font-medium">Arahkan HP lurus ke depan</p>
        <SweepThumbnail preview={preview} />
        <div className="mt-2 flex justify-between gap-2 text-xs">
          <span>{calibrating ? "Pengukuran awal" : `Sapuan ${stage.index + 1} dari ${stage.total}`}</span>
          <span>{count}/{targets.length} bagian</span>
        </div>
      </div>
    </div>
  );
}
