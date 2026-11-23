export type OrientationQuat = [number, number, number, number];
export interface CaptureTarget {
  id: number;
  yaw: number;
  pitch: number;
  ring: 'horizon' | 'up' | 'down' | 'ceiling' | 'floor';
}

export const FRAME_LONG_SIDE = 1280;
export const FRAME_JPEG_QUALITY = 0.85;

/** GPS fix taken while recording, used by the backend to check the room was recorded at the listed house. */
export interface CaptureLocation {
  lat: number;
  lng: number;
  accuracy_m: number;
}

/** Optional measurements sent with a capture; older clients simply omit them. */
export interface CaptureExtras {
  camera_height_cm?: number;
  location?: CaptureLocation;
}

// buildCaptureManifest pairs raw JPEG indexes with identical backend quaternion metadata on both clients.
export function buildCaptureManifest(name: string, frames: { orientation: OrientationQuat }[], extras: CaptureExtras = {}) {
  return { name, frames: frames.map((frame, index) => ({ index, orientation: frame.orientation })), ...extras };
}

// buildCaptureTargets starts with three overlapping calibration views that are reused in the final panorama.
export function buildCaptureTargets(): CaptureTarget[] {
  return [0,20,40].map((yaw,id) => ({ id,yaw,pitch:0,ring:'horizon' }));
}

export interface CaptureCalibration {
  horizontal_fov: number;
  aspect_ratio: number;
  confidence: number;
  calibrated: boolean;
  targets: CaptureTarget[];
}

// calibratedTargets validates the server plan and ensures already captured calibration photos retain their ids.
export function calibratedTargets(calibration: CaptureCalibration): CaptureTarget[] {
  const targets = calibration.targets;
  if (!Array.isArray(targets) || targets.length<8 || targets.length>48) throw new Error('Rencana capture server tidak valid.');
  for (const [i,t] of targets.entries()) {
    if (!t || t.id!==i || !Number.isFinite(t.yaw) || !Number.isFinite(t.pitch) || t.yaw<0 || t.yaw>=360 || Math.abs(t.pitch)>90 ||
      !['horizon','up','down','ceiling','floor'].includes(t.ring)) throw new Error('Arah capture server tidak valid.');
  }
  if (buildCaptureTargets().some((t,i) => targets[i].yaw!==t.yaw || targets[i].pitch!==0)) throw new Error('Foto kalibrasi tidak cocok dengan rencana server.');
  return targets;
}
