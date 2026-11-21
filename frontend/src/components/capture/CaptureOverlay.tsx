"use client";

import React, { RefObject, useEffect, useRef } from "react";
import { Quaternion, Vector3 } from "three";
import { guideHint } from "@/lib/capture/captureGuide";
import { CaptureTarget, nextPending } from "@/lib/capture/captureTargets";
import type { OrientationSample } from "@/lib/capture/orientation";
import type { SteadyState } from "@/lib/capture/useSphereCapture";
import { drawGuideArrow, drawMiniMap, drawReticle, drawTargets } from "./overlayDrawing";

interface CaptureOverlayProps {
  targets: CaptureTarget[];
  doneIds: ReadonlySet<number>;
  sampleRef: RefObject<OrientationSample | null>;
  speedRef: RefObject<number>;
  steadyRef: RefObject<SteadyState | null>;
}

// CaptureOverlay draws aiming guides over the live camera at display refresh rate without React re-renders.
export function CaptureOverlay({ targets, doneIds, sampleRef, speedRef, steadyRef }: CaptureOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    let frame = 0;
    // Redraws guides each animation frame from the latest sensor sample.
    const draw = () => {
      frame = requestAnimationFrame(draw);
      const canvas = canvasRef.current;
      const sample = sampleRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx || !sample) return;
      resizeCanvas(canvas);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const forward = new Vector3(0, 0, -1).applyQuaternion(sample.quaternion);
      const nearest = nextPending(targets, doneIds, forward);
      const state = {
        quaternion: sample.quaternion,
        targets,
        done: doneIds,
        nearestId: nearest?.target.id ?? null,
        steadySince: steadyRef.current?.since ?? null,
        now: sample.timestamp,
      };
      ctx.clearRect(0, 0, w, h);
      drawTargets(ctx, state, w, h);
      drawGuideArrow(ctx, state, w, h);
      drawReticle(ctx, state, w, h);
      drawMiniMap(ctx, state, sample.yaw, sample.pitch, w);
      updateHint(hintRef.current, targets, nearest?.target ?? null, sample.quaternion, speedRef.current ?? 0);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [doneIds, sampleRef, speedRef, steadyRef, targets]);

  return (
    <>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true" />
      <p
        ref={hintRef}
        role="status"
        aria-live="polite"
        className="absolute bottom-28 inset-x-4 text-center text-sm font-semibold text-white bg-black/55 rounded-xl px-4 py-3"
      />
    </>
  );
}

// resizeCanvas keeps the canvas backing store matched to its CSS size and device pixel ratio.
function resizeCanvas(canvas: HTMLCanvasElement) {
  const dpr = window.devicePixelRatio || 1;
  const w = Math.round(canvas.clientWidth * dpr);
  const h = Math.round(canvas.clientHeight * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  canvas.getContext("2d")?.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// updateHint writes the current instruction directly into the DOM to avoid 60 fps state updates.
function updateHint(
  el: HTMLParagraphElement | null,
  targets: CaptureTarget[],
  target: CaptureTarget | null,
  pose: Quaternion,
  speed: number
) {
  if (!el) return;
  const text = target ? guideHint(targets, target, pose, speed) : "Semua titik sudah terekam!";
  if (el.textContent !== text) el.textContent = text;
}
