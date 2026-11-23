import { quaternionDistance, targetDistance } from '../../../../shared/captureMath.ts';
import type { CaptureTarget } from '../../../../shared/capturePolicy.ts';
import { isSweepLevel, SWEEP_AIM_DEG, SWEEP_MAX_SPEED_DEG_S, SWEEP_SHUTTER_DRIFT_DEG } from '../../../../shared/captureSweep.ts';
import type { MotionSample } from './motion';

const MAX_SAMPLE_GAP_MS = 250;
const SPEED_WINDOW_MS = 180;

// SweepMotion measures camera rotation over a short window and bounds uncertainty during a native still.
export class SweepMotion {
  latest: MotionSample | null = null;
  speed = Infinity;
  private samples: MotionSample[] = [];
  private shutter: MotionSample | null = null;
  private excursion = 0;

  // observe keeps roll in the speed estimate and invalidates a shutter whose sensor feed stalled.
  observe(next: MotionSample) {
    if (this.latest && next.timestamp - this.latest.timestamp > MAX_SAMPLE_GAP_MS) {
      this.samples = [];
      if (this.shutter) this.excursion = Infinity;
    }
    this.latest = next;
    this.samples.push(next);
    while (this.samples.length > 2 && this.samples[1].timestamp < next.timestamp - SPEED_WINDOW_MS) this.samples.shift();
    const duration = next.timestamp - this.samples[0].timestamp;
    let distance = 0;
    for (let i = 1; i < this.samples.length; i++) {
      distance += quaternionDistance(this.samples[i - 1].quaternion, this.samples[i].quaternion);
    }
    this.speed = duration >= SPEED_WINDOW_MS / 2 ? distance * 1000 / duration : Infinity;
    if (this.shutter) this.excursion = Math.max(this.excursion, quaternionDistance(next.quaternion, this.shutter.quaternion));
  }

  // canExpose triggers inside the overlap band during a slow continuous pass.
  canExpose(target: CaptureTarget) {
    const pose = this.latest?.quaternion;
    return pose && this.speed <= SWEEP_MAX_SPEED_DEG_S && isSweepLevel(pose, target.yaw)
      && targetDistance(pose, target.yaw, target.pitch) <= SWEEP_AIM_DEG;
  }

  // beginShutter opens an exposure window at the sensor reading that triggered the camera.
  beginShutter(initial: MotionSample) {
    this.shutter = initial;
    this.excursion = 0;
  }

  // finishShutter rejects stale or moving exposures that could place scene details on the wrong ray.
  finishShutter(now: number) {
    this.shutter = null;
    if (!this.latest || this.excursion > SWEEP_SHUTTER_DRIFT_DEG || now - this.latest.timestamp > MAX_SAMPLE_GAP_MS) {
      throw new Error('Perlambat sampai strip bertambah. Kembali ke bagian yang terlewat.');
    }
  }
}
