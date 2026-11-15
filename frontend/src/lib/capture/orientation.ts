import { Quaternion, Vector3 } from "three";
import { cameraQuaternion } from "../../../../shared/captureMath.ts";
import type { OrientationQuat } from "@/types/tour";

const DEG = Math.PI / 180;

export interface OrientationSample {
  quaternion: Quaternion;
  yaw: number; // degrees, 0..360, increases when turning right
  pitch: number; // degrees, -90..90, positive when looking up
  timestamp: number;
}

interface PermissionCapableEvent {
  requestPermission?: () => Promise<"granted" | "denied">;
}

// needsMotionPermission reports whether the browser (iOS Safari) requires an explicit motion-sensor prompt.
export function needsMotionPermission(): boolean {
  if (typeof window === "undefined" || !("DeviceOrientationEvent" in window)) return false;
  const ctor = window.DeviceOrientationEvent as unknown as PermissionCapableEvent;
  return typeof ctor.requestPermission === "function";
}

// requestMotionPermission asks for motion-sensor access; it must run inside a user tap on iOS.
export async function requestMotionPermission(): Promise<boolean> {
  if (!needsMotionPermission()) return typeof window !== "undefined" && "DeviceOrientationEvent" in window;
  const ctor = window.DeviceOrientationEvent as unknown as PermissionCapableEvent;
  try {
    return (await ctor.requestPermission!()) === "granted";
  } catch {
    return false;
  }
}

// screenAngle returns the current screen rotation in degrees (0 when the phone is upright).
export function screenAngle(): number {
  if (typeof screen !== "undefined" && screen.orientation) return screen.orientation.angle;
  if (typeof window !== "undefined" && "orientation" in window) return Number(window.orientation) || 0;
  return 0;
}

// orientationToQuaternion converts W3C alpha/beta/gamma into a camera-to-world quaternion
// in the backend's frame: X right, Y up, -Z forward (the heading when recording started is arbitrary).
export function orientationToQuaternion(alpha: number, beta: number, gamma: number, screenDeg: number): Quaternion {
  const [w, x, y, z] = cameraQuaternion(alpha * DEG, beta * DEG, gamma * DEG, screenDeg);
  return new Quaternion(x, y, z, w);
}

// forwardAngles extracts the yaw and pitch (degrees) of the camera's viewing direction.
export function forwardAngles(q: Quaternion): { yaw: number; pitch: number } {
  const f = new Vector3(0, 0, -1).applyQuaternion(q);
  const pitch = Math.asin(Math.max(-1, Math.min(1, f.y))) / DEG;
  const yaw = ((Math.atan2(f.x, -f.z) / DEG) + 360) % 360;
  return { yaw, pitch };
}

// toWireQuat serializes a quaternion as (w, x, y, z) for the stitching backend.
export function toWireQuat(q: Quaternion): OrientationQuat {
  return [q.w, q.x, q.y, q.z];
}

// subscribeOrientation streams converted orientation samples and returns an unsubscribe function.
export function subscribeOrientation(onSample: (sample: OrientationSample) => void, relativeHeading = false): () => void {
  let heading: Quaternion | null = null;
  const handler = (e: DeviceOrientationEvent) => {
    if (e.alpha === null || e.beta === null || e.gamma === null) return;
    const quaternion = orientationToQuaternion(e.alpha, e.beta, e.gamma, screenAngle());
    if (relativeHeading) {
      heading ??= new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), forwardAngles(quaternion).yaw * DEG);
      quaternion.premultiply(heading);
    }
    onSample({ quaternion, ...forwardAngles(quaternion), timestamp: performance.now() });
  };
  window.addEventListener("deviceorientation", handler);
  return () => window.removeEventListener("deviceorientation", handler);
}

// angularSpeed measures complete camera rotation, including roll that can blur photos without changing aim.
export function angularSpeed(a: OrientationSample, b: OrientationSample): number {
  const dt = Math.max(1, b.timestamp - a.timestamp) / 1000;
  return a.quaternion.angleTo(b.quaternion) / DEG / dt;
}
