import { localTourFiles, type DraftTourRoom } from '../../types/capture.ts';

interface DraftOperations {
  upload: (propertyId: number, room: DraftTourRoom) => Promise<{ id: number; status: DraftTourRoom['status'] }>;
  update: (id: number, name: string, note: string) => Promise<void>;
  remove: (files: { uri: string }[]) => void;
}

// saveTourDrafts checkpoints accepted uploads before releasing their local panorama files.
export async function saveTourDrafts(propertyId: number, rooms: DraftTourRoom[], io: DraftOperations,
  onSaved: (draft: DraftTourRoom, room: DraftTourRoom) => void) {
  for (const room of rooms) {
    if (room.id) { await io.update(room.id, room.name, room.roomSpecs); continue; }
    const result = await io.upload(propertyId, room);
    const saved: DraftTourRoom = { ...room, id: result.id, bands: undefined, frames: undefined, panoramaUrl: '', status: result.status };
    onSaved(room, saved);
    io.remove(localTourFiles(room));
    await io.update(result.id, room.name, room.roomSpecs);
  }
}
