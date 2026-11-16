"use client";

import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Trash2, X } from "lucide-react";
import type { TourRoom } from "@/types/tour";
import { createTourHotspot, deleteTourHotspot } from "@/lib/api/tours";
import { Button } from "@/components/ui/Button";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { SphereViewer, ViewerHotspot } from "./SphereViewer";
import { panoramaUrlFor } from "./tourImage";

interface HotspotEditorProps {
  room: TourRoom;
  rooms: TourRoom[];
  onClose: () => void;
  onChanged: () => Promise<void>;
}

// HotspotEditor lets sellers tap a doorway in the panorama and link it to another room, Street View style.
export function HotspotEditor({ room, rooms, onClose, onChanged }: HotspotEditorProps) {
  const [pending, setPending] = useState<{ yaw: number; pitch: number } | null>(null);
  const [targetId, setTargetId] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);
  const others = rooms.filter((r) => r.id !== room.id && r.status === "ready");
  // Looks up a room name for labels.
  const nameOf = (id: number) => rooms.find((r) => r.id === id)?.name ?? "Ruangan";

  const markers = useMemo<ViewerHotspot[]>(() => {
    const saved = room.hotspots.map((h) => ({ id: h.id, yaw: h.yaw, pitch: h.pitch, label: nameOf(h.to_room_id), onSelect: () => undefined }));
    return pending ? [...saved, { id: -1, ...pending, label: "Panah baru", onSelect: () => undefined }] : saved;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.hotspots, pending]);

  // Saves the pending marker as a hotspot leading to the chosen room.
  const save = async () => {
    if (!pending || !targetId) return;
    setIsSaving(true);
    try {
      await createTourHotspot({ from_room_id: room.id, to_room_id: targetId, ...pending });
      setPending(null);
      await onChanged();
    } finally {
      setIsSaving(false);
    }
  };

  // Removes an existing hotspot.
  const remove = async (id: number) => {
    await deleteTourHotspot(id);
    await onChanged();
  };

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`Atur panah ruangan ${room.name}`} className="fixed inset-0 z-[90] bg-black/80 flex flex-col">
      <div className="flex items-center justify-between p-3 text-white">
        <p className="text-sm font-semibold">Ketuk pintu/arah di panorama {room.name}, lalu pilih ruangan tujuan.</p>
        <Button
          variant="ghost"
          size="icon-lg"
          onClick={onClose}
          aria-label="Tutup editor panah"
          className="size-10 rounded-full bg-white/15 text-white hover:bg-white/25 hover:text-white"
        >
          <X className="size-5" aria-hidden="true" />
        </Button>
      </div>
      <div className="flex-1 min-h-0">
        <SphereViewer imageUrl={panoramaUrlFor(room)} hotspots={markers} onPick={(yaw, pitch) => setPending({ yaw, pitch })} ariaLabel={`Editor panah ${room.name}`} />
      </div>
      <div className="bg-white p-4 space-y-3">
        {others.length === 0 && <p className="text-sm text-neutral-600">Rekam minimal satu ruangan lain untuk membuat panah perpindahan.</p>}
        {pending && others.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm font-semibold">Menuju:</span>
            <CustomSelect
              variant="compact"
              placeholder="Pilih ruangan…"
              options={others.map((r) => ({ value: String(r.id), label: r.name }))}
              value={targetId ? String(targetId) : ""}
              onChange={(value) => setTargetId(Number(value))}
            />
            <Button type="button" onClick={save} isLoading={isSaving} disabled={!targetId}>Simpan Panah</Button>
          </div>
        )}
        <ul className="flex flex-wrap gap-2">
          {room.hotspots.map((h) => (
            <li key={h.id} className="inline-flex items-center gap-2 bg-neutral-100 rounded-lg pl-3 pr-1 py-1 text-xs font-semibold">
              → {nameOf(h.to_room_id)}
              <Button variant="destructive" size="icon-sm" onClick={() => remove(h.id)} aria-label={`Hapus panah ke ${nameOf(h.to_room_id)}`}>
                <Trash2 aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body
  );
}
