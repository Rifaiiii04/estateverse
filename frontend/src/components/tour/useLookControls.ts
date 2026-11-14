"use client";

import { RefObject, useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Euler, PerspectiveCamera, Quaternion, Vector3 } from "three";
import { forwardAngles, OrientationSample, subscribeOrientation } from "@/lib/capture/orientation";

const DEG = Math.PI / 180;
const MIN_FOV = 30;
const MAX_FOV = 95;
const TAP_SLOP_PX = 6;
const KEY_STEP_DEG = 5;

interface LookState {
  yaw: number;
  pitch: number;
  fov: number;
}

/** Imperative handle so on-screen buttons can look around without dragging. */
export interface LookHandle {
  nudge: (deltaYaw: number, deltaPitch: number) => void;
  zoom: (deltaFov: number) => void;
}

export interface LookOptions {
  gyro: boolean;
  initialYaw?: number;
  onPick?: (yaw: number, pitch: number) => void;
  controlRef?: RefObject<LookHandle | null>;
}

// useLookControls lets visitors look around a panorama by dragging, pinching, scrolling, keys, or moving the phone.
export function useLookControls({ gyro, initialYaw = 0, onPick, controlRef }: LookOptions) {
  const { camera, gl } = useThree();
  const view = useRef<LookState>({ yaw: initialYaw, pitch: 0, fov: 75 });
  const sample = useRef<OrientationSample | null>(null);
  const gyroOffset = useRef<number | null>(null);

  useEffect(() => {
    view.current.yaw = initialYaw;
  }, [initialYaw]);

  useEffect(() => {
    if (!gyro) {
      gyroOffset.current = null;
      return;
    }
    return subscribeOrientation((s) => {
      sample.current = s;
      if (gyroOffset.current === null) gyroOffset.current = view.current.yaw - s.yaw;
    });
  }, [gyro]);

  useEffect(() => bindPointerAndKeys(gl.domElement, view, camera as PerspectiveCamera, onPick), [camera, gl, onPick]);

  useEffect(() => {
    if (!controlRef) return;
    controlRef.current = {
      nudge: (dYaw, dPitch) => {
        view.current.yaw = wrapYaw(view.current.yaw + dYaw);
        view.current.pitch = clampPitch(view.current.pitch + dPitch);
      },
      zoom: (dFov) => {
        view.current.fov = clampFov(view.current.fov + dFov);
      },
    };
    return () => {
      controlRef.current = null;
    };
  }, [controlRef]);

  useFrame((state) => {
    const cam = state.camera as PerspectiveCamera;
    const s = sample.current;
    if (gyro && s && gyroOffset.current !== null) {
      const offset = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), -gyroOffset.current * DEG);
      cam.quaternion.copy(offset.multiply(s.quaternion));
      const angles = forwardAngles(cam.quaternion);
      view.current.yaw = angles.yaw;
      view.current.pitch = angles.pitch;
    } else {
      cam.quaternion.setFromEuler(new Euler(view.current.pitch * DEG, -view.current.yaw * DEG, 0, "YXZ"));
    }
    if (cam.fov !== view.current.fov) {
      cam.fov = view.current.fov;
      cam.updateProjectionMatrix();
    }
  });
}

