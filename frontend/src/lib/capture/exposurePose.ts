import type { OrientationSample } from "./orientation.ts";

const HISTORY_MS = 1000;
const SAMPLE_SLOP_MS = 125;

// Selects the exposure timestamp from the same monotonic clock used for the sensor history.
export function frameTime(now: number, metadata?: Pick<VideoFrameCallbackMetadata, "captureTime" | "presentationTime">) {
  for (const timestamp of [metadata?.captureTime, metadata?.presentationTime]) {
    if (typeof timestamp === "number" && timestamp > 0 && timestamp <= now && now - timestamp <= HISTORY_MS) return timestamp;
  }
  return now;
}

// Retains recent sensor rotations and interpolates at exposure time, including across the heading wrap.
export class ExposurePoses {
  private samples: OrientationSample[] = [];

  // Adds the latest orientation and discards samples older than any supported camera delay.
  add(sample: OrientationSample) {
    const last = this.samples[this.samples.length - 1];
    if (last && last.timestamp > sample.timestamp) this.samples.length = 0;
    this.samples.push(sample);
    while (this.samples.length > 2 && sample.timestamp - this.samples[1].timestamp > HISTORY_MS) this.samples.shift();
  }

  // Estimates the orientation of the exposed pixels and skips frames falling inside a sensor dropout.
  at(time: number) {
    const right = this.samples.findIndex((s) => s.timestamp >= time);
    const before = this.samples[right === -1 ? this.samples.length - 1 : right - 1];
    const after = this.samples[right];
    if (after && after.timestamp === time) return after.quaternion;
    if (!before) return after && after.timestamp - time <= SAMPLE_SLOP_MS ? after.quaternion : null;
    if (!after) return time - before.timestamp <= SAMPLE_SLOP_MS ? before.quaternion : null;
    const interval = after.timestamp - before.timestamp;
    if (interval > SAMPLE_SLOP_MS * 2) return null;
    return before.quaternion.clone().slerp(after.quaternion, (time - before.timestamp) / interval);
  }
}
