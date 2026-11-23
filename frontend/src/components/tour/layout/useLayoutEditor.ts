"use client";

import { useCallback, useMemo, useState } from "react";
import type { FloorPoint, TourRoom } from "@/types/tour";
import {
  calibratedHeightCm,
  cameraHeightMeters,
  DEFAULT_CAMERA_HEIGHT_CM,
  distanceBetween,
  floorPointAt,
  MAX_FLOOR_PITCH_DEG,
  outlineToFloor,
  summarizeRoom,
} from "@/lib/measure/roomGeometry";

export type LayoutStep = "corners" | "calibrate";

const MAX_CORNERS = 24;
const DEFAULT_REFERENCE_CM = 80; // a standard interior door leaf is about 80 cm wide
const STEP_HINTS: Record<LayoutStep, string> = {
  corners: "Ketuk sudut-sudut lantai berurutan mengelilingi ruangan.",
  calibrate: "Ketuk dua ujung benda di lantai yang ukurannya Anda tahu, mis. lebar pintu atau ubin.",
};

// useLayoutEditor holds the seller's room-tracing session: camera height, floor corners, and optional calibration.
export function useLayoutEditor(room: TourRoom) {
  const [heightCm, setHeightCm] = useState(room.camera_height_cm || DEFAULT_CAMERA_HEIGHT_CM);
  const [step, setStepState] = useState<LayoutStep>("corners");
  const [corners, setCorners] = useState<FloorPoint[]>(room.floor_outline ?? []);
  const [reference, setReference] = useState<FloorPoint[]>([]);
  const [referenceCm, setReferenceCm] = useState(DEFAULT_REFERENCE_CM);
  const [hint, setHint] = useState(STEP_HINTS.corners);
  const heightM = cameraHeightMeters(heightCm);

  // Switches between tracing corners and calibrating with a known length.
  const setStep = useCallback((next: LayoutStep) => {
    setStepState(next);
    setReference([]);
    setHint(STEP_HINTS[next]);
  }, []);

  // Adds a tapped floor point to the active step, refusing taps on walls or the ceiling.
  const pick = useCallback((yaw: number, pitch: number) => {
    if (pitch > MAX_FLOOR_PITCH_DEG) {
      setHint("Titik itu bukan lantai. Ketuk tepat di garis pertemuan lantai dan dinding.");
      return;
    }
    if (step === "calibrate") {
      setReference((r) => (r.length >= 2 ? [{ yaw, pitch }] : [...r, { yaw, pitch }]));
      return;
    }
    setCorners((c) => (c.length >= MAX_CORNERS ? c : [...c, { yaw, pitch }]));
    setHint(STEP_HINTS.corners);
  }, [step]);

  const measuredReferenceM = useMemo(() => {
    const [a, b] = reference.map((p) => floorPointAt(p, heightM));
    return a && b ? distanceBetween(a, b) : null;
  }, [reference, heightM]);

  // Rescales the camera height so the reference object measures its real length, then returns to tracing.
  const applyCalibration = useCallback(() => {
    if (measuredReferenceM === null || referenceCm <= 0) return;
    setHeightCm(calibratedHeightCm(heightCm, measuredReferenceM, referenceCm / 100));
    setStep("corners");
  }, [heightCm, measuredReferenceM, referenceCm, setStep]);

  const floorCorners = useMemo(() => outlineToFloor(corners, heightM), [corners, heightM]);
  const floorReference = useMemo(() => outlineToFloor(reference, heightM), [reference, heightM]);

  return {
    heightCm, setHeightCm, heightM, step, setStep, pick, hint,
    corners, floorCorners, undoCorner: () => setCorners((c) => c.slice(0, -1)), clearCorners: () => setCorners([]),
    floorReference, measuredReferenceM, referenceCm, setReferenceCm, applyCalibration,
    summary: summarizeRoom(corners, heightCm),
  };
}

export type LayoutEditor = ReturnType<typeof useLayoutEditor>;
