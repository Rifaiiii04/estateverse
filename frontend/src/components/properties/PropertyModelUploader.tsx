"use client";

import React, { useState, useRef } from "react";
import { Upload } from "lucide-react";
import { uploadModel } from "@/lib/api/properties";
import { getMediaUrl } from "@/lib/api/client";
import { useToast } from "@/context/ToastContext";
import { FormModelPreview } from "@/components/three/FormModelPreview";
import { ModelUploadProgress } from "./ModelUploadProgress";

interface PropertyModelUploaderProps {
  model3DPath: string;
  onChange: (path: string) => void;
  onError: (msg: string) => void;
}

// PropertyModelUploader handles 3D model file validation, upload progress, and live 3D preview.
export function PropertyModelUploader({
  model3DPath,
  onChange,
  onError,
}: PropertyModelUploaderProps) {
  const { toast } = useToast();
  const modelInputRef = useRef<HTMLInputElement>(null);
  const [uploadingModel, setUploadingModel] = useState(false);
  const [uploadingFile, setUploadingFile] = useState<{ name: string; size: number } | null>(null);

  const handleModelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    const allowed = [".glb", ".gltf", ".fbx", ".obj"];
    if (!allowed.includes(ext) || file.size > 150 * 1024 * 1024) {
      const msg = "Model 3D harus berformat .GLB, .glTF, .FBX, atau .OBJ (maks. 150 MB).";
      onError(msg);
      toast.error(msg, "Format File Tidak Didukung");
      return;
    }
    setUploadingModel(true);
    setUploadingFile({ name: file.name, size: file.size });
    onError("");
    try {
      const path = await uploadModel(file);
      onChange(path);
      toast.success(`File ${file.name} berhasil diunggah!`, "Upload 3D Berhasil");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal mengunggah model 3D.";
      onError(msg);
      toast.error(msg, "Gagal Mengunggah");
    } finally {
      setUploadingModel(false);
      e.target.value = "";
    }
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-2xs space-y-3.5">
      <div className="flex items-center justify-between border-b border-neutral-100 pb-2.5">
        <div>
          <h2 className="text-sm font-bold text-neutral-950">3. Tampilan Rumah 3D</h2>
          <span className="text-[11px] text-neutral-400">File 3D (.GLB, .glTF, .FBX, .OBJ — Maks. 150 MB)</span>
        </div>
        <span className="text-[11px] font-semibold text-sage-700">Otomatis Rapi</span>
      </div>

      <input
        ref={modelInputRef}
        type="file"
        accept=".glb,.gltf,.fbx,.obj"
        onChange={handleModelUpload}
        disabled={uploadingModel}
        className="hidden"
      />

      <button
        type="button"
        disabled={uploadingModel}
        onClick={() => modelInputRef.current?.click()}
        className="w-full h-10 rounded-xl border border-dashed border-sage-400 bg-sage-50/40 hover:bg-sage-50 text-xs font-semibold text-sage-800 inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
      >
        <Upload className="w-4 h-4 text-sage-600" />
        <span>{model3DPath ? "Ganti File Model 3D" : "Unggah File Model 3D"}</span>
      </button>

      {uploadingModel && uploadingFile && (
        <ModelUploadProgress
          fileName={uploadingFile.name}
          fileSize={uploadingFile.size}
          isUploading={uploadingModel}
        />
      )}

      {model3DPath && !uploadingModel ? (
        <FormModelPreview modelUrl={getMediaUrl(model3DPath)} onRemove={() => onChange("")} />
      ) : !uploadingModel ? (
        <p className="text-[11px] text-neutral-400 leading-relaxed">
          Jika belum mengunggah file 3D, sistem akan menampilkan contoh rumah 3D otomatis.
        </p>
      ) : null}
    </div>
  );
}
