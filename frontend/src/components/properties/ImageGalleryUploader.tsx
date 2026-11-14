"use client";

/* eslint-disable @next/next/no-img-element */
import React, { useState, useRef } from "react";
import { X, ImagePlus, Star } from "lucide-react";
import { uploadImage } from "@/lib/api/properties";
import { getMediaUrl } from "@/lib/api/client";

interface ImageGalleryUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  onError: (msg: string) => void;
}

// ImageGalleryUploader handles multi-image selection, batch uploads, cover selection, and deletion.
export function ImageGalleryUploader({
  images,
  onChange,
  onError,
}: ImageGalleryUploaderProps) {
  const [uploadingCount, setUploadingCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Processes and uploads one or multiple selected image files sequentially.
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);
    const allowed = [".jpg", ".jpeg", ".png", ".webp"];

    if (images.length + files.length > 20) {
      onError("Maksimal total 20 foto per properti.");
      e.target.value = "";
      return;
    }

    for (const file of files) {
      const ext = "." + file.name.split(".").pop()?.toLowerCase();
      if (!allowed.includes(ext) || file.size > 10 * 1024 * 1024) {
        onError(`File "${file.name}" tidak valid. Gunakan JPG/PNG/WebP maks. 10MB.`);
        e.target.value = "";
        return;
      }
    }

    setUploadingCount(files.length);
    onError("");
    const uploadedPaths: string[] = [];

    try {
      for (const file of files) {
        const path = await uploadImage(file);
        uploadedPaths.push(path);
      }
      onChange([...images, ...uploadedPaths]);
    } catch (err) {
      if (uploadedPaths.length > 0) {
        onChange([...images, ...uploadedPaths]);
      }
      onError(err instanceof Error ? err.message : "Gagal mengunggah sebagian foto.");
    } finally {
      setUploadingCount(0);
      e.target.value = "";
    }
  };

  // Moves the chosen image index to index 0 so it becomes the default cover photo.
  const setAsCover = (index: number) => {
    if (index === 0) return;
    const picked = images[index];
    const rest = images.filter((_, i) => i !== index);
    onChange([picked, ...rest]);
  };

  const isUploading = uploadingCount > 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <span className="block text-xs font-bold text-neutral-900">
            Galeri Foto Properti (Bisa Pilih Banyak)
          </span>
          <span className="text-[11px] text-neutral-500">
            Foto pertama menjadi preview utama. Format JPG, PNG, WebP (Maks. 10 MB/foto)
          </span>
        </div>
        <span className="text-xs font-semibold text-sage-700 bg-sage-50 border border-sage-200 px-2 py-0.5 rounded-lg">
          {images.length}/20 foto
        </span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        disabled={isUploading}
        className="hidden"
      />

      <button
        type="button"
        disabled={isUploading}
        onClick={() => fileInputRef.current?.click()}
        className="w-full h-10 rounded-xl border border-dashed border-neutral-300 hover:border-sage-500 hover:bg-sage-50/40 text-xs font-semibold text-neutral-700 hover:text-sage-800 inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
      >
        <ImagePlus className="w-4 h-4 text-sage-600" />
        <span>
          {isUploading
            ? `Mengunggah ${uploadingCount} foto...`
            : "Pilih & Upload Foto Rumah (Bisa Lebih dari 1)"}
        </span>
      </button>

      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
          {images.map((img, idx) => (
            <div
              key={`${img}-${idx}`}
              className={`relative aspect-[16/11] rounded-xl overflow-hidden border bg-neutral-100 group ${
                idx === 0 ? "border-sage-600 ring-2 ring-sage-600/20" : "border-neutral-200"
              }`}
            >
              <img src={getMediaUrl(img)} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />

              {idx === 0 ? (
                <span className="absolute bottom-1.5 left-1.5 bg-sage-600/95 text-white text-[10px] font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1 shadow-2xs">
                  <Star className="w-2.5 h-2.5 fill-white" />
                  <span>Utama</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setAsCover(idx)}
                  className="absolute bottom-1.5 left-1.5 bg-neutral-950/75 hover:bg-sage-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  Jadikan Utama
                </button>
              )}

              <button
                type="button"
                onClick={() => onChange(images.filter((_, i) => i !== idx))}
                className="absolute top-1.5 right-1.5 bg-neutral-950/80 hover:bg-rose-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs transition-colors cursor-pointer"
                title="Hapus foto"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
