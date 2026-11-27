import { buildCaptureManifest } from '../../../../shared/capturePolicy.ts';
import type { DraftTourRoom } from '../../types/capture.ts';

// roomManifest reuses the identity assigned to a saved sweep and preserves the older raw-frame protocol.
export function roomManifest(room: DraftTourRoom) {
  if (!room.bands) return buildCaptureManifest(room.name, room.frames ?? []);
  if (room.bands.length < 3 || room.bands.length > 5) throw new Error('Jumlah sapuan panorama tidak valid.');
  return { name: room.name, bands: room.bands.map(band => band.meta), capture_id: room.captureId };
}
