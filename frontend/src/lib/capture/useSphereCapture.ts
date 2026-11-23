"use client";

import { RefObject, useCallback, useEffect, useRef, useState } from "react";
import { Vector3 } from "three";
import type { CapturedFrame, CaptureResult, TourRoom } from "@/types/tour";
import { calibrateTourCapture, uploadTourCapture } from "@/lib/api/tours";
import { calibratedTargets } from "../../../../shared/capturePolicy.ts";
import { describeStartError, waitForSensor } from "./captureStartup";
import {
  buildCaptureTargets,
  CaptureTarget,
  nextPending,
  STEADY_HOLD_MS,
  STEADY_SPEED_DEG_S,
  toleranceFor,
} from "./captureTargets";
import { grabFrame, startRearCamera, stopStream } from "./frameGrabber";
import { OrientationSample, requestMotionPermission, screenAngle, subscribeOrientation, toWireQuat } from "./orientation";
import { advanceSteady, createSpeedTracker, SteadyState } from "./steadiness";
import { useCaptureExtras } from "./useCaptureExtras";

export type CapturePhase = "intro" | "starting" | "capturing" | "calibrating" | "review" | "uploading" | "done" | "error";

/** Largest pose change allowed between the steady moment and the camera frame that is kept. */
const SNAPSHOT_DRIFT_DEG = 3;

