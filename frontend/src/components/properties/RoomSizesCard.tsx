import React from "react";
import { Ruler } from "lucide-react";
import type { TourRoom } from "@/types/tour";
import { cameraHeightMeters, formatArea, formatMeters, outlineToFloor, summarizeRoom } from "@/lib/measure/roomGeometry";
import { FloorPlanSketch } from "@/components/tour/layout/FloorPlanSketch";

// RoomSizesCard lists each measured room's estimated area with a small floor-plan sketch.
export function RoomSizesCard({ rooms }: { rooms: TourRoom[] }) {
  const measured = rooms.flatMap((room) => {
    const summary = summarizeRoom(room.floor_outline ?? [], room.camera_height_cm);
    return summary ? [{ room, summary }] : [];
  });
  if (measured.length === 0) return null;
  return (
    <section aria-labelledby="room-sizes-title" className="bg-white p-5 rounded-2xl border border-neutral-200/90 shadow-2xs space-y-3">
      <h3 id="room-sizes-title" className="flex items-center gap-2 text-sm sm:text-base font-bold text-neutral-950 border-b border-neutral-100 pb-2">
        <Ruler className="w-4 h-4 text-sage-600" aria-hidden="true" /> Ukuran Ruangan dari Tur 360°
      </h3>
      <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {measured.map(({ room, summary }) => (
          <li key={room.id} className="rounded-xl border border-neutral-200 p-2.5 text-center">
            <FloorPlanSketch
              points={outlineToFloor(room.floor_outline, cameraHeightMeters(room.camera_height_cm))}
              title={`Denah ${room.name}`}
              className="mx-auto h-28 w-28"
            />
            <p className="text-sm font-bold text-neutral-950">{room.name}</p>
            <p className="text-xs text-neutral-700">±{formatArea(summary.areaM2)}</p>
            {summary.sides && <p className="text-[11px] text-neutral-500">{formatMeters(summary.sides[0])} × {formatMeters(summary.sides[1])}</p>}
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-neutral-500">
        Perkiraan dari panorama yang diukur penjual. Buka Walk Inside 360° lalu tekan ikon penggaris untuk mengukur sendiri atau mencoba furnitur.
      </p>
    </section>
  );
}
