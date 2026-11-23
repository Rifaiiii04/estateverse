import type { CameraView } from 'expo-camera';
import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Platform } from 'react-native';
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

// takeCameraFrame returns the JPEG immediately so motion validation excludes thumbnail and normalization time.
export async function takeCameraFrame(camera: CameraView) {
  const quality = Platform.OS === 'ios' ? 0.98 : FRAME_JPEG_QUALITY;
  const photo = await camera.takePictureAsync({ quality, skipProcessing: false, shutterSound: false, imageType: 'jpg' });
  if (!photo) throw new Error('Kamera gagal mengambil gambar.');
  return photo;
}

// prepareSweepPhoto bakes iOS display orientation into the pixels that both the phone and Go decode.
export async function prepareSweepPhoto(photo: { uri: string; width: number; height: number }) {
  let result = photo;
  try {
    if (Platform.OS === 'ios' || Math.max(photo.width, photo.height) > FRAME_LONG_SIDE) {
      const context = ImageManipulator.manipulate(photo.uri, { maxWidth: FRAME_LONG_SIDE, maxHeight: FRAME_LONG_SIDE });
      try {
        const upright = await context.renderAsync();
        try { result = await upright.saveAsync({ format: SaveFormat.JPEG, compress: FRAME_JPEG_QUALITY }); }
        finally { upright.release(); }
      } finally { context.release(); }
    }
    if (result.height <= result.width) throw new Error('Pegang HP tegak agar sapuan dapat disambung.');
    if (new File(result.uri).size > 3 * 1024 * 1024) throw new Error('Ukuran foto terlalu besar.');
    return result;
  } catch (error) {
    if (result.uri !== photo.uri) removeCaptureFiles([result]);
    throw error;
  }
}

// removeCaptureFiles removes only the known raw files owned by a discarded or successfully uploaded draft.
export function removeCaptureFiles(frames: { uri: string }[]) {
  for (const { uri } of frames) {
    try { const file = new File(uri); if (file.exists) file.delete(); }
    catch { /* Cache cleanup can be retried by the operating system. */ }
  }
}
