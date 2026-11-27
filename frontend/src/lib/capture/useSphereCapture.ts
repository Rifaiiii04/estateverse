"use client";

import { useEffect, useState, type RefObject } from "react";
import type { CaptureResult, TourRoom } from "@/types/tour";
import { uploadTourCapture } from "@/lib/api/tours";
import { useCaptureExtras } from "./useCaptureExtras";
import { initialSweep, SweepRecorder } from "./sweepRecorder";

// Connects a camera sweep to the existing draft and property upload workflows.
export function useSphereCapture(videoRef: RefObject<HTMLVideoElement | null>) {
  const [view, setView] = useState(initialSweep);
  const [uploadProgress, setUploadProgress] = useState(0);
  const extras = useCaptureExtras();
  const [recorder] = useState(() => new SweepRecorder(videoRef, setView, extras.stop));
  useEffect(() => () => recorder.stop(), [recorder]);

  // Uploads the finished room and preserves the accepted images for a retry on failure.
  const upload = async (propertyId: number, name: string): Promise<TourRoom | null> => {
    return recorder.uploadReview((bands, signal) => {
      setUploadProgress(0);
      return uploadTourCapture(propertyId, name, { bands, extras: extras.snapshot() }, setUploadProgress, signal);
    });
  };

  // Hands a newly captured room to the unsaved property draft.
  const collect = (): CaptureResult | null => {
    const bands = recorder.takeReview("done");
    return bands ? { bands, extras: extras.snapshot() } : null;
  };

  return { ...view, uploadProgress, upload, collect, retryEncode: () => recorder.saveBand(),
    start: (height?: number) => recorder.start(() => extras.begin(height)), reset: () => recorder.reset(), stop: () => recorder.stop() };
}
