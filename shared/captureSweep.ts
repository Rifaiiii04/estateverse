import type { OrientationQuat } from './capturePolicy.ts';

// A slow continuous turn leaves time to expose a frame inside the planned overlap.
export const SWEEP_MAX_SPEED_DEG_S = 15;
export const SWEEP_AIM_DEG = 2.5;
export const SWEEP_SHUTTER_DRIFT_DEG = 2;
const MAX_SIDEWAYS_TILT_DEG = 12;

// Checks that the camera's right edge follows the planned ring, including at the ceiling and floor.
export function isSweepLevel([w, x, y, z]: OrientationQuat, targetYaw: number): boolean {
  const heading = targetYaw * Math.PI / 180;
  const rightX = 1 - 2 * (y * y + z * z);
  const rightZ = 2 * (x * z - w * y);
  const alignment = rightX * Math.cos(heading) + rightZ * Math.sin(heading);
  return alignment >= Math.cos(MAX_SIDEWAYS_TILT_DEG * Math.PI / 180);
}
