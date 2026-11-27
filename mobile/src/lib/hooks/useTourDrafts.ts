import { useCallback, useEffect, useRef, useState, type SetStateAction } from 'react';
import { updateTourRoom, uploadTourCapture } from '@/lib/api/tours';
import { removeCaptureFiles } from '@/lib/capture/camera';
import { saveTourDrafts } from '@/lib/capture/saveTourDrafts';
import { localTourFiles, type DraftTourRoom } from '@/types/capture';

const io = { upload: uploadTourCapture, update: updateTourRoom, remove: removeCaptureFiles };

// useTourDrafts owns local panorama files through uploads, retries and closing the listing form.
export function useTourDrafts() {
  const [rooms, renderRooms] = useState<DraftTourRoom[]>([]);
  const current = useRef(rooms);
  const mounted = useRef(true);
  const saving = useRef(false);
  // discard releases abandoned room files after any upload has finished reading them.
  const discard = useCallback(() => {
    current.current.forEach(room => removeCaptureFiles(localTourFiles(room)));
    current.current = [];
  }, []);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; if (!saving.current) discard(); };
  }, [discard]);
  // setRooms applies changes against the latest draft even before React renders an asynchronous checkpoint.
  const setRooms = useCallback((change: SetStateAction<DraftTourRoom[]>) => {
    current.current = typeof change === 'function' ? change(current.current) : change;
    if (mounted.current) renderRooms(current.current);
  }, []);
  // beginSave synchronously claims the save button before pending React updates can allow a second upload.
  const beginSave = () => {
    if (saving.current) return false;
    saving.current = true;
    return true;
  };
  // endSave releases pending files when the form was closed while requests were in flight.
  const endSave = () => { saving.current = false; if (!mounted.current) discard(); };
  // saveRooms replaces the exact accepted room while leaving unrelated captures and notes intact.
  const saveRooms = (propertyId: number, snapshot: DraftTourRoom[]) => saveTourDrafts(propertyId, snapshot, io,
    (draft, saved) => setRooms(latest => latest.map(room => room === draft ? saved : room)));
  return { rooms, setRooms, saveRooms, beginSave, endSave };
}
