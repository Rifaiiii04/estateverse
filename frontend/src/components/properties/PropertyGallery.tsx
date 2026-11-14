"use client";

/* eslint-disable @next/next/no-img-element */
import React, { useState } from "react";
import { Camera } from "lucide-react";
import { PropertyImage } from "@/types/property";
import { getMediaUrl } from "@/lib/api/client";

interface PropertyGalleryProps {
  images: PropertyImage[];
}

// PropertyGallery displays an interactive photo gallery with large preview and selectable thumbnails.
export function PropertyGallery({ images }: PropertyGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<string>(
    images.length > 0 ? images[0].file_path : ""
  );

  if (!images || images.length === 0) {
    return null;
  }

  return (
    <div className="bg-white p-6 rounded-2xl border border-neutral-200/90 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-neutral-950 flex items-center gap-2">
          <Camera className="w-4 h-4 text-neutral-700" />
          <span>Dokumentasi Foto Lapangan</span>
        </h3>
        <span className="text-xs text-neutral-500 font-medium">
          {images.length} Foto Resolusi Tinggi
        </span>
      </div>

      {selectedImage && (
        <div className="relative aspect-[16/10] rounded-xl overflow-hidden border border-neutral-200 bg-neutral-100">
          <img
            src={getMediaUrl(selectedImage)}
            alt="Foto properti terpilih"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
        {images.map((img) => (
          <button
            key={img.id}
            type="button"
            onClick={() => setSelectedImage(img.file_path)}
            className={`aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
              selectedImage === img.file_path
                ? "border-neutral-950 ring-2 ring-neutral-950/20"
                : "border-neutral-200 hover:border-neutral-400"
            }`}
          >
            <img
              src={getMediaUrl(img.file_path)}
              alt={img.alt_text || "Thumbnail foto properti"}
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
