"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Camera, ImageUp, Smartphone } from "lucide-react";
import type { TourRoom } from "@/types/tour";
import { deleteTourRoom, getOwnerTourRooms, importTourPanorama, updateTourRoom } from "@/lib/api/tours";
import { captureSupportIssue, isLikelyDesktop } from "@/lib/capture/frameGrabber";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/ui/Button";
import { SphereCaptureModal } from "@/components/capture/SphereCaptureModal";
import { TourRoomCard } from "./TourRoomCard";
import { HotspotEditor } from "./HotspotEditor";

const POLL_INTERVAL_MS = 4000;

// TourRoomsManager is the seller's workspace for recording, importing, and organizing 360° rooms.
export function TourRoomsManager({ propertyId }: { propertyId: number }) {
  const { toast } = useToast();
  const [rooms, setRooms] = useState<TourRoom[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  // Rendered only after the property loads on the client, so browser checks are safe in initializers.
  const [captureIssue] = useState<string | null>(() => captureSupportIssue());
  const [isDesktop] = useState(() => isLikelyDesktop());
  const editingRoom = useMemo(() => rooms.find((r) => r.id === editingId) ?? null, [rooms, editingId]);

  // Reloads the seller's rooms from the server.
  const load = useCallback(async () => {
    try {
      setRooms(await getOwnerTourRooms(propertyId));
    } catch {
      toast.error("Gagal memuat daftar ruangan 360°.");
    }
  }, [propertyId, toast]);

  useEffect(() => {
    let active = true;
    getOwnerTourRooms(propertyId)
      .then((list) => active && setRooms(list))
      .catch(() => toast.error("Gagal memuat daftar ruangan 360°."));
    return () => {
      active = false;
    };
  }, [propertyId, toast]);

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
    <section aria-labelledby="tour-manager-title" className="bg-white border border-sage-200 rounded-2xl p-5 shadow-2xs space-y-4">
      <div className="space-y-3">
        <div className="space-y-1 border-b border-neutral-100 pb-2.5">
          <h2 id="tour-manager-title" className="text-sm font-bold text-neutral-950">Walk Inside 360°</h2>
          <p className="text-xs text-neutral-700">Tekan Rekam Ruangan, kamera HP terbuka, lalu berdiri di tengah ruangan dan putar HP di titik yang sama — sistem memotret otomatis dan menyusunnya menjadi panorama 360°.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => setIsRecording(true)} disabled={Boolean(recordBlocked)}>
            <Camera className="w-4 h-4" aria-hidden="true" /> Rekam Ruangan
          </Button>
          <label className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-neutral-200 text-xs sm:text-sm font-semibold cursor-pointer hover:border-sage-600 focus-within:ring-2 focus-within:ring-sage-600/30">
            <ImageUp className="w-4 h-4" aria-hidden="true" />
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
            <TourRoomCard key={room.id} room={room} onUpdate={handleUpdate} onDelete={handleDelete} onEditHotspots={(r) => setEditingId(r.id)} />
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
    </section>
  );
}
