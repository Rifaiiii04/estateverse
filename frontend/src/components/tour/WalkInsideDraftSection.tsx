"use client";

/* eslint-disable @next/next/no-img-element */
import React, { useEffect, useRef, useState } from "react";
import { Camera, ImageUp, Smartphone, Trash2 } from "lucide-react";
import type { CaptureResult, DraftTourRoom } from "@/types/tour";
import { captureSupportIssue, isLikelyDesktop } from "@/lib/capture/frameGrabber";
import { cn } from "@/lib/utils/cn";
import { Button, buttonVariants } from "@/components/ui/Button";
import { SphereCaptureModal } from "@/components/capture/SphereCaptureModal";

/** Recorded rooms stay in the phone's memory until saving (~8 MB each), so the draft is capped. */
export const MAX_DRAFT_ROOMS = 8;

interface WalkInsideDraftSectionProps {
  rooms: DraftTourRoom[];
  onChange: (rooms: DraftTourRoom[]) => void;
}

// WalkInsideDraftSection lets sellers record 360° rooms while creating a listing; rooms upload when the listing is saved.
export function WalkInsideDraftSection({ rooms, onChange }: WalkInsideDraftSectionProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordBlocked] = useState<string | null>(
    () => captureSupportIssue() ?? (isLikelyDesktop() ? "Perekaman memakai kamera dan sensor gerak HP. Buka halaman ini di HP Anda untuk merekam." : null)
  );
  const roomsRef = useRef(rooms);
  const isFull = rooms.length >= MAX_DRAFT_ROOMS;

  useEffect(() => {
    roomsRef.current = rooms;
  }, [rooms]);
  useEffect(() => () => roomsRef.current.forEach((r) => URL.revokeObjectURL(r.thumbUrl)), []);

  // Keeps the completed strip JPEGs with the room until the seller saves the property.
  const addCapture = (name: string, { bands, extras }: CaptureResult) => {
    if (bands.length === 0 || roomsRef.current.length >= MAX_DRAFT_ROOMS) return;
    const room: DraftTourRoom = { key: `c-${Date.now()}`, name, kind: "capture", bands, extras, thumbUrl: URL.createObjectURL(bands[0].blob) };
    onChange([...roomsRef.current, room]);
  };

  // Adds a ready-made 360° photo to the draft list.
  const addImport = (file: File | undefined) => {
    if (!file || isFull) return;
    const room: DraftTourRoom = { key: `i-${Date.now()}`, name: `Ruangan ${rooms.length + 1}`, kind: "import", file, thumbUrl: URL.createObjectURL(file) };
    onChange([...rooms, room]);
  };

  // Removes a draft room and frees its thumbnail.
  const remove = (key: string) => {
    const target = rooms.find((r) => r.key === key);
    if (target) URL.revokeObjectURL(target.thumbUrl);
    onChange(rooms.filter((r) => r.key !== key));
  };

  return (
    <section aria-labelledby="walk-inside-title" className="bg-white p-5 rounded-2xl border border-sage-200 shadow-2xs space-y-4">
      <div className="space-y-1 border-b border-neutral-100 pb-2.5">
        <h2 id="walk-inside-title" className="text-sm font-bold text-neutral-950">Walk Inside 360°</h2>
        <p className="text-xs text-neutral-700">
          Pilih Rekam Ruangan dan putar HP perlahan ke kanan dari satu posisi.
          Ikuti panduan untuk merekam bagian atas dan bawah. Panorama diunggah saat properti disimpan.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => setIsRecording(true)} disabled={Boolean(recordBlocked) || isFull}>
          <Camera aria-hidden="true" /> Rekam Ruangan
        </Button>
        <label className={cn(buttonVariants({ variant: "outline" }), "focus-within:ring-3 focus-within:ring-ring/50")}>
          <ImageUp aria-hidden="true" /> Unggah Foto 360
          <input type="file" accept="image/jpeg,image/png" className="sr-only" disabled={isFull} onChange={(e) => addImport(e.target.files?.[0])} />
        </label>
      </div>

      {recordBlocked && (
        <p className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          <Smartphone className="w-4 h-4 shrink-0" aria-hidden="true" /> {recordBlocked}
        </p>
      )}

      {rooms.length > 0 ? (
        <ul className="grid grid-cols-2 gap-2">
          {rooms.map((room) => (
            <li key={room.key} className="rounded-xl border border-neutral-200 overflow-hidden">
              <img src={room.thumbUrl} alt={`Ruangan ${room.name}`} className="w-full aspect-video object-cover bg-neutral-100" />
              <div className="flex items-center justify-between gap-1 px-2 py-1.5">
                <span className="text-xs font-semibold text-neutral-900 truncate">{room.name}</span>
                <Button variant="destructive" size="icon-sm" onClick={() => remove(room.key)} aria-label={`Hapus ${room.name}`}>
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-neutral-600">Belum ada ruangan. Mulai dari ruang tamu, lalu kamar, dapur, dan teras.</p>
      )}
      {isFull && <p className="text-xs text-neutral-600">Maksimal {MAX_DRAFT_ROOMS} ruangan per penyimpanan. Tambah lagi nanti dari halaman Edit.</p>}

      {isRecording && (
        <SphereCaptureModal defaultRoomName={`Ruangan ${rooms.length + 1}`} onClose={() => setIsRecording(false)} onCaptured={addCapture} />
      )}
    </section>
  );
}
