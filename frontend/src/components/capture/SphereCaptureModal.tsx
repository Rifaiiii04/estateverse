"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { CaptureResult, TourRoom } from "@/types/tour";
import { useSphereCapture } from "@/lib/capture/useSphereCapture";
import { CaptureOverlay } from "./CaptureOverlay";
import { CaptureIntroPanel, CaptureReviewPanel } from "./CapturePanels";

interface SphereCaptureModalProps {
  defaultRoomName: string;
  onClose: () => void;
  propertyId?: number;
  onUploaded?: (room: TourRoom) => void;
  onCaptured?: (name: string, capture: CaptureResult) => void;
}

// Shows the controls belonging to the current step of a room panorama.
function CaptureContents(props: SphereCaptureModalProps & { capture: ReturnType<typeof useSphereCapture> }) {
  const { capture, defaultRoomName, onCaptured, propertyId, onUploaded, onClose } = props;
  const { phase } = capture;
  // Saves the room to the property draft or starts stitching on an existing property.
  const save = async (name: string) => {
    if (onCaptured) return onCaptured(name, capture.collect());
    if (!propertyId) return;
    const room = await capture.upload(propertyId, name);
    if (room) onUploaded?.(room);
  };
  if (phase === "capturing") return <CaptureOverlay {...capture} />;
  if (phase === "calibrating" || phase === "calibrationError") return (
    <div role="status" className="absolute inset-0 flex flex-col gap-4 items-center justify-center bg-black/75 p-8 text-center text-white">
      <p>{phase === "calibrating" ? "Berhenti sebentar. Kamera sedang mengukur lensa untuk sapuan berikutnya…" : capture.error}</p>
      {phase === "calibrationError" && <button type="button" onClick={capture.retryCalibration}
        className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-neutral-900">Ulangi pengukuran lensa</button>}
    </div>
  );
  if (phase === "intro" || phase === "starting" || phase === "error") {
    return <CaptureIntroPanel onStart={capture.start} isStarting={phase === "starting"} error={capture.error} />;
  }
  return <CaptureReviewPanel defaultName={defaultRoomName} mode={onCaptured ? "local" : "upload"}
    phase={phase} progress={capture.uploadProgress} preview={capture.preview} error={capture.error}
    onSave={save} onRetake={capture.reset} onRecordAnother={() => void capture.start()} onClose={onClose} />;
}

// Hosts the rear camera and panorama controls outside the seller's property form.
export function SphereCaptureModal(props: SphereCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const capture = useSphereCapture(videoRef);
  const { phase } = capture;
  const showCamera = phase === "starting" || phase === "capturing" || phase === "calibrating" || phase === "calibrationError";
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, []);
  // Releases the open camera before returning to the listing.
  const close = () => {
    capture.stop();
    props.onClose();
  };
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Kamera panorama Walk Inside 360°" className="fixed inset-0 z-[100] bg-black">
      <video ref={videoRef} playsInline muted aria-hidden="true"
        className={`absolute inset-0 w-full h-full object-contain ${showCamera ? "" : "invisible"}`} />
      <CaptureContents {...props} capture={capture} onClose={close} />
      {phase !== "done" && phase !== "uploading" && (
        <button type="button" onClick={close} aria-label="Tutup perekam"
          className="absolute top-4 right-4 w-11 h-11 rounded-full bg-black/60 text-white flex items-center justify-center">
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      )}
    </div>, document.body
  );
}
