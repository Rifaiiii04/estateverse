"use client";

import dynamic from "next/dynamic";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import type { SphereViewerProps } from "./SphereViewerCanvas";

export type { SphereViewerProps, ViewerHotspot } from "./SphereViewerCanvas";

// SphereViewer lazily loads the WebGL panorama viewer on the client only.
export const SphereViewer = dynamic<SphereViewerProps>(
  () => import("./SphereViewerCanvas").then((mod) => mod.SphereViewerCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-neutral-900 flex items-center justify-center">
        <LoadingSpinner text="Menyiapkan tur 360°..." />
      </div>
    ),
  }
);
