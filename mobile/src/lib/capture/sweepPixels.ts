import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { decode } from 'jpeg-js';
import type { SweepPixels } from '../../../../shared/sweepImage.ts';
import { removeCaptureFiles } from './camera';

// readSweepPixels decodes only a small upright thumbnail into RGBA for shared overlap checks.
export async function readSweepPixels(uri: string): Promise<SweepPixels> {
  const context = ImageManipulator.manipulate(uri, { maxWidth: 192 });
  let temporary: { uri: string } | undefined;
  try {
    const thumbnail = await context.resize({ width: 96 }).renderAsync();
    try { temporary = await thumbnail.saveAsync({ format: SaveFormat.JPEG, compress: 0.92 }); }
    finally { thumbnail.release(); }
    const bytes = await new File(temporary.uri).bytes();
    return decode(bytes, { useTArray: true, maxResolutionInMP: 0.1, maxMemoryUsageInMB: 8 });
  } finally {
    context.release();
    if (temporary) removeCaptureFiles([temporary]);
  }
}
