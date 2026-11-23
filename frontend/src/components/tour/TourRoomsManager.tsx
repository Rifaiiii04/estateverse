"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, ImageUp, Smartphone } from "lucide-react";
import type { TourRoom } from "@/types/tour";
import { deleteTourRoom, getOwnerTourRooms, importTourPanorama, updateTourRoom } from "@/lib/api/tours";
import { captureSupportIssue, isLikelyDesktop } from "@/lib/capture/frameGrabber";
import { useToast } from "@/context/ToastContext";
import { cn } from "@/lib/utils/cn";
import { Button, buttonVariants } from "@/components/ui/Button";
import { SphereCaptureModal } from "@/components/capture/SphereCaptureModal";
import { TourRoomCard } from "./TourRoomCard";
import { HotspotEditor } from "./HotspotEditor";
import { RoomLayoutEditor } from "./layout/RoomLayoutEditor";

const POLL_INTERVAL_MS = 4000;

// TourRoomsManager is the seller's workspace for recording, importing, and organizing 360° rooms.
export function TourRoomsManager({ propertyId }: { propertyId: number }) {
  const { toast } = useToast();
  const [rooms, setRooms] = useState<TourRoom[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [layoutId, setLayoutId] = useState<number | null>(null);
  // Rendered only after the property loads on the client, so browser checks are safe in initializers.
  const [captureIssue] = useState<string | null>(() => captureSupportIssue());
  const [isDesktop] = useState(() => isLikelyDesktop());
  const previousStatuses = useRef<Map<number, TourRoom["status"]> | null>(null);
  const editingRoom = useMemo(() => rooms.find((r) => r.id === editingId) ?? null, [rooms, editingId]);
  const layoutRoom = useMemo(() => rooms.find((r) => r.id === layoutId) ?? null, [rooms, layoutId]);

  // applyRooms updates the list and announces when background stitching reaches a terminal state.
  const applyRooms = useCallback((next: TourRoom[]) => {
    const previous = previousStatuses.current;
    if (previous) {
      next.forEach((room) => {
        const before = previous.get(room.id);
        if (before === "processing" && room.status === "ready") {
          toast.success("Panorama 360° sudah selesai. Setelah semua ruangan siap, properti dapat dipublish.", "Walk Inside Siap");
        }
        if (before === "processing" && room.status === "failed") {
          toast.error(room.error_message || "Panorama gagal diproses. Rekam ulang ruangan ini.", "Walk Inside Gagal");
        }
      });
    }
    previousStatuses.current = new Map(next.map((room) => [room.id, room.status]));
    setRooms(next);
  }, [toast]);

  // Reloads the seller's rooms from the server.
  const load = useCallback(async () => {
    try {
      applyRooms(await getOwnerTourRooms(propertyId));
    } catch {
      toast.error("Gagal memuat daftar ruangan 360°.");
    }
  }, [applyRooms, propertyId, toast]);

  useEffect(() => {
    let active = true;
    getOwnerTourRooms(propertyId)
      .then((list) => active && applyRooms(list))
      .catch(() => toast.error("Gagal memuat daftar ruangan 360°."));
    return () => {
      active = false;
    };
  }, [applyRooms, propertyId, toast]);

  useEffect(() => {
    if (!rooms.some((r) => r.status === "processing")) return;
    const timer = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [rooms, load]);

  // Uploads a ready-made 360° photo as a new room.
  const handleImport = async (file: File | undefined) => {
    if (!file) return;
    setIsImporting(true);
    try {
      await importTourPanorama(propertyId, `Ruangan ${rooms.length + 1}`, file);
      toast.success("Foto 360° berhasil ditambahkan.");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengunggah foto 360°.");
    } finally {
      setIsImporting(false);
    }
  };

  // Saves a room's name and note, then refreshes the list.
  const handleUpdate = async (room: TourRoom, name: string, note: string) => {
    await updateTourRoom(room.id, name, note).catch(() => toast.error("Gagal menyimpan nama/catatan ruangan."));
    await load();
  };

  // Deletes a room and refreshes the list.
  const handleDelete = async (room: TourRoom) => {
    await deleteTourRoom(room.id).catch(() => toast.error("Gagal menghapus ruangan."));
    await load();
  };

  const recordBlocked = captureIssue ?? (isDesktop ? "Perekaman memakai kamera dan sensor gerak HP. Buka halaman ini di HP Anda." : null);

  return (
    // On phones the section sits directly on the page so each room card is not a card inside a card.
    <section aria-labelledby="tour-manager-title" className="space-y-4 md:bg-white md:border md:border-sage-200 md:rounded-2xl md:p-5 md:shadow-2xs">
      <div className="space-y-3">
        <div className="space-y-1 border-b border-neutral-200 md:border-neutral-100 pb-2.5">
          <h2 id="tour-manager-title" className="text-sm font-bold text-neutral-950">Walk Inside 360°</h2>
          <p className="text-xs text-neutral-700">Tekan Rekam Ruangan, kamera HP terbuka, lalu berdiri di tengah ruangan dan putar HP di titik yang sama — sistem memotret otomatis dan menyusunnya menjadi panorama 360°.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap">
          <Button type="button" className="w-full md:w-auto" onClick={() => setIsRecording(true)} disabled={Boolean(recordBlocked)}>
            <Camera aria-hidden="true" /> Rekam Ruangan
          </Button>
          <label className={cn(buttonVariants({ variant: "outline" }), "w-full md:w-auto focus-within:ring-3 focus-within:ring-ring/50")}>
            <ImageUp aria-hidden="true" />
            {isImporting ? "Mengunggah…" : "Unggah Foto 360"}
            <input type="file" accept="image/jpeg,image/png" className="sr-only" disabled={isImporting} onChange={(e) => handleImport(e.target.files?.[0])} />
          </label>
        </div>
      </div>

      {recordBlocked && (
        <p className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          <Smartphone className="w-4 h-4 shrink-0" aria-hidden="true" /> {recordBlocked}
        </p>
      )}

      {rooms.length === 0 ? (
        <p className="text-sm text-neutral-600">Belum ada ruangan. Mulai dari ruang tamu, lalu kamar, dapur, dan teras.</p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
          {rooms.map((room) => (
            <TourRoomCard key={room.id} room={room} onUpdate={handleUpdate} onDelete={handleDelete} onEditHotspots={(r) => setEditingId(r.id)} onEditLayout={(r) => setLayoutId(r.id)} />
          ))}
        </ul>
      )}

      {isRecording && (
        <SphereCaptureModal
          propertyId={propertyId}
          defaultRoomName={`Ruangan ${rooms.length + 1}`}
          onClose={() => setIsRecording(false)}
          onUploaded={() => void load()}
        />
      )}
      {editingRoom && <HotspotEditor room={editingRoom} rooms={rooms} onClose={() => setEditingId(null)} onChanged={load} />}
      {layoutRoom && <RoomLayoutEditor room={layoutRoom} onClose={() => setLayoutId(null)} onSaved={load} />}
    </section>
  );
}
