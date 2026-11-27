import type { SweepPixels } from "../../../../shared/sweepImage.ts";
import type { PanoramaBand } from "../../../../shared/panoramaSweep.ts";

const WIDTH = 360;
const HEIGHT = WIDTH / 2;

// Allocates a small canvas for the progressive panorama display.
function previewSurface(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Pratinjau panorama tidak tersedia.");
  return { canvas, ctx };
}

// Displays the active strip in position beside the strips already stored for the room.
export class SweepPreview {
  private completed = previewSurface(WIDTH, HEIGHT);
  private live = previewSurface(WIDTH, HEIGHT);

  // Draws the real composited band at its latitude, preserving unobserved areas while the phone turns.
  show(pixels: SweepPixels, meta: PanoramaBand | undefined, commit = false): string {
    const strip = previewSurface(pixels.width, pixels.height);
    const image = strip.ctx.createImageData(pixels.width, pixels.height);
    image.data.set(pixels.data);
    strip.ctx.putImageData(image, 0, 0);
    if (!commit) return strip.canvas.toDataURL("image/png");
    this.live.ctx.clearRect(0, 0, WIDTH, HEIGHT);
    this.live.ctx.drawImage(this.completed.canvas, 0, 0);
    const top = (90 - (meta?.max_pitch ?? 32)) * HEIGHT / 180;
    const bottom = (90 - (meta?.min_pitch ?? -32)) * HEIGHT / 180;
    this.live.ctx.drawImage(strip.canvas, 0, top, WIDTH, bottom - top);
    this.completed.ctx.drawImage(this.live.canvas, 0, 0);
    return this.live.canvas.toDataURL("image/png");
  }
}
