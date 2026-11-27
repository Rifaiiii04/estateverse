"use client";

import React, { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { SphereGeometry, SRGBColorSpace, Texture } from "three";
import { LookHandle, useLookControls } from "./useLookControls";
import { HotspotButtons, HotspotProjector, type ViewerHotspot } from "./HotspotOverlay";

export type { ViewerHotspot } from "./HotspotOverlay";

const SPHERE_RADIUS = 500;

export interface SphereViewerProps {
  imageUrl: string;
  hotspots?: ViewerHotspot[];
  gyro?: boolean;
  initialYaw?: number;
  onPick?: (yaw: number, pitch: number) => void;
  controlRef?: React.RefObject<LookHandle | null>;
  ariaLabel: string;
  /** Extra scene content in metres around the camera, e.g. measurement overlays. */
  children?: React.ReactNode;
}

// SphereViewerCanvas renders an equirectangular panorama around the camera with look controls and hotspots.
export function SphereViewerCanvas(props: SphereViewerProps) {
  const { imageUrl, hotspots = [], gyro = false, initialYaw = 0, onPick, controlRef, ariaLabel, children } = props;
  const hotspotElements = useRef(new Map<number, HTMLButtonElement>());
  return (
    <div className="relative h-full w-full">
      {/* Loading text sits behind the transparent canvas and is covered once the panorama draws. A drei <Html>
          fallback would unmount mid-render and trip React 19's synchronous-unmount error. */}
      <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center text-xs text-white/80">Memuat panorama…</span>
      <Canvas
        camera={{ fov: 75, near: 0.1, far: 2000, position: [0, 0, 0] }}
        gl={{ antialias: false }}
        tabIndex={0}
        aria-label={ariaLabel}
        className="touch-none cursor-grab active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-500"
      >
        <Suspense fallback={null}>
          <PanoramaSphere url={imageUrl} />
        </Suspense>
        <Controls gyro={gyro} initialYaw={initialYaw} onPick={onPick} controlRef={controlRef} />
        <HotspotProjector hotspots={hotspots} elements={hotspotElements} />
        {children}
      </Canvas>
      <HotspotButtons hotspots={hotspots} elements={hotspotElements} />
    </div>
  );
}

// Controls mounts the look-around behavior inside the R3F scene.
function Controls(props: {
  gyro: boolean;
  initialYaw: number;
  onPick?: (yaw: number, pitch: number) => void;
  controlRef?: React.RefObject<LookHandle | null>;
}) {
  useLookControls(props);
  return null;
}

// PanoramaSphere maps the panorama inside a sphere so image center faces forward (-Z) and longitude grows to the right.
function PanoramaSphere({ url }: { url: string }) {
  const texture = useTexture(url, markSRGB);
  const geometry = useMemo(() => {
    const g = new SphereGeometry(SPHERE_RADIUS, 64, 48);
    g.scale(-1, 1, 1);
    return g;
  }, []);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry} rotation={[0, -Math.PI / 2, 0]}>
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

// markSRGB tags a freshly loaded panorama texture as sRGB so colors render correctly.
function markSRGB(texture: Texture | Texture[]) {
  for (const t of Array.isArray(texture) ? texture : [texture]) t.colorSpace = SRGBColorSpace;
}
