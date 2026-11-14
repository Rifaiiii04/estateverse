import { Vector3 } from "three";

const DEG = Math.PI / 180;

/** Angular distance (degrees) within which the phone counts as aimed at a horizon or ±45° target. */
export const CAPTURE_TOLERANCE_DEG = 4;
/** Ceiling and floor shots are more forgiving because yaw is meaningless there. */
export const POLE_TOLERANCE_DEG = 7;
/** Maximum rotation speed (degrees per second) for a frame to be considered steady. */
export const STEADY_SPEED_DEG_S = 12;
/** How long (ms) the phone must stay steady on a target before the frame is taken. */
export const STEADY_HOLD_MS = 300;

export interface CaptureTarget {
  id: number;
  yaw: number;
  pitch: number;
  ring: "horizon" | "up" | "down" | "ceiling" | "floor";
}

// buildCaptureTargets returns the guided grid: 12 at the horizon, 8 at ±45°, plus ceiling and floor (30 shots).
export function buildCaptureTargets(): CaptureTarget[] {
  const targets: CaptureTarget[] = [];
  for (let i = 0; i < 12; i++) targets.push({ id: targets.length, yaw: i * 30, pitch: 0, ring: "horizon" });
  for (let i = 0; i < 8; i++) targets.push({ id: targets.length, yaw: 15 + i * 45, pitch: 45, ring: "up" });
  for (let i = 0; i < 8; i++) targets.push({ id: targets.length, yaw: 15 + i * 45, pitch: -45, ring: "down" });
  targets.push({ id: targets.length, yaw: 0, pitch: 90, ring: "ceiling" });
  targets.push({ id: targets.length, yaw: 0, pitch: -90, ring: "floor" });
  return targets;
}

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

// toleranceFor returns how precisely a target must be aimed at.
export function toleranceFor(target: CaptureTarget): number {
  return target.ring === "ceiling" || target.ring === "floor" ? POLE_TOLERANCE_DEG : CAPTURE_TOLERANCE_DEG;
}

// nearestPending finds the closest not-yet-captured target to the current viewing direction.
export function nearestPending(
  targets: CaptureTarget[],
  done: ReadonlySet<number>,
  forward: Vector3
): { target: CaptureTarget; distance: number } | null {
  let best: { target: CaptureTarget; distance: number } | null = null;
  for (const t of targets) {
    if (done.has(t.id)) continue;
    const distance = angleBetween(forward, directionFromAngles(t.yaw, t.pitch));
    if (!best || distance < best.distance) best = { target: t, distance };
  }
  return best;
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
