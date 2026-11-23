"use client";

import { useEffect } from "react";
import Link from "next/link";
import { PropertyForm } from "@/components/properties/PropertyForm";
import { WalkInsideDraftSection } from "@/components/tour/WalkInsideDraftSection";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { useNewPropertySubmission } from "./useNewPropertySubmission";

// Keeps pending room drafts on the page until their property and panorama uploads have completed.
export default function NewPropertyPage() {
  const { save, isSubmitting, error, rooms, setRooms, uploadStatus, createdId } = useNewPropertySubmission();

  useEffect(() => {
    if (!rooms.length) return;
    // Warns before reloading a page with a recording still held in memory.
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [rooms.length]);

  return (
    <div className="w-full space-y-4">
      {error && <Alert type="error" message={error} />}
      {uploadStatus && (
        <p role="status" aria-live="polite" className="text-sm font-semibold text-sage-800 bg-sage-50 border border-sage-200 rounded-xl px-4 py-3">
          {uploadStatus}
        </p>
      )}
      {createdId === null && (
        <fieldset disabled={isSubmitting} className="min-w-0">
          <PropertyForm onSubmit={save} isSubmitting={isSubmitting}
            walkInsideSlot={<WalkInsideDraftSection rooms={rooms} onChange={setRooms} />} />
        </fieldset>
      )}
      {createdId !== null && rooms.length > 0 && !isSubmitting && (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void save()}>Coba unggah lagi ({rooms.length} ruangan)</Button>
          <Button variant="outline" render={<Link href={`/dashboard/properties/${createdId}/edit`} />}>
            Buka properti tanpa sisa unggahan
          </Button>
        </div>
      )}
    </div>
  );
}
