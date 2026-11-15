import { cameraQuaternion } from '../../../../shared/captureMath.ts';
import type { OrientationQuat } from '../../../../shared/capturePolicy.ts';

// nativePose adapts Expo's radian rotation sample to the web-compatible rear-camera quaternion convention.
export function nativePose(rotation: { alpha: number; beta: number; gamma: number }, screenAngle = 0): OrientationQuat {
  return cameraQuaternion(rotation.alpha, rotation.beta, rotation.gamma, screenAngle);
}
