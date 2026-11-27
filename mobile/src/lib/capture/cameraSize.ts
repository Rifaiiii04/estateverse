import { cameraDeadline } from './cameraDeadline.ts';

export const SAMPLE_WIDTH = 480;
export const MAX_SAMPLE_HEIGHT = 1024;

// selectPictureSize chooses an efficient portrait-compatible sample or lets the camera use its default preset.
export function selectPictureSize(sizes: string[]): string | undefined {
  const valid = sizes.filter(name => /^\d+x\d+$/.test(name)).map(name => {
    const [w, h] = name.split('x').map(Number);
    const long = Math.max(w, h), short = Math.min(w, h);
    const resizeCost = short > SAMPLE_WIDTH || long > MAX_SAMPLE_HEIGHT ? 0.35 : 0;
    const score = Math.abs(short - SAMPLE_WIDTH) / SAMPLE_WIDTH + Math.abs(long / short - 16 / 9) * 3 + resizeCost;
    return { name, long, short, score };
  }).filter(size => size.short >= 240 && Number.isFinite(size.score));
  const bounded = valid.filter(size => size.long <= 2560);
  if (bounded.length) return bounded.sort((a, b) => a.score - b.score)[0].name;
  return valid.sort((a, b) => a.long * a.short - b.long * b.short)[0]?.name;
}

// preferredPictureSize falls back to the active preview's default when the OS cannot enumerate modes.
export async function preferredPictureSize(camera: { getAvailablePictureSizesAsync(): Promise<string[]> }, timeout = 2000) {
  try {
    const sizes = await cameraDeadline(camera.getAvailablePictureSizesAsync(), timeout, 'Kamera memakai ukuran bawaan.');
    return selectPictureSize(sizes);
  } catch { return undefined; }
}
