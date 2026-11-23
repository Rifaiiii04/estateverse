import { focalLength, pixelOffset, rotationMatrix, type SweepImage } from "../../../../shared/sweepImage.ts";
import type { OrientationQuat } from "../../../../shared/capturePolicy.ts";

const THUMBNAIL_WIDTH = 96;
const PREVIEW_WIDTH = 400;
const PREVIEW_HEIGHT = PREVIEW_WIDTH / 2;

// Copies a small version of the exposed video frame for overlap checks and the live panorama.
export function readSweepImage(video: HTMLVideoElement, pose: OrientationQuat): SweepImage {
  const canvas = document.createElement("canvas");
  canvas.width = THUMBNAIL_WIDTH;
  canvas.height = Math.max(1, Math.round(canvas.width * video.videoHeight / video.videoWidth));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Pratinjau kamera gagal dibaca. Buka kembali kamera panorama.");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return { pixels: ctx.getImageData(0, 0, canvas.width, canvas.height), pose };
}

// Builds a small equirectangular contact preview by preferring the most central view of each direction.
export class SweepPreview {
  private canvas = document.createElement("canvas");
  private context: CanvasRenderingContext2D;
  private panorama: ImageData;
  private weights = new Float32Array(PREVIEW_WIDTH * PREVIEW_HEIGHT);
  private sinYaw: number[] = [];
  private cosYaw: number[] = [];

  // Precomputes the angular columns once per recording.
  constructor() {
    this.canvas.width = PREVIEW_WIDTH;
    this.canvas.height = PREVIEW_HEIGHT;
    const context = this.canvas.getContext("2d");
    if (!context) throw new Error("Pratinjau panorama tidak tersedia.");
    this.context = context;
    this.panorama = context.createImageData(PREVIEW_WIDTH, PREVIEW_HEIGHT);
    for (let x = 0; x < PREVIEW_WIDTH; x++) {
      const yaw = 2 * Math.PI * ((x + 0.5) / PREVIEW_WIDTH - 0.5);
      this.sinYaw.push(Math.sin(yaw));
      this.cosYaw.push(Math.cos(yaw));
    }
  }

  // Projects the accepted exposure into the preview, including the seam and pole regions.
  add(image: SweepImage, fov: number) {
    const [w, x, y, z] = image.pose;
    const m = rotationMatrix([w, -x, -y, -z]);
    const focal = focalLength(image, fov);
    for (let row = 0; row < PREVIEW_HEIGHT; row++) {
      const pitch = Math.PI * (0.5 - (row + 0.5) / PREVIEW_HEIGHT);
      const cp = Math.cos(pitch), sy = Math.sin(pitch);
      for (let col = 0; col < PREVIEW_WIDTH; col++) {
        const sx = this.sinYaw[col] * cp, sz = -this.cosYaw[col] * cp;
        const dz = m[6] * sx + m[7] * sy + m[8] * sz;
        const index = row * PREVIEW_WIDTH + col;
        if (-dz <= this.weights[index]) continue;
        const dx = m[0] * sx + m[1] * sy + m[2] * sz;
        const dy = m[3] * sx + m[4] * sy + m[5] * sz;
        const source = pixelOffset(image.pixels, dx, dy, dz, focal);
        if (source < 0) continue;
        this.weights[index] = -dz;
        for (let c = 0; c < 4; c++) this.panorama.data[index * 4 + c] = image.pixels.data[source + c];
      }
    }
  }

  // Serializes the current small preview only when a photograph was accepted.
  thumbnail() {
    this.context.putImageData(this.panorama, 0, 0);
    return this.canvas.toDataURL("image/png");
  }
}
