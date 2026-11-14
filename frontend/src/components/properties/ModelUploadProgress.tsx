"use client";

import React from "react";
import { Loader2, Box } from "lucide-react";

interface ModelUploadProgressProps {
  fileName: string;
  fileSize: number;
  isUploading: boolean;
}

// ModelUploadProgress shows an honest indeterminate indicator while a 3D model file uploads and is checked.
export function ModelUploadProgress({ fileName, fileSize, isUploading }: ModelUploadProgressProps) {
  if (!isUploading) return null;
  const sizeMb = (fileSize / (1024 * 1024)).toFixed(1);

  return (
    <div role="status" aria-live="polite" className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/80 space-y-3">
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 font-medium text-neutral-800 min-w-0">
          <Box className="w-4 h-4 text-neutral-950 shrink-0" aria-hidden="true" />
          <span className="truncate max-w-[220px] sm:max-w-xs">{fileName}</span>
          <span className="text-neutral-600 font-mono">({sizeMb} MB)</span>
        </div>
        <span className="flex items-center gap-1.5 text-neutral-900 font-semibold shrink-0">
          <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
          Mengunggah &amp; memeriksa file…
        </span>
      </div>
      <div className="w-full bg-neutral-200 rounded-full h-2 overflow-hidden" aria-hidden="true">
        <div className="h-2 w-1/3 bg-neutral-900 rounded-full animate-pulse" />
      </div>
    </div>
  );
}
