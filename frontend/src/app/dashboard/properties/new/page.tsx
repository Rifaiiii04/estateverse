"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { PropertyInput } from "@/types/property";
import { createProperty } from "@/lib/api/properties";
import { useToast } from "@/context/ToastContext";
import { PropertyForm } from "@/components/properties/PropertyForm";
import { Alert } from "@/components/ui/Alert";

// NewPropertyPage renders the compact seller property creation workspace.
export default function NewPropertyPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (data: PropertyInput) => {
    setIsSubmitting(true);
    setError("");
    try {
      await createProperty(data);
      if (data.model_3d_path) {
        toast.success(
          "Listing disimpan! Model 3D sedang dianalisis di background dan akan otomatis dipublikasikan begitu selesai.",
          "Properti Berhasil Dibuat",
          6000
        );
      } else {
        toast.success("Listing properti baru Anda berhasil dibuat!", "Properti Berhasil Dibuat");
      }
      router.push("/dashboard/properties");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal menambahkan properti.";
      setError(msg);
      toast.error(msg, "Gagal Membuat Properti");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      {error && <Alert type="error" message={error} />}
      <PropertyForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </div>
  );
}
