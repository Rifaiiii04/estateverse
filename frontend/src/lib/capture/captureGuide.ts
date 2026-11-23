import { Quaternion } from "three";
import { isSweepLevel, SWEEP_AIM_DEG, SWEEP_MAX_SPEED_DEG_S } from "../../../../shared/captureSweep.ts";
import { directionFromAngles } from "./captureTargets.ts";
import { toWireQuat } from "./orientation.ts";
import type { CaptureTarget } from "./captureTargets.ts";

const RAD = 180 / Math.PI;

export interface CaptureStage {
  index: number;
  total: number;
  label: string;
}

const STAGE_LABELS: Record<CaptureTarget["ring"], string> = {
  horizon: "Setinggi mata",
  up: "Atas",
  down: "Bawah",
  ceiling: "Plafon",
  floor: "Lantai",
};

const STAGE_ENTRY: Record<CaptureTarget["ring"], string> = {
  horizon: "Arahkan HP lurus ke depan",
  up: "Putaran selesai! Dongakkan HP ke atas tanpa memutar badan",
  down: "Sekarang tundukkan HP ke bawah tanpa memutar badan",
  ceiling: "Sekarang arahkan HP lurus ke plafon",
  floor: "Terakhir, arahkan HP lurus ke lantai",
};

// captureStage tells which sweep of the sequential path a target belongs to, counting one stage per tilt level.
export function captureStage(targets: CaptureTarget[], target: CaptureTarget): CaptureStage {
  let index = 0;
  let total = 0;
  targets.forEach((t, i) => {
    if (i === 0 || t.pitch !== targets[i - 1].pitch) total++;
    if (t.id === target.id) index = total - 1;
  });
  return { index, total, label: STAGE_LABELS[target.ring] };
}

/** Orientation and angular speed measured at the current point of the sweep. */
export interface GuidePose {
  quaternion: Quaternion;
  speed: number;
}

// guideHint turns the offset between the live camera and the next target into one short instruction.
export function guideHint(targets: CaptureTarget[], target: CaptureTarget, pose: GuidePose): string {
  if (pose.speed > SWEEP_MAX_SPEED_DEG_S) return "Terlalu cepat. Perlambat putaran HP.";
  const c = directionFromAngles(target.yaw, target.pitch).applyQuaternion(pose.quaternion.clone().invert());
  const off = Math.acos(Math.max(-1, Math.min(1, -c.z))) * RAD;
  if (off < 4 && !isSweepLevel(toWireQuat(pose.quaternion), target.yaw)) return "Luruskan sisi HP mengikuti arah sapuan.";
  if (off <= SWEEP_AIM_DEG) return "Teruskan sapuan pelan. Gambar diambil otomatis.";
  const index = targets.findIndex((t) => t.id === target.id);
  const previous = index > 0 ? targets[index - 1] : null;
  if (previous && previous.pitch !== target.pitch && off > 15) return STAGE_ENTRY[target.ring];
  const sideways = Math.atan2(c.x, -c.z) * RAD;
  const vertical = Math.atan2(c.y, Math.hypot(c.x, c.z)) * RAD;
  if (Math.abs(vertical) > Math.abs(sideways)) {
    return vertical > 0 ? "Naikkan arah HP sedikit" : "Turunkan arah HP sedikit";
  }
  return sideways > 0 ? "Sapu pelan ke kanan mengikuti panah" : "Kembali sedikit ke kiri mengikuti panah";
}
