"use client";

import React, { useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Compass, Expand, Minus, Plus, Ruler, Smartphone } from "lucide-react";
import type { TourRoom } from "@/types/tour";
import { needsMotionPermission, requestMotionPermission } from "@/lib/capture/orientation";
import { formatArea, formatMeters, summarizeRoom } from "@/lib/measure/roomGeometry";
import type { ViewerHotspot } from "./SphereViewer";
import { RoomSelector } from "./RoomSelector";
import { TourRoomStage } from "./TourRoomStage";
import type { LookHandle } from "./useLookControls";

interface TourViewerProps {
  rooms: TourRoom[];
  propertyTitle: string;
}

// TourViewer lets buyers walk through recorded rooms Street View-style: look around, jump via arrows or room chips.
export function TourViewer({ rooms, propertyTitle }: TourViewerProps) {
  const [currentId, setCurrentId] = useState(rooms[0]?.id ?? 0);
  const [gyro, setGyro] = useState(false);
  const [measuring, setMeasuring] = useState(false);
  const controls = useRef<LookHandle | null>(null);
  const room = rooms.find((r) => r.id === currentId) ?? rooms[0];
  const containerId = `tour-${room?.property_id ?? 0}`;

  const hotspots = useMemo<ViewerHotspot[]>(() => {
    if (!room) return [];
    return room.hotspots.map((h) => ({
      id: h.id,
      yaw: h.yaw,
      pitch: h.pitch,
      label: rooms.find((r) => r.id === h.to_room_id)?.name ?? "Ruangan",
      onSelect: () => setCurrentId(h.to_room_id),
    }));
  }, [room, rooms]);

  if (!room) return null;

  // Toggles "move your phone to look around", asking iOS for sensor permission first.
  const toggleGyro = async () => {
    if (!gyro && needsMotionPermission() && !(await requestMotionPermission())) return;
    setGyro((g) => !g);
  };

  const summary = summarizeRoom(room.floor_outline ?? [], room.camera_height_cm);
  const showRooms = rooms.length > 1 && !measuring;

  return (
    <div id={containerId} className="relative w-full h-[380px] sm:h-[480px] lg:h-[580px] rounded-2xl overflow-hidden bg-neutral-900">
      <TourRoomStage
        key={room.id}
        room={room}
        hotspots={hotspots}
        gyro={gyro}
        controls={controls}
        measuring={measuring}
        raised={showRooms}
        ariaLabel={`Walk Inside 360° ${room.name} — ${propertyTitle}. Geser atau gunakan tombol panah untuk melihat sekeliling.`}
      />
      <div className="absolute top-3 left-3 max-w-[60%] bg-black/60 text-white rounded-xl px-3 py-2 space-y-0.5">
        <p className="flex items-center gap-2 text-xs font-semibold">
          <Compass className="w-4 h-4 shrink-0" aria-hidden="true" />
          {room.name}
        </p>
        {summary && (
          <p className="text-[11px] font-semibold text-sage-200">
            Luas ±{formatArea(summary.areaM2)}
            {summary.sides && ` · ${formatMeters(summary.sides[0])} × ${formatMeters(summary.sides[1])}`}
          </p>
        )}
        {room.note && <p className="text-[11px] text-white/90">{room.note}</p>}
      </div>
      <div className="absolute top-3 right-3 flex gap-2">
        <ViewerButton label={measuring ? "Tutup alat ukur" : "Ukur ruangan & coba furnitur"} onClick={() => setMeasuring((m) => !m)} active={measuring}>
          <Ruler className="w-4 h-4" aria-hidden="true" />
        </ViewerButton>
        <ViewerButton label={gyro ? "Matikan gerak HP" : "Gerakkan HP untuk melihat"} onClick={toggleGyro} active={gyro}>
          <Smartphone className="w-4 h-4" aria-hidden="true" />
        </ViewerButton>
        <ViewerButton label="Layar penuh" onClick={() => requestFullscreen(containerId)}>
          <Expand className="w-4 h-4" aria-hidden="true" />
        </ViewerButton>
      </div>
      {!gyro && <LookPad controls={controls} raised={showRooms} />}
      {showRooms && <RoomSelector rooms={rooms} currentId={room.id} onSelect={setCurrentId} />}
    </div>
  );
}

// LookPad offers tap buttons to look around and zoom, an alternative to dragging (WCAG 2.2 SC 2.5.7).
function LookPad({ controls, raised }: { controls: React.RefObject<LookHandle | null>; raised: boolean }) {
  const buttons = [
    { label: "Perbesar", icon: Plus, run: () => controls.current?.zoom(-10) },
    { label: "Lihat ke atas", icon: ArrowUp, run: () => controls.current?.nudge(0, 10) },
    { label: "Perkecil", icon: Minus, run: () => controls.current?.zoom(10) },
    { label: "Lihat ke kiri", icon: ArrowLeft, run: () => controls.current?.nudge(-15, 0) },
    { label: "Lihat ke bawah", icon: ArrowDown, run: () => controls.current?.nudge(0, -10) },
    { label: "Lihat ke kanan", icon: ArrowRight, run: () => controls.current?.nudge(15, 0) },
  ];
  return (
    <div role="group" aria-label="Kontrol tampilan 360°" className={`absolute right-3 ${raised ? "bottom-16" : "bottom-3"} grid grid-cols-3 gap-1.5`}>
      {buttons.map(({ label, icon: Icon, run }) => (
        <button key={label} type="button" onClick={run} aria-label={label} title={label}
          className="w-11 h-11 rounded-xl bg-black/55 hover:bg-black/70 text-white flex items-center justify-center cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
          <Icon className="w-4 h-4" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

// ViewerButton is a round icon button overlaid on the panorama.
function ViewerButton({ label, onClick, active = false, children }: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`w-10 h-10 rounded-full flex items-center justify-center text-white cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${
        active ? "bg-sage-600" : "bg-black/55 hover:bg-black/70"
      }`}
    >
      {children}
    </button>
  );
}

// requestFullscreen expands the viewer when the browser supports element fullscreen.
function requestFullscreen(id: string) {
  const el = document.getElementById(id);
  if (el?.requestFullscreen) void el.requestFullscreen().catch(() => undefined);
}
