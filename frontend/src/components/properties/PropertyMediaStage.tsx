"use client";

import React from "react";
import { motion } from "framer-motion";
import { MediaTab, PropertyImage, Model3DMetadata } from "@/types/property";
import type { TourRoom } from "@/types/tour";
import { getMediaUrl } from "@/lib/api/client";
import { HouseViewer } from "@/components/three/HouseViewer";
import { TourViewer } from "@/components/tour/TourViewer";
import { smoothEase } from "@/components/ui/MotionPrimitives";
import { NO_PHOTO_PLACEHOLDER } from "@/lib/utils/media";
import { PropertyPhotoStage } from "./PropertyPhotoStage";


interface PropertyMediaStageProps {
  title: string;
  images?: PropertyImage[];
  modelUrl?: string;
  metadata?: Model3DMetadata;
  tourRooms: TourRoom[];
  activeTab: MediaTab;
}

// availableMediaTabs lists the media views that actually have content for a listing, 360° tour first.
export function availableMediaTabs(tourRooms: TourRoom[], modelUrl?: string): MediaTab[] {
  const tabs: MediaTab[] = [];
  if (tourRooms.length > 0) tabs.push("tour");
  tabs.push("photos");
  if (modelUrl) tabs.push("3d");
  return tabs;
}

// PropertyMediaStage shows the selected media view: the 360° room tour, the photo gallery, or the 3D model.
export function PropertyMediaStage({ title, images = [], modelUrl, metadata, tourRooms, activeTab }: PropertyMediaStageProps) {
  const photoUrls = images.length > 0 ? images.map((img) => getMediaUrl(img.file_path)) : [NO_PHOTO_PLACEHOLDER];

  return (
    <motion.div
      key={activeTab}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: smoothEase }}
      className="bg-white rounded-2xl border border-neutral-200/90 p-3 sm:p-4 shadow-2xs space-y-3"
    >
      {activeTab === "tour" && tourRooms.length > 0 && (
        <>
          <TourViewer rooms={tourRooms} propertyTitle={title} />
          <p className="text-xs text-neutral-600 px-1">
            Geser untuk melihat sekeliling, ketuk panah untuk pindah ruangan, atau aktifkan &quot;Gerakkan HP&quot;.
            Walk Inside 360° direkam langsung oleh penjual dari HP.
          </p>
        </>
      )}
      {activeTab === "3d" && modelUrl && <HouseViewer modelUrl={modelUrl} metadata={metadata} />}
      {(activeTab === "photos" || (activeTab === "tour" && tourRooms.length === 0) || (activeTab === "3d" && !modelUrl)) && (
        <PropertyPhotoStage title={title} photoUrls={photoUrls} />
      )}
    </motion.div>
  );
}
