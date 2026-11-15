import type { OrientationQuat } from './capturePolicy.ts';

const DEG = Math.PI / 180;

// multiplyQuat composes camera-to-world rotations serialized in backend (w, x, y, z) order.
export function multiplyQuat(a: OrientationQuat, b: OrientationQuat): OrientationQuat {
  const [w, x, y, z] = a;
  const [v, i, j, k] = b;
  return [w*v-x*i-y*j-z*k, w*i+x*v+y*k-z*j, w*j-x*k+y*v+z*i, w*k+x*j-y*i+z*v];
}

// cameraQuaternion converts W3C-compatible radians into the rear camera frame used by the Go stitcher.
export function cameraQuaternion(alpha: number, beta: number, gamma: number, screenDeg = 0): OrientationQuat {
  const c1 = Math.cos(beta/2), c2 = Math.cos(alpha/2), c3 = Math.cos(-gamma/2);
  const s1 = Math.sin(beta/2), s2 = Math.sin(alpha/2), s3 = Math.sin(-gamma/2);
  const euler: OrientationQuat = [c1*c2*c3+s1*s2*s3, s1*c2*c3+c1*s2*s3,
    c1*s2*c3-s1*c2*s3, c1*c2*s3-s1*s2*c3];
  const back = multiplyQuat(euler, [Math.SQRT1_2, -Math.SQRT1_2, 0, 0]);
  return multiplyQuat(back, [Math.cos(screenDeg*DEG/2), 0, 0, -Math.sin(screenDeg*DEG/2)]);
}

// forwardDirection extracts the optical axis without depending on a rendering library.
export function forwardDirection([w, x, y, z]: OrientationQuat) {
  return { x: -2*(x*z+w*y), y: 2*(w*x-y*z), z: 2*(x*x+y*y)-1 };
}

// poseAngles converts an optical axis into the common yaw and pitch convention in degrees.
export function poseAngles(q: OrientationQuat) {
  const d = forwardDirection(q);
  return { yaw: (Math.atan2(d.x, -d.z)/DEG+360)%360, pitch: Math.asin(Math.max(-1, Math.min(1, d.y)))/DEG };
}

// quaternionDistance measures full rotation including roll, ignoring equivalent quaternion signs.
export function quaternionDistance(a: OrientationQuat, b: OrientationQuat): number {
  const dot = a.reduce((sum, v, i) => sum+v*b[i], 0);
  return 2*Math.acos(Math.min(1, Math.abs(dot)))/DEG;
}

// relativeHeadingRotation makes the first capture direction the shared zero heading while preserving gravity.
export function relativeHeadingRotation(q: OrientationQuat): OrientationQuat {
  const yaw = poseAngles(q).yaw*DEG;
  return [Math.cos(yaw/2), 0, Math.sin(yaw/2), 0];
}

// targetDistance returns the angular aiming error for a target on the capture sphere.
export function targetDistance(q: OrientationQuat, yaw: number, pitch: number): number {
  const d = forwardDirection(q), y = yaw*DEG, p = pitch*DEG;
  const dot = d.x*Math.cos(p)*Math.sin(y)+d.y*Math.sin(p)-d.z*Math.cos(p)*Math.cos(y);
  return Math.acos(Math.max(-1, Math.min(1, dot)))/DEG;
}
