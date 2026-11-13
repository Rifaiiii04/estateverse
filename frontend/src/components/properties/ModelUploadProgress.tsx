"use client";

import React, { useEffect, useState } from "react";
import { Loader2, Box, CheckCircle2, ShieldCheck } from "lucide-react";

interface ModelUploadProgressProps {
  fileName: string;
  fileSize: number;
  isUploading: boolean;
}

// ModelUploadProgress displays an animated multi-step upload and binary verification indicator.
export function ModelUploadProgress({
  fileName,
  fileSize,
  isUploading,
}: ModelUploadProgressProps) {
  const [progress, setProgress] = useState(15);
  const [currentStep, setCurrentStep] = useState<"uploading" | "tagging" | "complete">("uploading");
  const sizeMb = (fileSize / (1024 * 1024)).toFixed(1);

  useEffect(() => {
    if (!isUploading) {
      setProgress(100);
      setCurrentStep("complete");
      return;
    }

    setProgress(15);
    setCurrentStep("uploading");

    const timer1 = setTimeout(() => {
      setProgress(55);
    }, 700);

    const timer2 = setTimeout(() => {
      setProgress(85);
      setCurrentStep("tagging");
    }, 2200);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [isUploading]);

  if (!isUploading && currentStep !== "complete") {
    return null;
  }

  return (
    <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/80 space-y-3 transition-all animate-fadeIn">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 font-medium text-neutral-800">
          <Box className="w-4 h-4 text-neutral-950" />
          <span className="truncate max-w-[220px] sm:max-w-xs">{fileName}</span>
          <span className="text-neutral-400 font-mono">({sizeMb} MB)</span>
        </div>

        {isUploading ? (
          <span className="flex items-center gap-1.5 text-neutral-900 font-semibold">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>{currentStep === "uploading" ? "Mengunggah..." : "Menyiapkan Tampilan 3D..."}</span>
          </span>
        ) : (
          <span className="flex items-center gap-1 text-emerald-700 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Selesai</span>
          </span>
        )}
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-neutral-200 rounded-full h-2 overflow-hidden">
        <div
          className="bg-neutral-950 h-2 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Step description */}
      <div className="flex items-center gap-2 text-[11px] text-neutral-600">
        {currentStep === "uploading" ? (
          <>
            <Loader2 className="w-3 h-3 text-neutral-900 animate-spin shrink-0" />
            <span>Mengunggah file 3D rumah Anda...</span>
          </>
        ) : currentStep === "tagging" ? (
          <>
            <ShieldCheck className="w-3 h-3 text-neutral-900 shrink-0" />
            <span>Menyesuaikan ukuran dan posisi tampilan 3D secara otomatis...</span>
          </>
        ) : (
          <>
            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
            <span className="text-emerald-700 font-medium">Tampilan 3D berhasil disimpan dan siap digunakan.</span>
          </>
        )}
      </div>
    </div>
  );
}
