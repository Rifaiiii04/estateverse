import { multiplyQuat, quaternionDistance } from "./captureMath.ts";
import type { OrientationQuat } from "./capturePolicy.ts";

export interface SweepPixels {
  width: number;
  height: number;
  data: ArrayLike<number>;
}

export interface SweepImage {
  pixels: SweepPixels;
  pose: OrientationQuat;
}

const RAD = Math.PI / 180;

// Converts a camera rotation to a row-major matrix for repeated pixel projections.
export function rotationMatrix([w, x, y, z]: OrientationQuat) {
  return [
    1 - 2*(y*y + z*z), 2*(x*y - w*z), 2*(x*z + w*y),
    2*(x*y + w*z), 1 - 2*(x*x + z*z), 2*(y*z - w*x),
    2*(x*z - w*y), 2*(y*z + w*x), 1 - 2*(x*x + y*y),
  ];
}

// Returns the focal length in thumbnail pixels for an uncropped rectilinear camera.
export function focalLength(image: SweepImage, hfov: number) {
  return image.pixels.width / (2 * Math.tan(hfov * RAD / 2));
}

// Projects a local camera direction onto a thumbnail, dropping rays outside the photographed area.
export function pixelOffset(pixels: SweepPixels, dx: number, dy: number, dz: number, focal: number) {
  if (dz >= 0) return -1;
  const x = Math.floor(pixels.width / 2 - focal * dx / dz);
  const y = Math.floor(pixels.height / 2 + focal * dy / dz);
  return x < 0 || y < 0 || x >= pixels.width || y >= pixels.height ? -1 : (y * pixels.width + x) * 4;
}

// Reads thumbnail luminance without allocating a separate image for every candidate.
function luminance(pixels: SweepPixels, offset: number) {
  const rgb = pixels.data;
  return (rgb[offset] + 2 * rgb[offset + 1] + rgb[offset + 2]) / 4;
}

// Detects a frozen preview being reported at a new heading without mistaking a plain wall for a duplicate.
function isFrozenFrame(current: SweepPixels, previous: SweepPixels) {
  if (current.width !== previous.width || current.height !== previous.height) return false;
  let low = 255, high = 0;
  for (let i = 0; i < current.data.length; i += 28) {
    const light = luminance(current, i);
    if (Math.abs(light - luminance(previous, i)) > 1) return false;
    low = Math.min(low, light);
    high = Math.max(high, light);
  }
  return high - low >= 32;
}

// Correlates samples at corresponding scene rays and discounts changes in overall brightness.
export function overlapScore(current: SweepImage, previous: SweepImage, hfov: number): number | null | undefined {
  const { pixels } = current;
  const [w, x, y, z] = previous.pose;
  const rotation = rotationMatrix(multiplyQuat([w, -x, -y, -z], current.pose));
  const focal = focalLength(current, hfov);
  const otherFocal = focalLength(previous, hfov);
  const step = Math.max(1, Math.round(pixels.width / 32));
  let count = 0, a = 0, b = 0, aa = 0, bb = 0, ab = 0;
  for (let y = 1; y < pixels.height; y += step) {
    for (let x = 1; x < pixels.width; x += step) {
      const u = x + 0.5 - pixels.width / 2;
      const v = pixels.height / 2 - y - 0.5;
      const dx = rotation[0] * u + rotation[1] * v - rotation[2] * focal;
      const dy = rotation[3] * u + rotation[4] * v - rotation[5] * focal;
      const dz = rotation[6] * u + rotation[7] * v - rotation[8] * focal;
      const offset = pixelOffset(previous.pixels, dx, dy, dz, otherFocal);
      if (offset < 0) continue;
      const left = luminance(pixels, (y * pixels.width + x) * 4);
      const right = luminance(previous.pixels, offset);
      count++;
      a += left;
      b += right;
      aa += left * left;
      bb += right * right;
      ab += left * right;
    }
  }
  if (count < 30) return undefined;
  const varianceA = aa - a * a / count;
  const varianceB = bb - b * b / count;
  if (Math.min(varianceA, varianceB) < 36 * count) return null;
  return (ab - a * b / count) / Math.sqrt(varianceA * varianceB);
}

// Rejects conflicting textured views while permitting a slower sweep across featureless walls and ceilings.
export function checkSweepImage(current: SweepImage, history: SweepImage[], measuredFov: number | null, speed: number) {
  let light = 0;
  const { pixels } = current;
  for (let i = 0; i < pixels.data.length; i += 16) light += luminance(pixels, i);
  const average = light / Math.ceil(pixels.data.length / 16);
  if (average < 7 || average > 250) return "Detail ruangan tidak terlihat. Periksa cahaya dan lensa kamera.";
  if (!history.length) return "";
  if (isFrozenFrame(pixels, history[history.length - 1].pixels)) return "Gambar kamera belum berubah. Periksa kamera, lalu ulangi bagian ini.";
  const neighbors = history.slice().sort((a, b) => quaternionDistance(a.pose, current.pose) - quaternionDistance(b.pose, current.pose)).slice(0, 4);
  const fovs = measuredFov ? [measuredFov * .96, measuredFov, measuredFov * 1.04] : [34, 42, 50, 60, 72];
  let hasTexture = false;
  let hasOverlap = false;
  for (const neighbor of neighbors) {
    for (const fov of fovs) {
      const score = overlapScore(current, neighbor, fov);
      if (score === undefined) continue;
      hasOverlap = true;
      if (score === null) continue;
      hasTexture = true;
      if (score >= 0.32) return "";
    }
  }
  if (hasTexture || !hasOverlap) return "Gambar belum menyambung. Ikuti panah kembali dan putar dari posisi lensa yang sama.";
  return speed > 4 ? "Detail di sini sedikit. Perlambat sapuan agar gambar bisa disimpan." : "";
}
