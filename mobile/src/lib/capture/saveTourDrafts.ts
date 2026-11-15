import { uploadTourCapture, updateTourRoom } from '@/lib/api/tours';
import { removeCaptureFiles } from './camera';
import type { DraftTourRoom } from '@/types/capture';

// saveTourDrafts queues raw captures on Go and checkpoints returned ids so retries do not recreate completed uploads.
export async function saveTourDrafts(propertyId: number, rooms: DraftTourRoom[], onSaved: (index: number, room: DraftTourRoom) => void) {
  for (const [index, room] of rooms.entries()) {
    if (room.id) { await updateTourRoom(room.id, room.name, room.roomSpecs); continue; }
    const result = await uploadTourCapture(propertyId, room);
    const saved: DraftTourRoom = { ...room, id: result.id, frames: undefined, panoramaUrl: '', status: result.status };
    onSaved(index, saved);
    removeCaptureFiles(room.frames || []);
    await updateTourRoom(result.id, room.name, room.roomSpecs);
  }
}
