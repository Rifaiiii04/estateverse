import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/context/ToastContext";
import { createProperty } from "@/lib/api/properties";
import { importTourPanorama, uploadTourCapture } from "@/lib/api/tours";
import type { PropertyInput } from "@/types/property";
import type { DraftTourRoom } from "@/types/tour";

// Sends the recorded frames or the imported panorama associated with one local room.
async function uploadRoom(propertyId: number, room: DraftTourRoom) {
  if (room.kind === "capture" && room.frames) {
    return uploadTourCapture(propertyId, room.name, { frames: room.frames, extras: room.extras ?? {} });
  }
  if (room.kind === "import" && room.file) return importTourPanorama(propertyId, room.name, room.file);
  throw new Error("Berkas panorama tidak tersedia.");
}

// Tracks each successful upload so a retry sends only the rooms that still have local files.
async function uploadPendingRooms(propertyId: number, rooms: DraftTourRoom[], onStatus: (text: string) => void) {
  const pending: DraftTourRoom[] = [];
  const errors: string[] = [];
  for (const [index, room] of rooms.entries()) {
    onStatus(`Mengunggah ${room.name} (${index + 1}/${rooms.length})…`);
    try {
      await uploadRoom(propertyId, room);
    } catch (error) {
      pending.push(room);
      errors.push(`${room.name} — ${error instanceof Error ? error.message : "Unggahan gagal."}`);
    }
  }
  return { pending, errors };
}

// Creates the property once and lets a seller retry pending room uploads from the same page.
export function useNewPropertySubmission() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [rooms, setRooms] = useState<DraftTourRoom[]>([]);
  const [uploadStatus, setUploadStatus] = useState("");
  const [createdId, setCreatedId] = useState<number | null>(null);
  const busy = useRef(false);

  // Reuses the saved ID after a failed upload while keeping locally captured JPEGs available.
  const save = async (data?: PropertyInput) => {
    if (busy.current || (!data && createdId === null)) return;
    busy.current = true;
    setIsSubmitting(true);
    setError("");
    try {
      let id = createdId;
      if (id === null && data) {
        const status = rooms.some((room) => room.kind === "capture") ? "draft" : data.status;
        id = (await createProperty({ ...data, status })).id;
        if (rooms.length) setCreatedId(id);
      }
      if (id === null) return;
      const { pending, errors } = await uploadPendingRooms(id, rooms, setUploadStatus);
      setRooms(pending);
      if (pending.length) {
        setError(`Properti tersimpan. ${errors.join(" ")} Rekaman masih tersedia selama halaman ini terbuka.`);
        return;
      }
      toast.success(rooms.length ? "Semua ruangan terkirim. Status panorama tersedia di halaman Edit." : "Listing properti baru Anda berhasil dibuat!");
      router.push(rooms.length ? `/dashboard/properties/${id}/edit` : "/dashboard/properties");
    } catch (failure) {
      const message = failure instanceof Error ? failure.message : "Gagal menambahkan properti.";
      setError(message);
      toast.error(message);
    } finally {
      busy.current = false;
      setIsSubmitting(false);
      setUploadStatus("");
    }
  };
  return { save, isSubmitting, error, rooms, setRooms, uploadStatus, createdId };
}
