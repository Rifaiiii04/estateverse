"use client";

/* eslint-disable @next/next/no-img-element */
import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, ChevronLeft, ChevronRight } from "lucide-react";
import { smoothEase } from "@/components/ui/MotionPrimitives";
import { showPlaceholderOnError } from "@/lib/utils/media";

interface PropertyPhotoStageProps {
  title: string;
  photoUrls: string[];
}

// PropertyPhotoStage shows the listing photos with crossfade, previous/next controls, and thumbnails.
export function PropertyPhotoStage({ title, photoUrls }: PropertyPhotoStageProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const count = photoUrls.length;

  // Moves the gallery by a step, wrapping around at both ends.
  const step = (delta: number) => setCurrentIdx((prev) => (prev + delta + count) % count);

  return (
    <div className="space-y-3">
      <div className="relative w-full h-[300px] sm:h-[400px] lg:h-[450px] rounded-xl overflow-hidden bg-neutral-100 border border-neutral-200/80">
        <AnimatePresence mode="wait">
          <motion.img
            key={photoUrls[currentIdx]}
            src={photoUrls[currentIdx]}
            alt={`${title} - Foto ${currentIdx + 1} dari ${count}`}
            onError={showPlaceholderOnError}
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: smoothEase }}
            className="w-full h-full object-cover"
          />
        </AnimatePresence>

        <div className="absolute top-3 left-3 bg-neutral-950/75 text-white px-3 py-1 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5">
          <Camera className="w-3.5 h-3.5 text-sage-300" aria-hidden="true" />
          <span>
            Foto {currentIdx + 1} / {count}
          </span>
        </div>

        {count > 1 && (
          <>
            <GalleryArrow side="left" label="Foto sebelumnya" onClick={() => step(-1)} />
            <GalleryArrow side="right" label="Foto berikutnya" onClick={() => step(1)} />
          </>
        )}
      </div>

      {count > 1 && (
        <div className="flex items-center gap-2.5 overflow-x-auto pb-1 pt-0.5">
          {photoUrls.map((url, idx) => (
            <button
              key={`${url}-${idx}`}
              type="button"
              onClick={() => setCurrentIdx(idx)}
              aria-label={`Tampilkan foto ${idx + 1}`}
              aria-current={currentIdx === idx ? "true" : undefined}
              className={`relative w-20 sm:w-24 aspect-[16/10] rounded-lg overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                currentIdx === idx ? "border-sage-600 ring-2 ring-sage-600/20" : "border-neutral-200 opacity-70 hover:opacity-100"
              }`}
            >
              <img src={url} alt="" onError={showPlaceholderOnError} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// GalleryArrow is a round previous/next button overlaid on the photo.
function GalleryArrow({ side, label, onClick }: { side: "left" | "right"; label: string; onClick: () => void }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`absolute ${side === "left" ? "left-3" : "right-3"} top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-neutral-900 shadow-md flex items-center justify-center cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-600`}
    >
      <Icon className="w-5 h-5" aria-hidden="true" />
    </button>
  );
}
