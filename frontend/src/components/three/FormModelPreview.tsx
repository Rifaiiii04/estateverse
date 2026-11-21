"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { Box, Eye, EyeOff, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

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
          <Button variant="outline" size="sm" onClick={() => setIsOpen((prev) => !prev)}>
            {isOpen ? <EyeOff /> : <Eye className="text-primary" />}
            <span>{isOpen ? "Tutup" : "Preview 3D"}</span>
          </Button>

          <Button variant="destructive" size="icon-sm" onClick={onRemove} aria-label="Hapus model 3D" title="Hapus Model 3D">
            <Trash2 />
          </Button>
        </div>
      </div>

      {isOpen ? (
        <div>
          <div className="w-full bg-neutral-100 relative overflow-hidden">
            <DynamicCanvas key={previewKey} modelUrl={modelUrl} />
          </div>
          <div className="px-3.5 py-2 bg-white border-t border-neutral-200/70 text-[11px] text-neutral-500 flex items-center justify-between">
            <span>Klik &amp; geser untuk mencoba tampilan 3D</span>
            <Button variant="link" size="xs" className="px-0" onClick={() => setPreviewKey((k) => k + 1)}>
              <RotateCcw />
              <span>Muat Ulang</span>
            </Button>
          </div>
        </div>
      ) : (
        <div className="px-3.5 py-2 text-[11px] text-neutral-500 flex items-center justify-between gap-2">
          <span className="truncate font-mono text-[10px] text-neutral-500">{modelUrl}</span>
          <span className="shrink-0 text-sage-700 font-medium">Siap digunakan</span>
        </div>
      )}
    </div>
  );
}
