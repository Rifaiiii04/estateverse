"use client";

/* eslint-disable @next/next/no-img-element */
import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Box, Camera, ChevronLeft, ChevronRight, CloudDownload, X } from "lucide-react";
import { PropertyImage, Model3DMetadata } from "@/types/property";
import { getMediaUrl } from "@/lib/api/client";
import { HouseViewer } from "@/components/three/HouseViewer";
import { smoothEase } from "@/components/ui/MotionPrimitives";

const FALLBACK_PHOTO =
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=85";

interface PropertyMediaStageProps {
  title: string;
  images?: PropertyImage[];
  modelUrl?: string;
  metadata?: Model3DMetadata;
  activeTab: "photos" | "3d";
  onSwitchTab: (tab: "photos" | "3d") => void;
}

// PropertyMediaStage displays the animated default multi-photo gallery and streams the 3D model on-demand.
export function PropertyMediaStage({
  title,
  images = [],
  modelUrl,
  metadata,
  activeTab,
  onSwitchTab,
}: PropertyMediaStageProps) {
  const photoUrls =
    images.length > 0 ? images.map((img) => getMediaUrl(img.file_path)) : [FALLBACK_PHOTO];

  const [currentIdx, setCurrentIdx] = useState(0);
  const [is3DStreamReady, setIs3DStreamReady] = useState(false);
  const [streamProgress, setStreamProgress] = useState(0);

  // Streams the 3D model into temporary session state only when the user explicitly opens the 3D tab.
  useEffect(() => {
    if (activeTab !== "3d" || is3DStreamReady) {
      return;
    }

    setStreamProgress(20);
    const t1 = setTimeout(() => setStreamProgress(65), 250);
    const t2 = setTimeout(() => setStreamProgress(95), 520);
    const t3 = setTimeout(() => {
      setStreamProgress(100);
      setIs3DStreamReady(true);
    }, 750);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [activeTab, is3DStreamReady]);

  // Releases the temporary 3D WebGL session from memory and returns to the photo gallery.
  const closeTemporary3DSession = () => {
    setIs3DStreamReady(false);
    setStreamProgress(0);
    onSwitchTab("photos");
  };

  const prevPhoto = () => {
    setCurrentIdx((prev) => (prev === 0 ? photoUrls.length - 1 : prev - 1));
  };

  const nextPhoto = () => {
    setCurrentIdx((prev) => (prev === photoUrls.length - 1 ? 0 : prev + 1));
  };

  if (activeTab === "3d") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: smoothEase }}
        className="bg-white rounded-2xl border border-neutral-200/90 p-3 sm:p-4 shadow-2xs space-y-3"
      >
        {/* Live Temporary Cloud 3D Status Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sage-600 animate-pulse" />
            <span className="text-xs font-bold text-neutral-900">
              Tampilan Rumah 3D Interaktif
            </span>
            <span className="hidden sm:inline text-[11px] text-neutral-400">
              &bull; Dibuka langsung di layar tanpa memenuhi memori perangkat Anda
            </span>
          </div>

          <button
            type="button"
            onClick={closeTemporary3DSession}
            className="h-7 px-2.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[11px] font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            <X className="w-3 h-3" />
            <span>Tutup 3D &amp; Kembali ke Foto</span>
          </button>
        </div>

        {!is3DStreamReady ? (
          <div className="w-full h-[340px] sm:h-[430px] lg:h-[470px] rounded-xl bg-neutral-50 border border-neutral-200 flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-sage-100 text-sage-700 flex items-center justify-center shadow-2xs">
              <CloudDownload className="w-6 h-6 text-sage-600 animate-bounce" />
            </div>
            <div className="space-y-1 max-w-md">
              <h4 className="text-sm font-bold text-neutral-950">
                Menyiapkan Tampilan Rumah 3D...
              </h4>
              <p className="text-xs text-neutral-500">
                Memuat tampilan 3D agar siap Anda jelajahi ({streamProgress}%)
              </p>
            </div>
            <div className="w-full max-w-xs h-2 bg-neutral-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-sage-600 transition-all duration-300 rounded-full"
                style={{ width: `${streamProgress}%` }}
              />
            </div>
          </div>
        ) : (
          <HouseViewer modelUrl={modelUrl} metadata={metadata} />
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: smoothEase }}
      className="bg-white rounded-2xl border border-neutral-200/90 p-3 sm:p-4 shadow-2xs space-y-3"
    >
      {/* Main Default Photo Stage with Smooth Crossfade */}
      <div className="relative w-full h-[300px] sm:h-[400px] lg:h-[450px] rounded-xl overflow-hidden bg-neutral-100 border border-neutral-200/80 group">
        <AnimatePresence mode="wait">
          <motion.img
            key={photoUrls[currentIdx]}
            src={photoUrls[currentIdx]}
            alt={`${title} - Foto ${currentIdx + 1}`}
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: smoothEase }}
            className="w-full h-full object-cover"
          />
        </AnimatePresence>

        {/* Top-Left Photo Counter Badge */}
        <div className="absolute top-3 left-3 bg-neutral-950/75 backdrop-blur-md text-white px-3 py-1 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5">
          <Camera className="w-3.5 h-3.5 text-sage-300" />
          <span>
            Foto {currentIdx + 1} / {photoUrls.length}
          </span>
        </div>

        {/* Prev / Next Controls when multiple photos exist */}
        {photoUrls.length > 1 && (
          <>
            <button
              type="button"
              onClick={prevPhoto}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-neutral-900 shadow-md flex items-center justify-center transition-all cursor-pointer"
              aria-label="Foto sebelumnya"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={nextPhoto}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-neutral-900 shadow-md flex items-center justify-center transition-all cursor-pointer"
              aria-label="Foto berikutnya"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Floating On-Demand 3D Launch Button */}
        <motion.button
          type="button"
          whileHover={{ y: -2, scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSwitchTab("3d")}
          className="absolute bottom-3 right-3 h-10 px-4 rounded-xl bg-sage-600/95 hover:bg-sage-700 backdrop-blur-md text-white text-xs font-bold inline-flex items-center gap-2 shadow-lg transition-colors cursor-pointer border border-sage-400/30"
        >
          <Box className="w-4 h-4 text-sage-100" />
          <span>Lihat Preview 3D (Live Cloud)</span>
        </motion.button>
      </div>

      {/* Multi-Photo Thumbnail Strip */}
      {photoUrls.length > 1 && (
        <div className="flex items-center gap-2.5 overflow-x-auto pb-1 pt-0.5">
          {photoUrls.map((url, idx) => (
            <button
              key={`${url}-${idx}`}
              type="button"
              onClick={() => setCurrentIdx(idx)}
              className={`relative w-20 sm:w-24 aspect-[16/10] rounded-lg overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                currentIdx === idx
                  ? "border-sage-600 ring-2 ring-sage-600/20 opacity-100"
                  : "border-neutral-200 opacity-70 hover:opacity-100"
              }`}
            >
              <img
                src={url}
                alt={`Thumbnail ${idx + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}
