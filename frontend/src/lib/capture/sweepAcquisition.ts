import type { CapturedFrame } from "@/types/tour";
import { isSweepLevel, SWEEP_AIM_DEG, SWEEP_MAX_SPEED_DEG_S, SWEEP_SHUTTER_DRIFT_DEG } from "../../../../shared/captureSweep.ts";
import { checkSweepImage, type SweepImage } from "../../../../shared/sweepImage.ts";
import { targetDistance } from "../../../../shared/captureMath.ts";
import type { CaptureTarget } from "./captureTargets.ts";
import { toWireQuat, type OrientationSample } from "./orientation.ts";
import { grabFrame } from "./frameGrabber.ts";
import { readSweepImage } from "./sweepPreview.ts";

export const STALE_POSE_MS = 300;

export interface LiveSweep {
  sample: OrientationSample | null;
  speed: number;
}

// Tests the actual optical axis and roll against the next strip position throughout a moving exposure.
export function withinSweepWindow(sample: OrientationSample, target: CaptureTarget) {
  const pose = toWireQuat(sample.quaternion);
  return targetDistance(pose, target.yaw, target.pitch) <= SWEEP_AIM_DEG && isSweepLevel(pose, target.yaw);
}

interface ExposureRequest {
  video: HTMLVideoElement;
  live: LiveSweep;
  target: CaptureTarget;
  startPose: OrientationSample;
  history: SweepImage[];
  hfov: number | null;
  active: () => boolean;
}

// Pairs the thumbnail, JPEG and quaternion in one video callback, discarding interrupted or misaligned exposures.
export async function recordExposure(request: ExposureRequest) {
  const { target, startPose, live, video, history, hfov } = request;
  let image: SweepImage | undefined;
  const blob = await grabFrame(video, () => {
    const now = live.sample;
    if (!request.active() || !now || performance.now() - now.timestamp > STALE_POSE_MS ||
      live.speed > SWEEP_MAX_SPEED_DEG_S || !withinSweepWindow(now, target) ||
      startPose.quaternion.angleTo(now.quaternion) * 180 / Math.PI > SWEEP_SHUTTER_DRIFT_DEG) {
      throw new Error("Perlambat sapuan dan ikuti panah sampai gambar tersambung.");
    }
    image = readSweepImage(video, toWireQuat(now.quaternion));
    const issue = checkSweepImage(image, history, hfov, live.speed);
    if (issue) throw new Error(issue);
  });
  if (!image) throw new Error("Kamera belum mengirim gambar.");
  const frame: CapturedFrame = { targetId: target.id, blob, orientation: image.pose };
  return { image, frame };
}
