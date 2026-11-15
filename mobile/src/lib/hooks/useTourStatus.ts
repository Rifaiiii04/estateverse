import { useEffect, useRef, useState } from 'react';
import { getOwnerTourRooms } from '@/lib/api/tours';
import type { DraftTourRoom } from '@/types/capture';

// useTourStatus polls only processing server rooms and retains unsent raw drafts while stitching completes.
export function useTourStatus(
  propertyId: number | null,
  rooms: DraftTourRoom[],
  onChange: (rooms: DraftTourRoom[]) => void,
  disabled: boolean,
  onReady?: (room: DraftTourRoom) => void,
) {
  const current = useRef(rooms);
  const previousStatuses = useRef<Map<number, DraftTourRoom['status']> | null>(null);
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
        const previous = previousStatuses.current;
        if (previous) {
          remote.forEach((room) => {
            if (room.id && previous.get(room.id) === 'processing' && room.status === 'ready') {
              onReady?.(room);
            }
          });
        }
        previousStatuses.current = new Map(remote.filter((room) => room.id).map((room) => [room.id as number, room.status]));
        onChange(current.current.map((r) => r.id ? remote.find((item) => item.id === r.id) || r : r));
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
