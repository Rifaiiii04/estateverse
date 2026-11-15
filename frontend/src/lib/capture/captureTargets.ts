import { Vector3 } from "three";
import type { CaptureTarget } from "../../../../shared/capturePolicy.ts";
export { buildCaptureTargets, toleranceFor, CAPTURE_TOLERANCE_DEG, POLE_TOLERANCE_DEG,
  STEADY_SPEED_DEG_S, STEADY_HOLD_MS } from "../../../../shared/capturePolicy.ts";
export type { CaptureTarget } from "../../../../shared/capturePolicy.ts";

const DEG = Math.PI / 180;

// directionFromAngles converts yaw/pitch (degrees) into a unit world direction (X right, Y up, -Z forward).
export function directionFromAngles(yaw: number, pitch: number): Vector3 {
  const y = yaw * DEG;
  const p = pitch * DEG;
  return new Vector3(Math.cos(p) * Math.sin(y), Math.sin(p), -Math.cos(p) * Math.cos(y));
}

// angleBetween returns the angle in degrees between two unit vectors.
export function angleBetween(a: Vector3, b: Vector3): number {
  return Math.acos(Math.max(-1, Math.min(1, a.dot(b)))) / DEG;
}

// nextPending keeps capture order predictable so adjacent photos overlap before moving to another ring.
export function nextPending(
  targets: CaptureTarget[],
  done: ReadonlySet<number>,
  forward: Vector3
): { target: CaptureTarget; distance: number } | null {
  const target = targets.find((t) => !done.has(t.id));
  return target ? { target, distance: angleBetween(forward, directionFromAngles(target.yaw, target.pitch)) } : null;
}

// ringLabel gives Indonesian guidance for where the next target is.
export function ringLabel(ring: CaptureTarget["ring"]): string {
  const labels: Record<CaptureTarget["ring"], string> = {
    horizon: "Arahkan lurus ke depan",
    up: "Dongakkan HP sedikit ke atas",
    down: "Arahkan HP sedikit ke bawah",
    ceiling: "Arahkan HP lurus ke plafon",
    floor: "Arahkan HP lurus ke lantai",
  };
  return labels[ring];
}
