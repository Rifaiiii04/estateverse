import { quaternionDistance } from '../../../../shared/captureMath.ts';
import type { OrientationQuat } from '../../../../shared/capturePolicy.ts';
import { SWEEP_MAX_SPEED_DEG_S, SWEEP_SHUTTER_DRIFT_DEG } from '../../../../shared/captureSweep.ts';
import type { MotionSample } from './motion';

const MAX_SAMPLE_GAP_MS = 250;
const SPEED_WINDOW_MS = 180;

// SweepMotion measures camera rotation over a short window and bounds uncertainty during a native still.
export class SweepMotion {
  latest: MotionSample | null = null;
  speed = Infinity;
  private samples: MotionSample[] = [];
  private shutter: MotionSample | null = null;
  private shutterTravel = 0;

  // observe keeps roll in the speed estimate and invalidates a shutter whose sensor feed stalled.
  observe(next: MotionSample) {
    if (this.latest && next.timestamp - this.latest.timestamp > MAX_SAMPLE_GAP_MS) {
      this.samples = [];
      if (this.shutter) this.shutterTravel = Infinity;
    }
    if (this.shutter && this.latest) this.shutterTravel += quaternionDistance(this.latest.quaternion, next.quaternion);
    this.latest = next;
    this.samples.push(next);
    while (this.samples.length > 2 && this.samples[1].timestamp < next.timestamp - SPEED_WINDOW_MS) this.samples.shift();
    const duration = next.timestamp - this.samples[0].timestamp;
    let distance = 0;
    for (let i = 1; i < this.samples.length; i++) {
      distance += quaternionDistance(this.samples[i - 1].quaternion, this.samples[i].quaternion);
    }
    this.speed = duration >= SPEED_WINDOW_MS / 2 ? distance * 1000 / duration : Infinity;
  }

  // canExpose allows a sample at any heading once the phone is moving slowly enough.
  canExpose() {
    return this.latest !== null && this.speed <= SWEEP_MAX_SPEED_DEG_S;
  }

  // beginShutter opens an exposure window at the sensor reading that triggered the camera.
  beginShutter(initial: MotionSample) {
    this.shutter = initial;
    this.shutterTravel = 0;
  }

  // finishShutter brackets the unknown exposure instant within a slow turn using its midpoint orientation.
  finishShutter(now: number): OrientationQuat {
    const start = this.shutter?.quaternion;
    this.shutter = null;
    if (!start || !this.latest || this.shutterTravel > 2 * SWEEP_SHUTTER_DRIFT_DEG || now - this.latest.timestamp > MAX_SAMPLE_GAP_MS) {
      throw new Error('Perlambat putaran agar kamera bisa menyambung panorama.');
    }
    const end = this.latest.quaternion;
    const sign = start.reduce((sum, value, i) => sum + value * end[i], 0) < 0 ? -1 : 1;
    const midpoint = start.map((value, i) => value + sign * end[i]);
    const norm = Math.hypot(...midpoint);
    return midpoint.map(value => value / norm) as OrientationQuat;
  }
}
