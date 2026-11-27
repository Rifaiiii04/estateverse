import { useEffect, useRef, useState } from 'react';
import { getOwnerTourRooms } from '@/lib/api/tours';
import type { DraftTourRoom } from '@/types/capture';

// useTourStatus polls only processing server rooms and retains unsent raw drafts while stitching completes.
export function useTourStatus(
  propertyId: number | null,
  rooms: DraftTourRoom[],
  onChange: React.Dispatch<React.SetStateAction<DraftTourRoom[]>>,
  disabled: boolean,
  onReady?: (room: DraftTourRoom) => void,
) {
  const current = useRef(rooms);
  const [error, setError] = useState('');
  useEffect(() => { current.current = rooms; }, [rooms]);
  useEffect(() => {
    if (!propertyId || disabled) return;
    let active = true;
    let pending = false;
    // poll refreshes backend processing results without inventing panoramas on the client.
    const poll = async () => {
      if (pending || !current.current.some((r) => r.status === 'processing')) return;
      pending = true;
      try {
        const remote = await getOwnerTourRooms(propertyId);
        if (!active) return;
        const byId = new Map(remote.map(room => [room.id, room]));
        current.current.forEach(room => {
          const updated = room.id && byId.get(room.id);
          if (updated && room.status === 'processing' && updated.status === 'ready') onReady?.(updated);
        });
        onChange(latest => latest.map(room => {
          const updated = room.id && byId.get(room.id);
          return updated ? { ...room, status: updated.status, panoramaUrl: updated.panoramaUrl, errorMessage: updated.errorMessage } : room;
        }));
        setError('');
      } catch { if (active) setError('Status server belum dapat diperbarui. Periksa koneksi.'); }
      finally { pending = false; }
    };
    const timer = setInterval(() => void poll(), 2500);
    void poll();
    return () => { active = false; clearInterval(timer); };
  }, [disabled, onChange, onReady, propertyId]);
  return error;
}
