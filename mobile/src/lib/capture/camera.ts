import type { CameraView } from 'expo-camera';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';

export interface CameraSampleFile { uri: string; width: number; height: number }

// takeCameraFrame returns the JPEG immediately so motion validation excludes thumbnail and normalization time.
export async function takeCameraFrame(camera: CameraView) {
  const quality = Platform.OS === 'ios' ? 0.98 : 0.92;
  const photo = await camera.takePictureAsync({ quality, skipProcessing: false, shutterSound: false, imageType: 'jpg' });
  if (!photo) throw new Error('Kamera gagal mengambil gambar.');
  return photo;
}

// removeCaptureFiles removes cache files owned by a sample, preview, or discarded panorama draft.
export function removeCaptureFiles(frames: { uri: string }[]) {
  for (const { uri } of frames) {
    try { const file = new File(uri); if (file.exists) file.delete(); }
    catch { /* Cache cleanup can be retried by the operating system. */ }
  }
}
