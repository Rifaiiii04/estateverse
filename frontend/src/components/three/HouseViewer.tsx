"use client";

import dynamic from "next/dynamic";
import { Model3DMetadata } from "@/types/property";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

// Dynamic client-side import for WebGL Three.js Canvas to guarantee zero SSR hydration issues.
const DynamicCanvas = dynamic(
  () => import("./HouseCanvas").then((mod) => mod.HouseCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[380px] sm:h-[480px] lg:h-[580px] bg-neutral-100 rounded-2xl flex items-center justify-center border border-neutral-200">
        <LoadingSpinner text="Menyiapkan tampilan rumah 3D..." />
      </div>
    ),
  }
);

interface HouseViewerProps {
  modelUrl?: string;
  metadata?: Model3DMetadata;
}

// HouseViewer renders the interactive 3D property visualization container.
export function HouseViewer({ modelUrl, metadata }: HouseViewerProps) {
  return (
    <div className="w-full">
      <DynamicCanvas modelUrl={modelUrl} metadata={metadata} />
    </div>
  );
}
