"use client";

import React, { useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import { ArrowUpCircle } from "lucide-react";
import { directionFromAngles } from "@/lib/capture/captureTargets";

const HOTSPOT_DISTANCE = 300;

/** A "go to room" marker placed at a direction inside the panorama. */
export interface ViewerHotspot {
  id: number;
  yaw: number;
  pitch: number;
  label: string;
  onSelect: () => void;
}

/** DOM buttons keyed by hotspot id, positioned every frame by HotspotProjector. */
export type HotspotElements = React.RefObject<Map<number, HTMLButtonElement>>;

// HotspotButtons renders the hotspot buttons as plain DOM above the canvas. Unlike drei <Html>, it creates no
// separate React root, so switching rooms cannot trigger a removeChild error while the canvas unmounts.
export function HotspotButtons({ hotspots, elements }: { hotspots: ViewerHotspot[]; elements: HotspotElements }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      {hotspots.map((h) => (
        <button
          key={h.id}
          ref={(el) => {
            if (el) elements.current.set(h.id, el);
            else elements.current.delete(h.id);
          }}
          type="button"
          onClick={h.onSelect}
          style={{ visibility: "hidden" }}
          className="pointer-events-auto absolute left-0 top-0 flex flex-col items-center gap-1 text-white drop-shadow-lg cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-xl"
          aria-label={`Pindah ke ${h.label}`}
        >
          <ArrowUpCircle className="w-10 h-10 fill-black/40" aria-hidden="true" />
          <span className="text-xs font-bold bg-black/60 rounded-lg px-2 py-1 whitespace-nowrap">{h.label}</span>
        </button>
      ))}
    </div>
  );
}

// HotspotProjector moves each hotspot button to its on-screen position and hides markers behind the camera.
export function HotspotProjector({ hotspots, elements }: { hotspots: ViewerHotspot[]; elements: HotspotElements }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const points = useMemo(
    () => hotspots.map((h) => ({ id: h.id, world: directionFromAngles(h.yaw, h.pitch).multiplyScalar(HOTSPOT_DISTANCE) })),
    [hotspots]
  );
  const forward = useMemo(() => new Vector3(), []);
  const projected = useMemo(() => new Vector3(), []);

  useFrame(() => {
    camera.getWorldDirection(forward);
    for (const { id, world } of points) {
      const el = elements.current.get(id);
      if (!el) continue;
      const inFront = world.dot(forward) > 0;
      projected.copy(world).project(camera);
      el.style.visibility = inFront ? "visible" : "hidden";
      if (!inFront) continue;
      const x = ((projected.x + 1) / 2) * size.width;
      const y = ((1 - projected.y) / 2) * size.height;
      el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
    }
  });
  return null;
}