// useSphereCapture runs the guided 360° recording: camera, motion sensors, automatic shots, and upload.
export function useSphereCapture(videoRef: RefObject<HTMLVideoElement | null>) {
  const [targets, setTargets] = useState(buildCaptureTargets);
  const targetPlan = useRef(buildCaptureTargets());
  const planned = useRef(false);
  const [phase, setPhase] = useState<CapturePhase>("intro");
  const [doneIds, setDoneIds] = useState<ReadonlySet<number>>(new Set());
  const [error, setError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);

  const phaseRef = useRef<CapturePhase>("intro");
  const framesRef = useRef(new Map<number, CapturedFrame>());
  const sampleRef = useRef<OrientationSample | null>(null);
  const speedRef = useRef(0);
  const speedTrackerRef = useRef(createSpeedTracker());
  const steadyRef = useRef<SteadyState | null>(null);
  const grabbingRef = useRef(false);
  const frameSizeRef = useRef<{ w: number; h: number } | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const sessionRef = useRef(0);
  const screenRef = useRef(0);
  const { begin: beginExtras, stop: stopExtras, snapshot: snapshotExtras } = useCaptureExtras();

  // Switches phase in both state (for rendering) and ref (for sensor callbacks).
  const goTo = useCallback((next: CapturePhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  // Releases the camera and stops listening to motion and GPS sensors.
  const stopDevices = useCallback(() => {
    sessionRef.current++;
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
    stopStream(streamRef.current);
    streamRef.current = null;
    stopExtras();
  }, [stopExtras]);

  // planCapture reuses the initial photos and obtains additional directions measured by the backend.
  const planCapture = useCallback(async (session: number) => {
    goTo("calibrating");
    const result = await calibrateTourCapture([...framesRef.current.values()]);
    if (session !== sessionRef.current) return;
    const next = calibratedTargets(result);
    targetPlan.current = next;
    planned.current = true;
    setTargets(next);
    goTo("capturing");
  }, [goTo]);

  // Takes a fresh frame paired with its live pose and ignores snapshots from a stopped recording session.
  const takeShot = useCallback(
    async (target: CaptureTarget, sample: OrientationSample) => {
      const video = videoRef.current;
      if (!video) return;
      const session = sessionRef.current;
      grabbingRef.current = true;
      try {
        const size = { w: video.videoWidth, h: video.videoHeight };
        frameSizeRef.current ??= size;
        if (size.w !== frameSizeRef.current.w || size.h !== frameSizeRef.current.h) {
          stopDevices();
          setError("Ukuran kamera berubah. Pegang HP tegak dan mulai rekaman baru.");
          goTo("error");
          return;
        }
        let pose = sample.quaternion.clone();
        const blob = await grabFrame(video, () => {
          const latest = sampleRef.current;
          if (session !== sessionRef.current || !latest || performance.now() - latest.timestamp > 250 ||
            speedRef.current > STEADY_SPEED_DEG_S * 1.5 || screenAngle() !== screenRef.current ||
            latest.quaternion.angleTo(sample.quaternion) * 180 / Math.PI > SNAPSHOT_DRIFT_DEG) {
            throw new Error("HP bergerak saat foto diambil. Tahan pada titik yang sama lalu coba lagi.");
          }
          pose = latest.quaternion.clone();
        });
        if (session !== sessionRef.current) return;
        setError("");
        framesRef.current.set(target.id, { targetId: target.id, blob, orientation: toWireQuat(pose) });
        setDoneIds(new Set(framesRef.current.keys()));
        navigator.vibrate?.(25);
        if (framesRef.current.size === 3 && !planned.current) await planCapture(session);
        else if (planned.current && framesRef.current.size === targetPlan.current.length) {
          stopDevices();
          goTo("review");
        }
      } catch (err) {
        if (session === sessionRef.current) setError(err instanceof Error ? err.message : "Foto gagal diambil. Tahan HP lalu coba lagi.");
        if (session === sessionRef.current && framesRef.current.size === 3 && !planned.current) { stopDevices(); goTo("error"); }
      } finally {
        if (session === sessionRef.current) {
          grabbingRef.current = false;
          steadyRef.current = null;
        }
      }
    },
    [goTo, stopDevices, planCapture, videoRef]
  );

  // Evaluates each sensor sample: tracks windowed rotation speed and fires a shot once the hold on the target fills up.
  const handleSample = useCallback(
    (sample: OrientationSample) => {
      sampleRef.current = sample;
      speedRef.current = speedTrackerRef.current(sample);
      if (phaseRef.current !== "capturing" || grabbingRef.current) return;
      if (screenAngle() !== screenRef.current) {
        stopDevices();
        setError("Orientasi layar berubah. Matikan putar otomatis, pegang HP tegak, lalu rekam ulang.");
        goTo("error");
        return;
      }
      const forward = new Vector3(0, 0, -1).applyQuaternion(sample.quaternion);
      const nearest = nextPending(targetPlan.current, new Set(framesRef.current.keys()), forward);
      if (!nearest) {
        steadyRef.current = null;
        return;
      }
      steadyRef.current = advanceSteady(steadyRef.current, {
        targetId: nearest.target.id,
        distance: nearest.distance,
        tolerance: toleranceFor(nearest.target),
        speed: speedRef.current,
        now: sample.timestamp,
      });
      if (steadyRef.current && steadyRef.current.heldMs >= STEADY_HOLD_MS) void takeShot(nearest.target, sample);
    },
    [goTo, stopDevices, takeShot]
  );

  // Requests permissions, opens the camera, and waits for live sensor data; GPS is collected alongside when allowed.
  const start = useCallback(async (cameraHeightCm?: number) => {
    stopDevices();
    beginExtras(cameraHeightCm);
    const session = sessionRef.current;
    targetPlan.current = buildCaptureTargets();
    planned.current = false;
    setTargets(targetPlan.current);
    framesRef.current.clear();
    frameSizeRef.current = null;
    grabbingRef.current = false;
    setDoneIds(new Set());
    setError("");
    sampleRef.current = null;
    speedRef.current = 0;
    speedTrackerRef.current = createSpeedTracker();
    steadyRef.current = null;
    screenRef.current = screenAngle();
    goTo("starting");
    try {
      if (!(await requestMotionPermission())) throw new Error("Izin sensor gerak ditolak. Izinkan lalu coba lagi.");
      if (session !== sessionRef.current) return;
      if (screenRef.current % 180 !== 0) throw new Error("Pegang HP tegak (portrait) sebelum mulai merekam.");
      if (!videoRef.current) throw new Error("Kamera belum siap.");
      const stream = await startRearCamera(videoRef.current);
      if (session !== sessionRef.current) return stopStream(stream);
      streamRef.current = stream;
      unsubscribeRef.current = subscribeOrientation(handleSample, true);
      await waitForSensor(sampleRef);
      if (session !== sessionRef.current) return;
      goTo("capturing");
    } catch (err) {
      if (session !== sessionRef.current) return;
      stopDevices();
      setError(describeStartError(err));
      goTo("error");
    }
  }, [beginExtras, goTo, handleSample, stopDevices, videoRef]);

  // Clears captured frames so the room can be recorded again.
  const reset = useCallback(() => {
    stopDevices();
    framesRef.current.clear();
    frameSizeRef.current = null;
    setError("");
    setDoneIds(new Set());
    setUploadProgress(0);
    goTo("intro");
  }, [goTo, stopDevices]);

  // Packs the frames in target order with the phone height and GPS fix, or null while the recording is incomplete.
  const finishedCapture = useCallback((): CaptureResult | null => {
    if (!planned.current || framesRef.current.size !== targetPlan.current.length) return null;
    const frames = [...framesRef.current.values()].sort((a, b) => a.targetId - b.targetId);
    return { frames, extras: snapshotExtras() };
  }, [snapshotExtras]);

  // Uploads the finished recording and returns the room created for stitching.
  const upload = useCallback(
    async (propertyId: number, name: string): Promise<TourRoom | null> => {
      const capture = finishedCapture();
      if (!capture) return null;
      goTo("uploading");
      try {
        const room = await uploadTourCapture(propertyId, name, capture, setUploadProgress);
        goTo("done");
        return room;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal mengunggah rekaman.");
        goTo("review");
        return null;
      }
    },
    [finishedCapture, goTo]
  );

  // Returns the finished recording without uploading (used before the property exists).
  const collect = useCallback((): CaptureResult => {
    const capture = finishedCapture();
    if (!capture) throw new Error("Rekaman belum lengkap.");
    goTo("done");
    return capture;
  }, [finishedCapture, goTo]);

  useEffect(() => stopDevices, [stopDevices]);

  return {
    targets, phase, doneIds, error, uploadProgress, sampleRef, speedRef, steadyRef,
    start, reset, upload, collect, stop: stopDevices,
  };
}
