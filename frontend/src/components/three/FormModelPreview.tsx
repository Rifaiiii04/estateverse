"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { Box, Eye, EyeOff, RotateCcw, Trash2 } from "lucide-react";

const DynamicCanvas = dynamic(
  () => import("./HouseCanvas").then((mod) => mod.HouseCanvas),
  { ssr: false }
);

interface FormModelPreviewProps {
  modelUrl: string;
  onRemove: () => void;
}

// FormModelPreview renders an on-demand interactive 3D viewport inside the compact property form.
export function FormModelPreview({ modelUrl, onRemove }: FormModelPreviewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);

  return (
    <div className="rounded-xl border border-neutral-200 overflow-hidden bg-neutral-50/70">
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-white border-b border-neutral-200/70 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <Box className="w-4 h-4 text-sage-600 shrink-0" />
          <span className="font-bold text-neutral-900 truncate">Model 3D Terpasang</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="h-7 px-2.5 rounded-lg border border-neutral-200 bg-white hover:border-sage-400 text-neutral-700 hover:text-sage-800 text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            {isOpen ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-sage-600" />}
            <span>{isOpen ? "Tutup" : "Preview 3D"}</span>
          </button>

          <button
            type="button"
            onClick={onRemove}
            className="h-7 px-2 rounded-lg border border-neutral-200 bg-white hover:bg-rose-50 hover:border-rose-200 text-rose-500 text-xs inline-flex items-center justify-center transition-colors cursor-pointer"
            title="Hapus Model 3D"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {isOpen ? (
        <div>
          <div className="w-full bg-neutral-100 relative overflow-hidden">
            <DynamicCanvas key={previewKey} modelUrl={modelUrl} />
          </div>
          <div className="px-3.5 py-2 bg-white border-t border-neutral-200/70 text-[11px] text-neutral-500 flex items-center justify-between">
            <span>Klik &amp; geser untuk mencoba tampilan 3D</span>
            <button
              type="button"
              onClick={() => setPreviewKey((k) => k + 1)}
              className="text-sage-700 hover:text-sage-900 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Muat Ulang</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="px-3.5 py-2 text-[11px] text-neutral-500 flex items-center justify-between gap-2">
          <span className="truncate font-mono text-[10px] text-neutral-400">{modelUrl}</span>
          <span className="shrink-0 text-sage-700 font-medium">Siap digunakan</span>
        </div>
      )}
    </div>
  );
}
