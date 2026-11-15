import type { CameraView } from 'expo-camera';
import { File } from 'expo-file-system';
import { FRAME_LONG_SIDE, FRAME_JPEG_QUALITY } from '../../../../shared/capturePolicy.ts';

// selectPictureSize chooses a bounded rear-camera JPEG size, favoring the web recorder's portrait 9:16 format.
export function selectPictureSize(sizes: string[]): string {
  const valid = sizes.map((name) => {
    const [w, h] = name.split('x').map(Number);
    const long = Math.max(w, h), short = Math.min(w, h);
    return { name, long, score: Math.abs(long-FRAME_LONG_SIDE)/FRAME_LONG_SIDE + Math.abs(long/short-16/9)*4, short };
  }).filter((s) => Number.isFinite(s.score) && s.short >= 240 && s.long <= 2560);
  valid.sort((a, b) => a.score-b.score);
  if (!valid[0]) throw new Error('Kamera tidak menyediakan ukuran foto yang didukung.');
  return valid[0].name;
}

// takeCameraFrame captures an orientation-corrected rear-camera JPEG without performing any panorama processing.
export async function takeCameraFrame(camera: CameraView) {
  const photo = await camera.takePictureAsync({ quality: FRAME_JPEG_QUALITY, skipProcessing: false, shutterSound: false });
  if (!photo || new File(photo.uri).size > 3*1024*1024) throw new Error('Foto terlalu besar atau kamera gagal mengambil foto.');
  return photo;
}

// removeCaptureFiles removes only the known raw files owned by a discarded or successfully uploaded draft.
export function removeCaptureFiles(frames: { uri: string }[]) {
  for (const { uri } of frames) {
    try { const file = new File(uri); if (file.exists) file.delete(); }
    catch { /* Cache cleanup can be retried by the operating system. */ }
  }
}
