import { multiplyQuat } from './captureMath.ts';
import { overlapScore, type SweepImage, type SweepPixels } from './sweepImage.ts';

const RAD = Math.PI / 180;

// Averages all camera pixels in one thumbnail cell to avoid false matches on fine patterns such as tiles.
function averageCell(src: SweepPixels, left: number, top: number, right: number, bottom: number) {
  let sum = 0;
  for (let y = top; y < bottom; y++) {
    const end = (y * src.width + right) * 4;
    for (let i = (y * src.width + left) * 4; i < end; i += 4) {
      sum += src.data[i] + 2 * src.data[i + 1] + src.data[i + 2];
    }
  }
  return sum / (4 * (right - left) * (bottom - top));
}

// Reduces a temporary camera buffer to a small registration image, leaving the original for rendering.
export function registrationSample(frame: SweepImage): SweepImage {
  const src = frame.pixels;
  const width = Math.min(96, src.width), height = Math.max(1, Math.round(src.height * width / src.width));
  if (width === src.width) return frame;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    const top = Math.floor(y * src.height / height);
    const bottom = Math.floor((y + 1) * src.height / height);
    for (let x = 0; x < width; x++) {
      const left = Math.floor(x * src.width / width);
      const right = Math.floor((x + 1) * src.width / width);
      const level = averageCell(src, left, top, right, bottom);
      const to = (y * width + x) * 4;
      data[to] = data[to + 1] = data[to + 2] = level;
      data[to + 3] = 255;
    }
  }
  return { pose: frame.pose, pixels: { width, height, data } };
}

// Measures horizontal lens angle against two independent overlaps before any pixels are projected.
export function measureSweepLens(samples: SweepImage[]) {
  let bestScore = -1, best = 0;
  for (let fov = 26; fov <= 100; fov += 1) {
    const a = overlapScore(samples[1], samples[0], fov);
    const b = overlapScore(samples[2], samples[0], fov);
    const c = overlapScore(samples[2], samples[1], fov);
    if (typeof a !== 'number' || typeof c !== 'number') continue;
    const score = typeof b === 'number' ? (a + 2 * b + c) / 4 : (a + c) / 2 - .08;
    if (score > bestScore) { bestScore = score; best = fov; }
  }
  return bestScore >= .65 ? best : null;
}

// Refines small sensor errors using the visible overlap and keeps gravity and the original heading as anchors.
export function registerView(frame: SweepImage, neighbor: SweepImage, fov: number) {
  const initial = overlapScore(frame, neighbor, fov);
  if (initial === null || (typeof initial === 'number' && initial > .975)) return frame.pose;
  let score = initial ?? -1, best = frame.pose;
  for (const yaw of [0, -1, 1, -2, 2]) {
    for (const pitch of [0, -1, 1]) {
      if (!yaw && !pitch) continue;
      const halfYaw = -yaw * RAD / 2, halfPitch = pitch * RAD / 2;
      const tilted = multiplyQuat(frame.pose, [Math.cos(halfPitch), Math.sin(halfPitch), 0, 0]);
      const pose = multiplyQuat([Math.cos(halfYaw), 0, Math.sin(halfYaw), 0], tilted);
      const match = overlapScore({ ...frame, pose }, neighbor, fov);
      const adjusted = (match ?? -1) - .008 * (Math.abs(yaw) + Math.abs(pitch));
      if (adjusted > score) { score = adjusted; best = pose; }
    }
  }
  return score >= .35 ? best : null;
}
