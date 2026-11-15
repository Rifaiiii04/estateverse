"use client";

import { RefObject, useCallback, useEffect, useRef, useState } from "react";
import { Vector3 } from "three";
import type { CapturedFrame, TourRoom } from "@/types/tour";
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
import { angularSpeed, OrientationSample, requestMotionPermission, screenAngle, subscribeOrientation, toWireQuat } from "./orientation";

export type CapturePhase = "intro" | "starting" | "capturing" | "calibrating" | "review" | "uploading" | "done" | "error";

export interface SteadyState {
  targetId: number;
  since: number;
}

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
  const steadyRef = useRef<SteadyState | null>(null);
  const grabbingRef = useRef(false);
  const frameSizeRef = useRef<{ w: number; h: number } | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const sessionRef = useRef(0);
  const screenRef = useRef(0);

  // Switches phase in both state (for rendering) and ref (for sensor callbacks).
  const goTo = useCallback((next: CapturePhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  // Releases the camera and stops listening to motion sensors.
  const stopDevices = useCallback(() => {
    sessionRef.current++;
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
    stopStream(streamRef.current);
    streamRef.current = null;
  }, []);

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
            speedRef.current > STEADY_SPEED_DEG_S || screenAngle() !== screenRef.current ||
            latest.quaternion.angleTo(sample.quaternion) * 180 / Math.PI > 2) {
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

  // Evaluates each sensor sample: tracks rotation speed and fires a shot after holding steady on a target.
  const handleSample = useCallback(
    (sample: OrientationSample) => {
      const prev = sampleRef.current;
      sampleRef.current = sample;
      if (prev) speedRef.current = Math.max(angularSpeed(prev, sample), speedRef.current * 0.7);
      if (phaseRef.current !== "capturing" || grabbingRef.current) return;
      if (screenAngle() !== screenRef.current) {
        stopDevices();
        setError("Orientasi layar berubah. Matikan putar otomatis, pegang HP tegak, lalu rekam ulang.");
        goTo("error");
        return;
      }
      if (prev && sample.timestamp - prev.timestamp > 250) steadyRef.current = null;

      const forward = new Vector3(0, 0, -1).applyQuaternion(sample.quaternion);
      const nearest = nextPending(targetPlan.current, new Set(framesRef.current.keys()), forward);
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
    [goTo, stopDevices, takeShot]
  );

  // Requests permissions, opens the camera, and waits for live sensor data before recording.
  const start = useCallback(async () => {
    stopDevices();
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
  }, [goTo, handleSample, stopDevices, videoRef]);

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

  // Uploads all frames in target order and returns the room created for stitching.
  const upload = useCallback(
    async (propertyId: number, name: string): Promise<TourRoom | null> => {
      if (!planned.current || framesRef.current.size !== targetPlan.current.length) return null;
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
    if (!planned.current || framesRef.current.size !== targetPlan.current.length) throw new Error("Rekaman belum lengkap.");
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
