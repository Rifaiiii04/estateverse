"use client";

import { useCallback, useEffect, useRef } from "react";
import type { CaptureExtras, CaptureLocation } from "../../../../shared/capturePolicy.ts";

const GEO_TIMEOUT_MS = 20_000;
const GEO_MAX_AGE_MS = 30_000;
const HEIGHT_STORAGE_KEY = "estateverse.capture-height-cm";
export const DEFAULT_CAMERA_HEIGHT_CM = 150;

// useCaptureExtras tracks the phone height and the most accurate GPS fix seen while a room is being recorded.
export function useCaptureExtras() {
  const heightRef = useRef(DEFAULT_CAMERA_HEIGHT_CM);
  const bestFix = useRef<CaptureLocation | null>(null);
  const watchId = useRef<number | null>(null);

  // Stops listening to GPS updates while keeping the best fix collected so far.
  const stopWatch = useCallback(() => {
    if (watchId.current !== null && typeof navigator !== "undefined") navigator.geolocation?.clearWatch(watchId.current);
    watchId.current = null;
  }, []);

  // Starts a recording session: remembers the phone height and begins collecting GPS fixes.
  const begin = useCallback((cameraHeightCm?: number) => {
    stopWatch();
    if (cameraHeightCm) heightRef.current = cameraHeightCm;
    bestFix.current = null;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const fix = toLocation(pos);
        if (!bestFix.current || fix.accuracy_m < bestFix.current.accuracy_m) bestFix.current = fix;
      },
      () => undefined, // denied or unavailable: the room is still saved, just without the "recorded on site" proof
      { enableHighAccuracy: true, timeout: GEO_TIMEOUT_MS, maximumAge: GEO_MAX_AGE_MS }
    );
  }, [stopWatch]);

  // Returns the extras to send with the recording (height always, location only when a fix arrived).
  const snapshot = useCallback((): CaptureExtras => {
    const extras: CaptureExtras = { camera_height_cm: heightRef.current };
    if (bestFix.current) extras.location = bestFix.current;
    return extras;
  }, []);

  useEffect(() => stopWatch, [stopWatch]);

  return { begin, stop: stopWatch, snapshot };
}

// toLocation trims a browser position to the fields and precision the backend stores.
function toLocation(pos: GeolocationPosition): CaptureLocation {
  return {
    lat: Math.round(pos.coords.latitude * 1e6) / 1e6,
    lng: Math.round(pos.coords.longitude * 1e6) / 1e6,
    accuracy_m: Math.max(1, Math.round(pos.coords.accuracy)),
  };
}

// loadSavedCameraHeight returns the seller's last phone height on this device, a per-device convenience only.
export function loadSavedCameraHeight(): number {
  try {
    const saved = Number(window.localStorage.getItem(HEIGHT_STORAGE_KEY));
    return saved >= 50 && saved <= 250 ? saved : DEFAULT_CAMERA_HEIGHT_CM;
  } catch {
    return DEFAULT_CAMERA_HEIGHT_CM;
  }
}

// saveCameraHeight remembers the phone height for the next recording on this device.
export function saveCameraHeight(cm: number) {
  try {
    window.localStorage.setItem(HEIGHT_STORAGE_KEY, String(cm));
  } catch {
    // Storage can be blocked (private mode); the recorder still works with the value typed this time.
  }
}
