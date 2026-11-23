import { targetDistance } from '../../../../shared/captureMath.ts';
import type { CaptureTarget, OrientationQuat } from '../../../../shared/capturePolicy.ts';
import { isSweepLevel, SWEEP_AIM_DEG, SWEEP_MAX_SPEED_DEG_S } from '../../../../shared/captureSweep.ts';
import { rotationMatrix } from '../../../../shared/sweepImage.ts';

const RAD = Math.PI / 180;

// sweepGuidance projects the next direction onto the phone axes, even when its lens points at a pole.
export function sweepGuidance(pose: OrientationQuat | undefined, target: CaptureTarget, speed: number, started: boolean) {
  if (!pose) return { arrow: '◎', hint: 'Arahkan kamera setinggi mata.' };
  const yaw = target.yaw * RAD, pitch = target.pitch * RAD;
  const x = Math.sin(yaw) * Math.cos(pitch), y = Math.sin(pitch), z = -Math.cos(yaw) * Math.cos(pitch);
  const r = rotationMatrix(pose);
  const right = r[0] * x + r[3] * y + r[6] * z;
  const up = r[1] * x + r[4] * y + r[7] * z;
  if (targetDistance(pose, target.yaw, target.pitch) > SWEEP_AIM_DEG) {
    if (Math.abs(up) > Math.abs(right)) return up > 0
      ? { arrow: '↑', hint: 'Angkat sedikit arah kamera.' }
      : { arrow: '↓', hint: 'Turunkan sedikit arah kamera.' };
    return right >= 0
      ? { arrow: '→', hint: 'Sapu perlahan ke kanan dari posisi lensa yang sama.' }
      : { arrow: '←', hint: 'Geser kembali ke kiri untuk mengisi bagian yang terlewat.' };
  }
  if (!isSweepLevel(pose, target.yaw)) {
    const desiredRightUp = Math.cos(yaw) * r[1] + Math.sin(yaw) * r[7];
    return desiredRightUp > 0
      ? { arrow: '↶', hint: 'Putar sedikit HP ke kiri dengan lensa tetap mengarah ke sini.' }
      : { arrow: '↷', hint: 'Putar sedikit HP ke kanan dengan lensa tetap mengarah ke sini.' };
  }
  if (speed > SWEEP_MAX_SPEED_DEG_S) return { arrow: '◎', hint: 'Perlambat putaran agar gambar tetap tajam.' };
  return { arrow: '◎', hint: started ? 'Pertahankan arah sebentar sampai strip bertambah.' : 'Merekam awal sapuan…' };
}
