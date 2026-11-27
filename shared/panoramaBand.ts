import { focalLength, rotationMatrix, type SweepImage, type SweepPixels } from './sweepImage.ts';
import { poseAngles } from './captureMath.ts';

export interface PanoramaBand { index: number; pitch: number; min_pitch: number; max_pitch: number }
export interface PanoramaPixels { width: number; height: number; data: Uint8ClampedArray }
const RAD = Math.PI / 180;

// Chooses the fewest complete, overlapping latitude strips for the measured portrait lens.
export function planBands(fov: number, aspect: number): PanoramaBand[] {
  const halfHeight = Math.atan(Math.tan(fov * RAD / 2) / aspect) / RAD;
  if (halfHeight < 24) throw new Error('Bidang kamera terlalu sempit. Gunakan kamera belakang tanpa zoom dan pegang HP tegak.');
  const spacing = halfHeight >= 38 ? 60 : 36;
  const pitches = spacing === 60 ? [0, 60, -60] : [0, 36, 72, -36, -72];
  const reach = spacing / 2 + 3;
  return pitches.map((pitch, index) => ({ index, pitch, min_pitch: Math.max(-90, pitch - reach), max_pitch: Math.min(90, pitch + reach) }));
}

type Geometry = { matrix: number[]; focal: number; yaw: number; pitch: number; radius: number };

// Bounds projection work to the longitude interval intersected by the camera cone at this latitude.
function columnRange(sinLat: number, cosLat: number, width: number, g: Geometry) {
  const edge = (Math.cos(g.radius) - sinLat * Math.sin(g.pitch)) / (cosLat * Math.cos(g.pitch));
  const span = edge <= -1 ? Math.PI : Math.acos(Math.min(1, edge));
  const x = (.5 + g.yaw / (2 * Math.PI)) * width;
  const r = Math.ceil(span * width / (2 * Math.PI)) + 1;
  const start = Math.floor(x) - r;
  return { start, end: start + Math.min(width, 2 * r + 1) };
}

// Samples the original camera exposure using bilinear interpolation for subpixel alignment.
function paint(dst: Uint8ClampedArray, i: number, src: SweepPixels, u: number, v: number, mix: number, gain: number) {
  const x = Math.floor(u), y = Math.floor(v), fx = u - x, fy = v - y;
  const a = (y * src.width + x) * 4, b = a + src.width * 4;
  for (let c = 0; c < 3; c++) {
    const upper = src.data[a + c] * (1 - fx) + src.data[a + 4 + c] * fx;
    const lower = src.data[b + c] * (1 - fx) + src.data[b + 4 + c] * fx;
    dst[i + c] += mix * (gain * (upper * (1 - fy) + lower * fy) - dst[i + c]);
  }
  dst[i + 3] = 255;
}

// Holds only the current panoramic strip and tracks genuine coverage for every output pixel.
export class BandCanvas {
  readonly pixels: PanoramaPixels;
  private scores: Uint8Array;
  private sinLon: Float64Array;
  private cosLon: Float64Array;
  private observed = 0;
  private band: PanoramaBand;

  // Allocates a crop of a single global equirectangular canvas with the forward direction in its center.
  constructor(width: number, band: PanoramaBand) {
    this.band = band;
    const height = Math.round(width * (band.max_pitch - band.min_pitch) / 360);
    this.pixels = { width, height, data: new Uint8ClampedArray(width * height * 4) };
    this.scores = new Uint8Array(width * height);
    this.sinLon = new Float64Array(width);
    this.cosLon = new Float64Array(width);
    for (let x = 0; x < width; x++) {
      const a = ((x + .5) / width - .5) * Math.PI * 2;
      this.sinLon[x] = Math.sin(a); this.cosLon[x] = Math.cos(a);
    }
  }

  // Reports the fraction of the actual delivered crop that has observed scenery.
  get coverage() { return this.observed / this.scores.length; }

  // Locates a missing camera direction when a hand-held pass wandered away from its intended elevation.
  missingDirection() {
    const first = this.scores.indexOf(0);
    const row = Math.floor(first / this.pixels.width);
    return {
      yaw: ((first % this.pixels.width + .5) / this.pixels.width * 360 + 180) % 360,
      pitch: this.band.max_pitch - (row + .5) * (this.band.max_pitch - this.band.min_pitch) / this.pixels.height,
    };
  }

