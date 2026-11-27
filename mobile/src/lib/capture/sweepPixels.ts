import { File, Paths } from 'expo-file-system';
import { randomUUID } from 'expo-crypto';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { decode } from 'jpeg-js';
import { Platform } from 'react-native';
import type { SweepPixels } from '../../../../shared/sweepImage.ts';
import { removeCaptureFiles, type CameraSampleFile } from './camera';
import { MAX_SAMPLE_HEIGHT, SAMPLE_WIDTH } from './cameraSize';
import { encodePanoramaBitmap } from './panoramaBitmap';

// decodeSample reads only private camera or manipulator output and caps both file bytes and decoder allocations.
async function decodeSample(uri: string) {
  const jpeg = new File(uri);
  if (!jpeg.exists || jpeg.size <= 0 || jpeg.size > 2 * 1024 * 1024) throw new Error('Sampel kamera tidak terbaca.');
  return decode(await jpeg.bytes(), { useTArray: true, maxResolutionInMP: 0.5, maxMemoryUsageInMB: 32 });
}

// readSweepPixels decodes bounded upright Android captures directly and normalizes other photos first.
export async function readSweepPixels(photo: CameraSampleFile): Promise<SweepPixels> {
  if (Platform.OS === 'android' && photo.height > photo.width && photo.width <= SAMPLE_WIDTH && photo.height <= MAX_SAMPLE_HEIGHT) {
    return decodeSample(photo.uri);
  }
  const context = ImageManipulator.manipulate(photo.uri, { maxWidth: SAMPLE_WIDTH, maxHeight: MAX_SAMPLE_HEIGHT });
  let temporary: { uri: string } | undefined;
  try {
    const image = await context.renderAsync();
    try {
      if (image.width > SAMPLE_WIDTH || image.height > MAX_SAMPLE_HEIGHT || image.width >= image.height) {
        throw new Error('Pegang HP tegak untuk merekam panorama.');
      }
      temporary = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.94 });
    } finally { image.release(); }
    return await decodeSample(temporary.uri);
  } finally {
    context.release();
    if (temporary) removeCaptureFiles([temporary]);
  }
}

// saveSweepJPEG uses the native JPEG codec for the projected band or its smaller live preview.
export async function saveSweepJPEG(pixels: SweepPixels, quality: number) {
  const bitmap = new File(Paths.cache, `sweep-${randomUUID()}.bmp`);
  try {
    await bitmap.write(encodePanoramaBitmap(pixels));
    const context = ImageManipulator.manipulate(bitmap.uri);
    try {
      const image = await context.renderAsync();
      try { return await image.saveAsync({ format: SaveFormat.JPEG, compress: quality }); }
      finally { image.release(); }
    } finally { context.release(); }
  } finally { removeCaptureFiles([bitmap]); }
}
