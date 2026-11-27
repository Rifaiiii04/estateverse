import type { SweepPixels } from '../../../../shared/sweepImage.ts';

// encodePanoramaBitmap packs compositor pixels into an uncompressed BMP for the native image codec.
export function encodePanoramaBitmap({ width, height, data }: SweepPixels) {
  if (width < 1 || height < 1 || !Number.isInteger(width) || !Number.isInteger(height)
    || width > 4096 || height > 2048 || data.length !== width * height * 4) {
    throw new Error('Dimensi sapuan tidak valid.');
  }
  const stride = Math.ceil(width * 3 / 4) * 4;
  const offset = 54;
  const bytes = new Uint8Array(offset + stride * height);
  const view = new DataView(bytes.buffer);
  bytes.set([0x42, 0x4d]);
  view.setUint32(2, bytes.length, true);
  view.setUint32(10, offset, true);
  view.setUint32(14, 40, true);
  view.setInt32(18, width, true);
  view.setInt32(22, height, true);
  view.setUint16(26, 1, true);
  view.setUint16(28, 24, true);
  view.setUint32(34, stride * height, true);
  for (let y = 0; y < height; y++) {
    let target = offset + (height - y - 1) * stride;
    for (let x = 0; x < width; x++) {
      const source = (y * width + x) * 4;
      bytes[target++] = data[source + 2];
      bytes[target++] = data[source + 1];
      bytes[target++] = data[source];
    }
  }
  return bytes;
}
