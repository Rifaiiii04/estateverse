"use client";

import { useEffect, useState, type RefObject } from "react";
import type { CaptureResult, TourRoom } from "@/types/tour";
import { calibrateTourCapture, uploadTourCapture } from "@/lib/api/tours";
import { useCaptureExtras } from "./useCaptureExtras";
import { initialSweep, SweepRecorder } from "./sweepRecorder";

// Connects a camera sweep to the existing draft and property upload workflows.
export function useSphereCapture(videoRef: RefObject<HTMLVideoElement | null>) {
  const [view, setView] = useState(initialSweep);
  const [uploadProgress, setUploadProgress] = useState(0);
  const extras = useCaptureExtras();
  const [recorder] = useState(() => new SweepRecorder(videoRef, setView, extras.stop, calibrateTourCapture));
  useEffect(() => () => recorder.stop(), [recorder]);

  // Returns only complete, ordered photographs for final server stitching.
  const result = (): CaptureResult => {
    if (view.phase !== "review" || recorder.frames.length !== view.targets.length) throw new Error("Sapuan belum lengkap.");
    return { frames: recorder.frames.slice(), extras: extras.snapshot() };
  };

  // Uploads the finished room and preserves the accepted images for a retry on failure.
  const upload = async (propertyId: number, name: string): Promise<TourRoom | null> => {
    const capture = result();
    recorder.update({ phase: "uploading", error: "" });
    setUploadProgress(0);
    try {
      const room = await uploadTourCapture(propertyId, name, capture, setUploadProgress);
      recorder.update({ phase: "done" });
      return room;
    } catch (err) {
      recorder.update({ phase: "review", error: err instanceof Error ? err.message : "Gagal mengunggah panorama." });
      return null;
    }
  };

  // Hands a newly captured room to the unsaved property draft.
  const collect = () => {
    const capture = result();
    recorder.update({ phase: "done" });
    return capture;
  };

  return { ...view, live: recorder.live, uploadProgress, upload, collect, retryCalibration: () => recorder.retryCalibration(),
    start: (height?: number) => recorder.start(() => extras.begin(height)), reset: () => recorder.reset(), stop: () => recorder.stop() };
}
