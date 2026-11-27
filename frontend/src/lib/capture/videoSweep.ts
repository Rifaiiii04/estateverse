import type { OrientationQuat } from "../../../../shared/capturePolicy.ts";
import type { SweepImage, SweepPixels } from "../../../../shared/sweepImage.ts";
import { frameTime } from "./exposurePose.ts";

const MAX_SOURCE_WIDTH = 640;
const MAX_SOURCE_HEIGHT = 1280;

// Makes a reusable camera readback surface at native aspect ratio.
function cameraSurface(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Browser tidak dapat membaca gambar kamera.");
  return { canvas, context };
}

// Reads unmirrored camera pixels for the shared panorama compositor.
export class VideoSweepSource {
  private full: ReturnType<typeof cameraSurface>;
  private width: number;
  private height: number;

  // Bounds camera readback memory while retaining the original projection.
  constructor(video: HTMLVideoElement) {
    this.width = video.videoWidth;
    this.height = video.videoHeight;
    if (!this.width || !this.height) throw new Error("Kamera belum mengirim gambar.");
    const scale = Math.min(1, MAX_SOURCE_WIDTH / this.width, MAX_SOURCE_HEIGHT / this.height);
    this.full = cameraSurface(Math.round(this.width * scale), Math.round(this.height * scale));
  }

  // Samples camera pixels before the browser can advance to another exposure.
  read(video: HTMLVideoElement, pose: OrientationQuat): SweepImage {
    if (video.videoWidth !== this.width || video.videoHeight !== this.height) {
      throw new Error("Ukuran kamera berubah. Pegang HP tegak dan ulangi rekaman.");
    }
    this.full.context.drawImage(video, 0, 0, this.full.canvas.width, this.full.canvas.height);
    const pixels = this.full.context.getImageData(0, 0, this.full.canvas.width, this.full.canvas.height);
    return { pixels, pose };
  }
}

// Converts a completed strip of RGBA pixels into the JPEG sent to the panorama compositor.
export function encodeBand(pixels: SweepPixels): Promise<Blob> {
  const { context, canvas } = cameraSurface(pixels.width, pixels.height);
  const data = context.createImageData(pixels.width, pixels.height);
  data.data.set(pixels.data);
  context.putImageData(data, 0, 0);
  return new Promise((resolve, reject) => canvas.toBlob((blob) => {
    if (blob) resolve(blob);
    else reject(new Error("Panorama gagal disimpan di perangkat. Ulangi sapuan ini."));
  }, "image/jpeg", .92));
}

// Streams newly presented video frames and cancels the pending callback when capture stops.
export function watchVideo(video: HTMLVideoElement, onFrame: (now: number, exposedAt: number) => void) {
  let handle = 0;
  let active = true;
  let mediaTime = -1;
  const native = typeof video.requestVideoFrameCallback === "function";
  // Samples each exposure only once, including on browsers using the animation-frame fallback.
  const tick = (now: number, metadata?: VideoFrameCallbackMetadata) => {
    if (!active) return;
    if (video.readyState >= 2 && (native || mediaTime !== video.currentTime)) {
      mediaTime = video.currentTime;
      onFrame(now, frameTime(now, metadata));
    }
    if (active) handle = native ? video.requestVideoFrameCallback(tick) : requestAnimationFrame(tick);
  };
  handle = native ? video.requestVideoFrameCallback(tick) : requestAnimationFrame(tick);
  return () => {
    active = false;
    if (native) video.cancelVideoFrameCallback(handle);
    else cancelAnimationFrame(handle);
  };
}
