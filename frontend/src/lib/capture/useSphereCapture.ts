"use client";

import { RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Vector3 } from "three";
import type { CapturedFrame, TourRoom } from "@/types/tour";
import { uploadTourCapture } from "@/lib/api/tours";
import {
  buildCaptureTargets,
  CaptureTarget,
  nearestPending,
  STEADY_HOLD_MS,
  STEADY_SPEED_DEG_S,
  toleranceFor,
} from "./captureTargets";
import { grabFrame, startRearCamera, stopStream } from "./frameGrabber";
import { OrientationSample, requestMotionPermission, subscribeOrientation, toWireQuat } from "./orientation";

export type CapturePhase = "intro" | "starting" | "capturing" | "review" | "uploading" | "done" | "error";

const SENSOR_TIMEOUT_MS = 2500;

export interface SteadyState {
  targetId: number;
  since: number;
}

// useSphereCapture runs the guided 360° recording: camera, motion sensors, automatic shots, and upload.
export function useSphereCapture(videoRef: RefObject<HTMLVideoElement | null>) {
  const targets = useMemo(() => buildCaptureTargets(), []);
  const [phase, setPhase] = useState<CapturePhase>("intro");
  const [doneIds, setDoneIds] = useState<ReadonlySet<number>>(new Set());
  const [error, setError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);

  const phaseRef = useRef<CapturePhase>("intro");
  const framesRef = useRef(new Map<number, CapturedFrame>());
  const sampleRef = useRef<OrientationSample | null>(null);
  const speedRef = useRef(0);
  const steadyRef = useRef<SteadyState | null>(null);
  const grabbingRef = useRef(false);
  const frameSizeRef = useRef<{ w: number; h: number } | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Switches phase in both state (for rendering) and ref (for sensor callbacks).
  const goTo = useCallback((next: CapturePhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  // Releases the camera and stops listening to motion sensors.
  const stopDevices = useCallback(() => {
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
    stopStream(streamRef.current);
    streamRef.current = null;
  }, []);

  // Takes one frame for the target, keeping the orientation measured when the shot started.
  const takeShot = useCallback(
    async (target: CaptureTarget, sample: OrientationSample) => {
      const video = videoRef.current;
      if (!video) return;
      grabbingRef.current = true;
      try {
        const size = { w: video.videoWidth, h: video.videoHeight };
        frameSizeRef.current ??= size;
        if (size.w !== frameSizeRef.current.w || size.h !== frameSizeRef.current.h) return;
        const blob = await grabFrame(video);
        framesRef.current.set(target.id, { targetId: target.id, blob, orientation: toWireQuat(sample.quaternion) });
        setDoneIds(new Set(framesRef.current.keys()));
        navigator.vibrate?.(25);
        if (framesRef.current.size === targets.length) {
          stopDevices();
          goTo("review");
        }
      } finally {
        grabbingRef.current = false;
        steadyRef.current = null;
      }
    },
    [goTo, stopDevices, targets.length, videoRef]
  );

  // Evaluates each sensor sample: tracks rotation speed and fires a shot after holding steady on a target.
  const handleSample = useCallback(
    (sample: OrientationSample) => {
      const prev = sampleRef.current;
      sampleRef.current = sample;
      if (prev) speedRef.current = 0.7 * speedRef.current + 0.3 * angularSpeed(prev, sample);
      if (phaseRef.current !== "capturing" || grabbingRef.current) return;

      const forward = new Vector3(0, 0, -1).applyQuaternion(sample.quaternion);
      const nearest = nearestPending(targets, new Set(framesRef.current.keys()), forward);
      const aimed = nearest && nearest.distance <= toleranceFor(nearest.target);
      if (!nearest || !aimed || speedRef.current > STEADY_SPEED_DEG_S) {
        steadyRef.current = null;
        return;
      }
      if (steadyRef.current?.targetId !== nearest.target.id) {
        steadyRef.current = { targetId: nearest.target.id, since: sample.timestamp };
      } else if (sample.timestamp - steadyRef.current.since >= STEADY_HOLD_MS) {
        void takeShot(nearest.target, sample);
      }
    },
    [takeShot, targets]
  );

  // Requests permissions, opens the camera, and waits for live sensor data before recording.
  const start = useCallback(async () => {
    setError("");
    sampleRef.current = null;
    goTo("starting");
    try {
      if (!(await requestMotionPermission())) throw new Error("Izin sensor gerak ditolak. Izinkan lalu coba lagi.");
      if (!videoRef.current) throw new Error("Kamera belum siap.");
      streamRef.current = await startRearCamera(videoRef.current);
      unsubscribeRef.current = subscribeOrientation(handleSample);
      await waitForSensor(sampleRef);
      goTo("capturing");
    } catch (err) {
      stopDevices();
      setError(describeStartError(err));
      goTo("error");
    }
  }, [goTo, handleSample, stopDevices, videoRef]);

  // Clears captured frames so the room can be recorded again.
  const reset = useCallback(() => {
    stopDevices();
    framesRef.current.clear();
    frameSizeRef.current = null;
    setDoneIds(new Set());
    setUploadProgress(0);
    goTo("intro");
  }, [goTo, stopDevices]);

  // Uploads all frames in target order and returns the room created for stitching.
  const upload = useCallback(
    async (propertyId: number, name: string): Promise<TourRoom | null> => {
      goTo("uploading");
      try {
        const frames = [...framesRef.current.values()].sort((a, b) => a.targetId - b.targetId);
        const room = await uploadTourCapture(propertyId, name, frames, setUploadProgress);
        goTo("done");
        return room;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal mengunggah rekaman.");
        goTo("review");
        return null;
      }
    },
    [goTo]
  );

  // Returns the recorded frames in target order and finishes without uploading (used before the property exists).
  const collect = useCallback((): CapturedFrame[] => {
    const frames = [...framesRef.current.values()].sort((a, b) => a.targetId - b.targetId);
    goTo("done");
    return frames;
  }, [goTo]);

  useEffect(() => stopDevices, [stopDevices]);

  return {
    targets, phase, doneIds, error, uploadProgress, sampleRef, speedRef, steadyRef,
    start, reset, upload, collect, stop: stopDevices,
  };
}

// angularSpeed returns how fast (degrees per second) the camera direction changed between two samples.
function angularSpeed(a: OrientationSample, b: OrientationSample): number {
  const dt = Math.max(1, b.timestamp - a.timestamp) / 1000;
  const fa = new Vector3(0, 0, -1).applyQuaternion(a.quaternion);
  const fb = new Vector3(0, 0, -1).applyQuaternion(b.quaternion);
  return (Math.acos(Math.max(-1, Math.min(1, fa.dot(fb)))) * 180) / Math.PI / dt;
}

// waitForSensor resolves once orientation data arrives, or rejects on devices without motion sensors.
function waitForSensor(sampleRef: RefObject<OrientationSample | null>): Promise<void> {
  const started = performance.now();
  return new Promise((resolve, reject) => {
    const poll = () => {
      if (sampleRef.current) return resolve();
      if (performance.now() - started > SENSOR_TIMEOUT_MS) {
        return reject(new Error("Sensor gerak tidak terdeteksi. Gunakan HP (bukan laptop) untuk merekam."));
      }
      requestAnimationFrame(poll);
    };
    poll();
  });
}

// describeStartError turns camera/permission failures into Indonesian guidance.
function describeStartError(err: unknown): string {
  if (err instanceof DOMException && err.name === "NotAllowedError") {
    return "Izin kamera ditolak. Buka pengaturan browser, izinkan kamera, lalu coba lagi.";
  }
  if (err instanceof DOMException && err.name === "NotFoundError") return "Kamera tidak ditemukan di perangkat ini.";
  return err instanceof Error ? err.message : "Perekaman tidak dapat dimulai.";
}
