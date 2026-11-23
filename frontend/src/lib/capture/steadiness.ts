import type { OrientationSample } from "./orientation.ts";

const DEG = Math.PI / 180;

/** How far back the speed estimate looks: long enough to average out sensor jitter, short enough to catch real motion. */
export const SPEED_WINDOW_MS = 200;
/** Longer gaps start a fresh window when motion events resume. */
const SENSOR_GAP_MS = 250;

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
