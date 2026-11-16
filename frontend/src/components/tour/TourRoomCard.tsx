"use client";

import React, { useState } from "react";
/* eslint-disable @next/next/no-img-element */
import { AlertTriangle, BadgeCheck, Check, Loader2, MapPin, Pencil, Ruler, Trash2 } from "lucide-react";
import type { TourRoom } from "@/types/tour";
import { getMediaUrl } from "@/lib/api/client";
import { formatArea, summarizeRoom } from "@/lib/measure/roomGeometry";
import { LOCATION_CHECK_TEXT, TONE_TEXT_CLASS } from "@/lib/trust/originLabels";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface TourRoomCardProps {
  room: TourRoom;
  onUpdate: (room: TourRoom, name: string, note: string) => Promise<void>;
  onDelete: (room: TourRoom) => Promise<void>;
  onEditHotspots: (room: TourRoom) => void;
  onEditLayout: (room: TourRoom) => void;
}

// TourRoomCard shows one recorded room with its processing status, size, origin proof, and management actions.
export function TourRoomCard({ room, onUpdate, onDelete, onEditHotspots, onEditLayout }: TourRoomCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(room.name);
  const [note, setNote] = useState(room.note ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Saves the edited name and note, then leaves edit mode.
  const saveDetails = async () => {
    const changed = name.trim() !== room.name || note.trim() !== (room.note ?? "");
    if (name.trim() && changed) await onUpdate(room, name.trim(), note.trim());
    setIsEditing(false);
  };

  // Saves on Enter without submitting the surrounding property form.
  const saveOnEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    void saveDetails();
  };

  return (
    <li className="bg-white border border-neutral-200 rounded-2xl overflow-hidden flex flex-col">
      <div className="aspect-[2/1] bg-neutral-100 relative">
        {room.status === "ready" && room.preview_path ? (
          <img src={getMediaUrl(room.preview_path)} alt={`Panorama ${room.name}`} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-500">
            <StatusBadge room={room} />
          </div>
        )}
      </div>
      <div className="p-3 space-y-2 flex-1 flex flex-col">
        {isEditing ? (
          <div className="space-y-2">
            <label htmlFor={`room-name-${room.id}`} className="sr-only">Nama ruangan</label>
            <Input id={`room-name-${room.id}`} value={name} maxLength={40} onChange={(e) => setName(e.target.value)} onKeyDown={saveOnEnter} />
            <Input
              id={`room-note-${room.id}`}
              label="Catatan ruangan (opsional)"
              value={note}
              maxLength={160}
              placeholder="Contoh: 3×3 m, jendela menghadap timur"
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={saveOnEnter}
            />
            <Button size="sm" onClick={saveDetails}>
              <Check aria-hidden="true" /> Simpan
            </Button>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-bold text-neutral-950 truncate">{room.name}</h4>
              <IconButton label={`Ubah nama & catatan ${room.name}`} onClick={() => setIsEditing(true)}><Pencil className="w-4 h-4" /></IconButton>
            </div>
            {room.note ? <p className="text-xs text-neutral-700">{room.note}</p> : <p className="text-xs text-neutral-500">Belum ada catatan ukuran/arah jendela.</p>}
          </div>
        )}
        {room.status === "ready" && <StatusBadge room={room} />}
        {room.status === "ready" && <RoomFacts room={room} />}
        {room.status === "failed" && <p className="text-xs text-rose-700">{room.error_message}</p>}
        <div className="flex flex-wrap gap-2 mt-auto pt-1">
          {room.status === "ready" && (
            <>
              <Button variant="outline" className="flex-1" onClick={() => onEditHotspots(room)}>
                <MapPin aria-hidden="true" /> Atur Panah
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => onEditLayout(room)}>
                <Ruler aria-hidden="true" /> Ukur Ruangan
              </Button>
            </>
          )}
          <Button
            variant="destructive"
            onClick={() => (confirmDelete ? onDelete(room) : setConfirmDelete(true))}
            onBlur={() => setConfirmDelete(false)}
            className={confirmDelete ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : undefined}
          >
            <Trash2 aria-hidden="true" />
            {confirmDelete ? "Yakin hapus?" : "Hapus"}
          </Button>
        </div>
      </div>
    </li>
  );
}

// RoomFacts shows the traced room size and whether the recording is proven to be on site.
function RoomFacts({ room }: { room: TourRoom }) {
  const summary = summarizeRoom(room.floor_outline ?? [], room.camera_height_cm);
  const origin = room.location_check ? LOCATION_CHECK_TEXT[room.location_check] : null;
  return (
    <div className="space-y-0.5 text-xs">
      <p className={summary ? "font-semibold text-neutral-800" : "text-neutral-500"}>
        {summary ? `Luas ±${formatArea(summary.areaM2)}` : "Ukuran belum ditandai"}
      </p>
      {origin && (
        <p className={`flex items-center gap-1 ${TONE_TEXT_CLASS[origin.tone]}`}>
          <BadgeCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" /> {origin.label}
        </p>
      )}
    </div>
  );
}

// StatusBadge summarizes processing state and the stitching quality score.
function StatusBadge({ room }: { room: TourRoom }) {
  if (room.status === "processing") {
    return (
      <span role="status" className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700">
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Sedang diproses…
      </span>
    );
  }
  if (room.status === "failed") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700">
        <AlertTriangle className="w-4 h-4" aria-hidden="true" /> Gagal diproses
      </span>
    );
  }
  const good = room.quality_score >= 70;
  return (
    <span className={`text-xs font-semibold ${good ? "text-sage-700" : "text-amber-700"}`}>
      Kualitas sambungan {room.quality_score}% {good ? "" : "· pertimbangkan rekam ulang"}
    </span>
  );
}

// IconButton is a compact accessible icon-only button.
function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button variant="ghost" size="icon-lg" onClick={onClick} aria-label={label} title={label} className="text-muted-foreground">
      {children}
    </Button>
  );
}