  // Maps the real exposure onto the strip, tapering joins between neighboring images.
  add(frame: SweepImage, fov: number) {
    const [w, x, y, z] = frame.pose;
    const focal = focalLength(frame, fov);
    const angles = poseAngles(frame.pose);
    const geometry = {
      matrix: rotationMatrix([w, -x, -y, -z]), focal, yaw: angles.yaw * RAD, pitch: angles.pitch * RAD,
      radius: Math.atan(Math.hypot(frame.pixels.width, frame.pixels.height) / (2 * focal))
    };
    const gain = this.exposureGain(frame, geometry);
    for (let row = 0; row < this.pixels.height; row++) this.renderRow(frame.pixels, geometry, gain, row);
  }

  // Matches brightness to a sparse sample of previously painted rays with bounded exposure correction.
  private exposureGain(frame: SweepImage, g: Geometry) {
    const { width, height, data } = this.pixels;
    const m = rotationMatrix(frame.pose), src = frame.pixels;
    let old = 0, fresh = 0, count = 0;
    const step = Math.max(1, Math.floor(src.width / 18));
    for (let y = step; y < src.height; y += step) {
      for (let x = step; x < src.width; x += step) {
        const u = x + .5 - src.width / 2, v = src.height / 2 - y - .5;
        const dx = m[0] * u + m[1] * v - m[2] * g.focal, dy = m[3] * u + m[4] * v - m[5] * g.focal, dz = m[6] * u + m[7] * v - m[8] * g.focal;
        const lat = Math.atan2(dy, Math.hypot(dx, dz)) / RAD;
        const row = Math.floor((this.band.max_pitch - lat) * height / (this.band.max_pitch - this.band.min_pitch));
        const col = Math.floor((Math.atan2(dx, -dz) / (2 * Math.PI) + .5) * width) % width;
        const i = row * width + col, j = 4 * (y * src.width + x);
        if (row < 0 || row >= height || !this.scores[i]) continue;
        old += data[4 * i] + 2 * data[4 * i + 1] + data[4 * i + 2];
        fresh += src.data[j] + 2 * src.data[j + 1] + src.data[j + 2]; count++;
      }
    }
    return count < 12 || fresh === 0 ? 1 : Math.max(.80, Math.min(1.25, .15 + .85 * old / fresh));
  }

  // Inverse-projects one output row and favors camera pixels further from the sensor edges.
  private renderRow(src: SweepPixels, g: Geometry, gain: number, row: number) {
    const { width, height, data } = this.pixels;
    const lat = (this.band.max_pitch - (row + .5) * (this.band.max_pitch - this.band.min_pitch) / height) * RAD;
    const sy = Math.sin(lat), cp = Math.cos(lat), m = g.matrix;
    const { start, end } = columnRange(sy, cp, width, g);
    for (let col = start; col < end; col++) {
      const x = (col % width + width) % width, dx = cp * this.sinLon[x], dz = -cp * this.cosLon[x];
      const depth = -(m[6] * dx + m[7] * sy + m[8] * dz);
      if (depth <= 0) continue;
      const scale = g.focal / depth;
      const u = (src.width - 1) / 2 + scale * (m[0] * dx + m[1] * sy + m[2] * dz);
      const v = (src.height - 1) / 2 - scale * (m[3] * dx + m[4] * sy + m[5] * dz);
      if (u < 0 || v < 0 || u >= src.width - 1 || v >= src.height - 1) continue;
      const edge = Math.min(u, src.width - 1 - u, v, src.height - 1 - v);
      const score = 1 + Math.round(250 * depth * Math.min(1, (edge + 1) / (.15 * src.width)));
      const i = row * width + x, previous = this.scores[i];
      if (score <= previous) continue;
      if (!previous) this.observed++;
      const mix = previous ? Math.min(1, (score - previous) / 7) : 1;
      paint(data, i * 4, src, u, v, mix, gain);
      this.scores[i] = score;
    }
  }

  // Samples the active strip for live feedback without encoding or copying the full panorama.
  preview(width: number): PanoramaPixels {
    const src = this.pixels;
    width = Math.min(width, src.width);
    const height = Math.max(1, Math.round(src.height * width / src.width));
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      const row = Math.floor((y + .5) * src.height / height);
      for (let x = 0; x < width; x++) {
        const j = (row * src.width + Math.floor((x + .5) * src.width / width)) * 4;
        const i = (y * width + x) * 4;
        data[i] = src.data[j]; data[i + 1] = src.data[j + 1]; data[i + 2] = src.data[j + 2]; data[i + 3] = src.data[j + 3];
      }
    }
    return { width, height, data };
  }
}
