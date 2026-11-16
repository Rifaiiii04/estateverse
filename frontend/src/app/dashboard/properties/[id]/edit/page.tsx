"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Property, PropertyInput } from "@/types/property";
import { getOwnerProperty, updateProperty } from "@/lib/api/properties";
import { useToast } from "@/context/ToastContext";
import { PropertyForm } from "@/components/properties/PropertyForm";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Alert } from "@/components/ui/Alert";
import { TourRoomsManager } from "@/components/tour/TourRoomsManager";
import { PromoVideoCard } from "@/components/promo/PromoVideoCard";

// EditPropertyPage loads existing property specifications into the compact seller workspace.
export default function EditPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const [property, setProperty] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchProp = async () => {
      try {
        const data = await getOwnerProperty(Number(resolvedParams.id));
        setProperty(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal memuat data properti.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchProp();
  }, [resolvedParams.id]);

  const handleSubmit = async (data: PropertyInput) => {
    setIsSubmitting(true);
    setError("");
    try {
      const saved = await updateProperty(Number(resolvedParams.id), data);
      if (data.status === "published" && saved.status === "draft") {
        toast.info("Perubahan tersimpan sebagai draft sampai semua panorama selesai diproses.", "Menunggu Panorama");
      } else {
        toast.success("Perubahan data properti berhasil disimpan!", "Listing Diperbarui");
      }
      router.push("/dashboard/properties");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal memperbarui properti.";
      setError(msg);
      toast.error(msg, "Gagal Memperbarui");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner text="Memuat data properti..." />;
  }

  return (
    <div className="w-full space-y-4">
      {error && <Alert type="error" message={error} />}
      {property && (
        <PropertyForm
          initialData={property}
          walkInsideSlot={
            <>
              <TourRoomsManager propertyId={property.id} />
              <PromoVideoCard property={property} />
            </>
          }
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}
