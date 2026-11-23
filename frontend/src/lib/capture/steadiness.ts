import type { OrientationSample } from "./orientation.ts";
import { STEADY_HOLD_MS, STEADY_SPEED_DEG_S } from "../../../../shared/capturePolicy.ts";

const DEG = Math.PI / 180;

/** How far back the speed estimate looks: long enough to average out sensor jitter, short enough to catch real motion. */
export const SPEED_WINDOW_MS = 200;
/** Extra aiming slack once a hold has started, so trembling at the circle's edge does not restart it. */
export const AIM_HYSTERESIS_DEG = 2;
/** Moving this far past the slack means the photographer left the point, so the hold restarts. */
const LOST_AIM_DEG = 4;
/** A wobble drains the hold this many times faster than steady time fills it. */
const DRAIN_RATE = 1.5;
/** Sensor gaps longer than this restart the speed window and the hold. */
const SENSOR_GAP_MS = 250;

export interface SteadyState {
  targetId: number;
  heldMs: number;
  lastAt: number;
}

// createSpeedTracker returns a function that turns each sample into a rotation speed averaged over SPEED_WINDOW_MS.
export function createSpeedTracker(windowMs = SPEED_WINDOW_MS): (sample: OrientationSample) => number {
  const recent: OrientationSample[] = [];
  return (sample) => {
    const last = recent[recent.length - 1];
    if (last && sample.timestamp - last.timestamp > SENSOR_GAP_MS) recent.length = 0;
    recent.push(sample);
    while (recent.length > 2 && sample.timestamp - recent[1].timestamp >= windowMs) recent.shift();
    const oldest = recent[0];
    const seconds = Math.max(windowMs / 4, sample.timestamp - oldest.timestamp) / 1000;
    return oldest.quaternion.angleTo(sample.quaternion) / DEG / seconds;
  };
}

interface SteadyInput {
  targetId: number;
  distance: number;
  tolerance: number;
  speed: number;
  now: number;
}

// advanceSteady fills the hold while the phone stays on the target and drains it, instead of restarting, on brief wobbles.
export function advanceSteady(prev: SteadyState | null, input: SteadyInput): SteadyState | null {
  const { targetId, distance, tolerance, speed, now } = input;
  const tracking = prev && prev.targetId === targetId && now - prev.lastAt <= SENSOR_GAP_MS ? prev : null;
  const onTarget = distance <= tolerance + (tracking ? AIM_HYSTERESIS_DEG : 0);
  const steady = onTarget && speed <= STEADY_SPEED_DEG_S;
  if (!tracking) return steady ? { targetId, heldMs: 0, lastAt: now } : null;
  if (distance > tolerance + AIM_HYSTERESIS_DEG + LOST_AIM_DEG) return null;
  const dt = Math.min(100, now - tracking.lastAt);
  const heldMs = steady ? tracking.heldMs + dt : tracking.heldMs - dt * DRAIN_RATE;
  return heldMs < 0 ? null : { targetId, heldMs, lastAt: now };
}

// steadyProgress is how full the aiming ring is (0..1), or null when no hold is in progress.
export function steadyProgress(state: SteadyState | null): number | null {
  return state ? Math.min(1, state.heldMs / STEADY_HOLD_MS) : null;
}
