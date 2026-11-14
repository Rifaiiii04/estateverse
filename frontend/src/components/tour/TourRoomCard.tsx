"use client";

import React, { useState } from "react";
/* eslint-disable @next/next/no-img-element */
import { AlertTriangle, Check, Loader2, MapPin, Pencil, Trash2 } from "lucide-react";
import type { TourRoom } from "@/types/tour";
import { getMediaUrl } from "@/lib/api/client";

interface TourRoomCardProps {
  room: TourRoom;
  onUpdate: (room: TourRoom, name: string, note: string) => Promise<void>;
  onDelete: (room: TourRoom) => Promise<void>;
  onEditHotspots: (room: TourRoom) => void;
}

// TourRoomCard shows one recorded room with its processing status, quality, and management actions.
export function TourRoomCard({ room, onUpdate, onDelete, onEditHotspots }: TourRoomCardProps) {
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
            <input id={`room-name-${room.id}`} value={name} maxLength={40} onChange={(e) => setName(e.target.value)} onKeyDown={saveOnEnter} className="w-full h-9 px-3 rounded-lg border border-neutral-300 text-sm" />
            <label htmlFor={`room-note-${room.id}`} className="block text-[11px] font-semibold text-neutral-700">Catatan ruangan (opsional)</label>
            <input id={`room-note-${room.id}`} value={note} maxLength={160} placeholder="Contoh: 3×3 m, jendela menghadap timur" onChange={(e) => setNote(e.target.value)} onKeyDown={saveOnEnter} className="w-full h-9 px-3 rounded-lg border border-neutral-300 text-sm" />
            <button type="button" onClick={saveDetails} className="h-9 px-3 rounded-lg bg-sage-600 hover:bg-sage-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer">
              <Check className="w-4 h-4" aria-hidden="true" /> Simpan
            </button>
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
        {room.status === "failed" && <p className="text-xs text-rose-700">{room.error_message}</p>}
        <div className="flex gap-2 mt-auto pt-1">
          {room.status === "ready" && (
            <button type="button" onClick={() => onEditHotspots(room)} className="flex-1 h-9 rounded-lg border border-neutral-300 text-xs font-semibold hover:border-sage-600 cursor-pointer inline-flex items-center justify-center gap-1.5">
              <MapPin className="w-4 h-4" aria-hidden="true" /> Atur Panah
            </button>
          )}
          <button
            type="button"
            onClick={() => (confirmDelete ? onDelete(room) : setConfirmDelete(true))}
            onBlur={() => setConfirmDelete(false)}
            className={`h-9 px-3 rounded-lg text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5 ${confirmDelete ? "bg-rose-600 text-white" : "border border-neutral-300 text-rose-700 hover:border-rose-500"}`}
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
            {confirmDelete ? "Yakin hapus?" : "Hapus"}
          </button>
        </div>
      </div>
    </li>
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
    <button type="button" onClick={onClick} aria-label={label} title={label} className="w-9 h-9 rounded-lg hover:bg-neutral-100 text-neutral-600 inline-flex items-center justify-center cursor-pointer">
      {children}
    </button>
  );
}