// bindPointerAndKeys wires drag, pinch, wheel, keyboard, and tap-to-pick handlers; returns a cleanup function.
function bindPointerAndKeys(
  el: HTMLCanvasElement,
  view: { current: LookState },
  camera: PerspectiveCamera,
  onPick?: (yaw: number, pitch: number) => void
) {
  const pointers = new Map<number, { x: number; y: number }>();
  let travel = 0;
  let pinchDist = 0;

  // Starts tracking a finger or mouse press (two pointers begin a pinch).
  const onDown = (e: PointerEvent) => {
    el.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    travel = 0;
    pinchDist = pointers.size === 2 ? distance(pointers) : 0;
  };
  // Rotates the view while dragging, or zooms while pinching.
  const onMove = (e: PointerEvent) => {
    const prev = pointers.get(e.pointerId);
    if (!prev) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      const d = distance(pointers);
      view.current.fov = clampFov(view.current.fov * (pinchDist / Math.max(1, d)));
      pinchDist = d;
      return;
    }
    const k = view.current.fov / el.clientHeight;
    travel += Math.abs(e.clientX - prev.x) + Math.abs(e.clientY - prev.y);
    view.current.yaw = wrapYaw(view.current.yaw - (e.clientX - prev.x) * k);
    view.current.pitch = clampPitch(view.current.pitch + (e.clientY - prev.y) * k);
  };
  // Ends a press and treats a short tap as picking a direction.
  const onUp = (e: PointerEvent) => {
    pointers.delete(e.pointerId);
    if (onPick && travel < TAP_SLOP_PX && pointers.size === 0) onPick(...pickAngles(e, el, camera));
  };
  // Zooms with the mouse wheel or trackpad.
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    view.current.fov = clampFov(view.current.fov + e.deltaY * 0.05);
  };
  // Handles arrow-key looking and +/- zooming.
  const onKey = (e: KeyboardEvent) => applyKey(e, view.current);

  el.addEventListener("pointerdown", onDown);
  el.addEventListener("pointermove", onMove);
  el.addEventListener("pointerup", onUp);
  el.addEventListener("pointercancel", onUp);
  el.addEventListener("wheel", onWheel, { passive: false });
  el.addEventListener("keydown", onKey);
  return () => {
    el.removeEventListener("pointerdown", onDown);
    el.removeEventListener("pointermove", onMove);
    el.removeEventListener("pointerup", onUp);
    el.removeEventListener("pointercancel", onUp);
    el.removeEventListener("wheel", onWheel);
    el.removeEventListener("keydown", onKey);
  };
}

// applyKey maps arrow keys to looking around and +/- to zooming.
function applyKey(e: KeyboardEvent, v: LookState) {
  const actions: Record<string, () => void> = {
    ArrowLeft: () => (v.yaw = wrapYaw(v.yaw - KEY_STEP_DEG)),
    ArrowRight: () => (v.yaw = wrapYaw(v.yaw + KEY_STEP_DEG)),
    ArrowUp: () => (v.pitch = clampPitch(v.pitch + KEY_STEP_DEG)),
    ArrowDown: () => (v.pitch = clampPitch(v.pitch - KEY_STEP_DEG)),
    "+": () => (v.fov = clampFov(v.fov - KEY_STEP_DEG)),
    "=": () => (v.fov = clampFov(v.fov - KEY_STEP_DEG)),
    "-": () => (v.fov = clampFov(v.fov + KEY_STEP_DEG)),
  };
  const action = actions[e.key];
  if (!action) return;
  e.preventDefault();
  action();
}

// pickAngles converts a tap position into the yaw/pitch (degrees) of the direction under the finger.
function pickAngles(e: PointerEvent, el: HTMLCanvasElement, camera: PerspectiveCamera): [number, number] {
  const rect = el.getBoundingClientRect();
  const ndc = new Vector3(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1, 0.5);
  const dir = ndc.unproject(camera).sub(camera.position).normalize();
  const yaw = Math.atan2(dir.x, -dir.z) / DEG;
  return [yaw > 180 ? yaw - 360 : yaw, Math.asin(Math.max(-1, Math.min(1, dir.y))) / DEG];
}

// distance returns the gap between the first two active pointers.
function distance(pointers: Map<number, { x: number; y: number }>): number {
  const [a, b] = [...pointers.values()];
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// clampFov keeps zoom within a comfortable range.
function clampFov(fov: number): number {
  return Math.max(MIN_FOV, Math.min(MAX_FOV, fov));
}

// clampPitch prevents looking past straight up or down.
function clampPitch(pitch: number): number {
  return Math.max(-89, Math.min(89, pitch));
}

// wrapYaw keeps yaw within 0..360 degrees.
function wrapYaw(yaw: number): number {
  return ((yaw % 360) + 360) % 360;
}
