"use client";

import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { CaptureResult, TourRoom } from "@/types/tour";
import { captureStage } from "@/lib/capture/captureGuide";
import type { CaptureTarget } from "@/lib/capture/captureTargets";
import { useSphereCapture } from "@/lib/capture/useSphereCapture";
import { CaptureOverlay } from "./CaptureOverlay";
import { CaptureIntroPanel, CaptureReviewPanel } from "./CapturePanels";

interface SphereCaptureModalProps {
  defaultRoomName: string;
  onClose: () => void;
  /** Upload mode (edit page): frames are sent to this property immediately. */
  propertyId?: number;
  onUploaded?: (room: TourRoom) => void;
  /** Local mode (add page): frames are handed back and uploaded once the property is saved. */
  onCaptured?: (name: string, capture: CaptureResult) => void;
}

// SphereCaptureModal is the full-screen guided "Walk Inside 360°" recorder, rendered outside any parent form.
export function SphereCaptureModal({ defaultRoomName, onClose, propertyId, onUploaded, onCaptured }: SphereCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const capture = useSphereCapture(videoRef);
  const { phase, doneIds, targets } = capture;
  const mode = onCaptured ? "local" : "upload";
  const showCamera = phase === "starting" || phase === "capturing" || phase === "calibrating";

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  // Stops devices before leaving the recorder.
  const close = () => {
    capture.stop();
    onClose();
  };

  // Saves the room locally or uploads it, depending on the mode.
  const handleSave = async (name: string) => {
    if (onCaptured) {
      onCaptured(name, capture.collect());
      return;
    }
    if (!propertyId) return;
    const room = await capture.upload(propertyId, name);
    if (room) onUploaded?.(room);
  };

  // Clears the finished room and opens the camera again for the next room (same tap keeps iOS permissions).
  const recordAnother = () => {
    capture.reset();
    void capture.start();
  };

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Perekam Walk Inside 360°" className="fixed inset-0 z-[100] bg-black">
      <video
        ref={videoRef}
        className={`absolute inset-0 w-full h-full object-contain ${showCamera ? "" : "invisible"}`}
        playsInline
        muted
        aria-hidden="true"
      />

      {phase === "capturing" && (
        <>
          <CaptureOverlay
            targets={targets}
            doneIds={doneIds}
            sampleRef={capture.sampleRef}
            speedRef={capture.speedRef}
            steadyRef={capture.steadyRef}
          />
          <div className="absolute top-4 left-4 bg-black/60 text-white text-sm font-bold rounded-xl px-3 py-2">
            {stageText(targets, doneIds)}{doneIds.size}/{targets.length} titik
          </div>
          {capture.error && (
            <p role="status" className="absolute top-20 inset-x-4 rounded-xl bg-amber-950/90 p-3 text-sm text-white">
              {capture.error}
            </p>
          )}
        </>
      )}

      {(phase === "intro" || phase === "starting" || phase === "error") && (
        <CaptureIntroPanel onStart={capture.start} isStarting={phase === "starting"} error={capture.error} />
      )}

      {phase === "calibrating" && <div role="status" className="absolute inset-0 flex items-center justify-center bg-black/70 p-8 text-center text-white">Mengukur lensa dan menyusun urutan foto berikutnya…</div>}

      {(phase === "review" || phase === "uploading" || phase === "done") && (
        <CaptureReviewPanel
          defaultName={defaultRoomName}
          mode={mode}
          phase={phase}
          progress={capture.uploadProgress}
          error={capture.error}
          onSave={handleSave}
          onRetake={capture.reset}
          onRecordAnother={recordAnother}
          onClose={close}
        />
      )}

      {phase !== "done" && phase !== "uploading" && (
        <button
          type="button"
          onClick={close}
          aria-label="Tutup perekam"
          className="absolute top-4 right-4 w-11 h-11 rounded-full bg-black/60 text-white flex items-center justify-center"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      )}
    </div>,
    document.body
  );
}

// stageText labels the current sweep of the path, e.g. "Tahap 2/3 · Atas · ", or the calibration step.
function stageText(targets: CaptureTarget[], doneIds: ReadonlySet<number>): string {
  if (targets.length === 3) return "Kalibrasi kamera · ";
  const next = targets.find((t) => !doneIds.has(t.id));
  if (!next) return "";
  const stage = captureStage(targets, next);
  return `Tahap ${stage.index + 1}/${stage.total} · ${stage.label} · `;
}
