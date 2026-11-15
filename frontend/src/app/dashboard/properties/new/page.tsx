"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PropertyInput } from "@/types/property";
import type { DraftTourRoom } from "@/types/tour";
import { createProperty } from "@/lib/api/properties";
import { importTourPanorama, uploadTourCapture } from "@/lib/api/tours";
import { useToast } from "@/context/ToastContext";
import { PropertyForm } from "@/components/properties/PropertyForm";
import { WalkInsideDraftSection } from "@/components/tour/WalkInsideDraftSection";
import { Alert } from "@/components/ui/Alert";

// uploadDraftRoom sends one locally recorded room (or 360° photo) to the newly created property.
async function uploadDraftRoom(propertyId: number, room: DraftTourRoom) {
  if (room.kind === "capture" && room.frames) return uploadTourCapture(propertyId, room.name, room.frames);
  if (room.kind === "import" && room.file) return importTourPanorama(propertyId, room.name, room.file);
}

// NewPropertyPage creates a listing and then uploads the Walk Inside 360° rooms recorded on this page.
export default function NewPropertyPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [draftRooms, setDraftRooms] = useState<DraftTourRoom[]>([]);
  const [uploadStatus, setUploadStatus] = useState("");

  useEffect(() => {
    if (draftRooms.length === 0) return;
    // Warns before leaving the page while recorded rooms exist only on this phone.
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [draftRooms.length]);

  // Uploads every draft room in order, returning how many failed.
  const uploadDrafts = async (propertyId: number): Promise<number> => {
    let failed = 0;
    for (const [i, room] of draftRooms.entries()) {
      setUploadStatus(`Mengunggah Walk Inside 360° — ruangan ${i + 1}/${draftRooms.length} (${room.name})…`);
      try {
        await uploadDraftRoom(propertyId, room);
      } catch {
        failed++;
        toast.error(`Ruangan "${room.name}" gagal diunggah. Rekam ulang dari halaman Edit.`);
      }
    }
    return failed;
  };

  // Creates the listing, uploads recorded rooms, then opens the edit page to show processing status.
  const handleSubmit = async (data: PropertyInput) => {
    setIsSubmitting(true);
    setError("");
    try {
      const hasRooms = draftRooms.length > 0;
      const hasAsyncCaptures = draftRooms.some((room) => room.kind === "capture");
      const created = await createProperty({ ...data, status: hasAsyncCaptures ? "draft" : data.status });
      const failed = hasRooms ? await uploadDrafts(created.id) : 0;
      toast.success(
        hasRooms && failed < draftRooms.length
          ? hasAsyncCaptures
            ? "Draft tersimpan. Walk Inside 360° sedang diproses; Anda akan mendapat pemberitahuan saat siap dipublish."
            : "Properti tersimpan dan foto 360° siap digunakan."
          : "Listing properti baru Anda berhasil dibuat!",
        "Properti Berhasil Dibuat",
        6000
      );
      router.push(hasRooms ? `/dashboard/properties/${created.id}/edit` : "/dashboard/properties");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal menambahkan properti.";
      setError(msg);
      toast.error(msg, "Gagal Membuat Properti");
    } finally {
      setIsSubmitting(false);
      setUploadStatus("");
    }
  };

  return (
    <div className="w-full space-y-4">
      {error && <Alert type="error" message={error} />}
      {uploadStatus && (
        <p role="status" aria-live="polite" className="text-sm font-semibold text-sage-800 bg-sage-50 border border-sage-200 rounded-xl px-4 py-3">
          {uploadStatus}
        </p>
      )}
      <PropertyForm
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        walkInsideSlot={<WalkInsideDraftSection rooms={draftRooms} onChange={setDraftRooms} />}
      />
    </div>
  );
}
