"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { TourRoom } from "@/types/tour";
import { saveTourRoomLayout } from "@/lib/api/tours";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/ui/Button";
import { SphereViewer } from "../SphereViewer";
import { panoramaUrlFor } from "../tourImage";
import { MeasureOverlay } from "../measure/MeasureOverlay";
import type { MeasureState } from "../measure/useMeasureTool";
import { LayoutEditorPanel } from "./LayoutEditorPanel";
import { useLayoutEditor } from "./useLayoutEditor";
import type { FloorXZ } from "@/lib/measure/roomGeometry";

interface RoomLayoutEditorProps {
  room: TourRoom;
  onClose: () => void;
  onSaved: () => Promise<void>;
}

// RoomLayoutEditor lets a seller trace a room's floor corners in its panorama so buyers see its size and floor plan.
export function RoomLayoutEditor({ room, onClose, onSaved }: RoomLayoutEditorProps) {
  const { toast } = useToast();
  const editor = useLayoutEditor(room);
  const [isSaving, setIsSaving] = useState(false);
  const markers = editor.step === "calibrate" ? editor.floorReference : editor.floorCorners;

  // Saves the camera height and outline, then refreshes the room list.
  const save = async () => {
    setIsSaving(true);
    try {
      await saveTourRoomLayout(room.id, { camera_height_cm: editor.heightCm, floor_outline: editor.corners });
      toast.success("Ukuran ruangan tersimpan dan tampil di tur pembeli.");
      await onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan ukuran ruangan.");
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`Ukur ruangan ${room.name}`} className="fixed inset-0 z-[90] bg-black/80 flex flex-col">
      <div className="flex items-center justify-between p-3 text-white">
        <p className="text-sm font-semibold">Ukur {room.name}: tandai sudut lantai di panorama.</p>
        <Button variant="ghost" size="icon-lg" onClick={onClose} aria-label="Tutup pengukur ruangan"
          className="size-10 rounded-full bg-white/15 text-white hover:bg-white/25 hover:text-white">
          <X className="size-5" aria-hidden="true" />
        </Button>
      </div>
      <div className="flex-1 min-h-0">
        <SphereViewer imageUrl={panoramaUrlFor(room)} onPick={editor.pick} ariaLabel={`Pengukur ruangan ${room.name}`}>
          <MeasureOverlay
            cameraHeightM={editor.heightM}
            state={markerState(markers)}
            outline={editor.step === "corners" ? editor.floorCorners : undefined}
          />
        </SphereViewer>
      </div>
      <LayoutEditorPanel editor={editor} roomName={room.name} isSaving={isSaving} onSave={save} />
    </div>,
    document.body
  );
}

// markerState adapts plain floor points to the overlay's distance-mode state so taps and lengths are drawn.
function markerState(points: FloorXZ[]): MeasureState {
  return { mode: "distance", points, heightM: null, furniture: [], presetId: "", hint: "" };
}
