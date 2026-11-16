"use client";

import React, { Suspense, useEffect, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { Html, useTexture } from "@react-three/drei";
import { SphereGeometry, SRGBColorSpace, Texture } from "three";
import { ArrowUpCircle } from "lucide-react";
import { directionFromAngles } from "@/lib/capture/captureTargets";
import { LookHandle, useLookControls } from "./useLookControls";

const SPHERE_RADIUS = 500;
const HOTSPOT_DISTANCE = 300;

export interface ViewerHotspot {
  id: number;
  yaw: number;
  pitch: number;
  label: string;
  onSelect: () => void;
}

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
  return (
    <Canvas
      camera={{ fov: 75, near: 0.1, far: 2000, position: [0, 0, 0] }}
      gl={{ antialias: false }}
      tabIndex={0}
      aria-label={ariaLabel}
      className="touch-none cursor-grab active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-500"
    >
      <Suspense fallback={<Html center><span className="text-xs text-white">Memuat panorama…</span></Html>}>
        <PanoramaSphere url={imageUrl} />
      </Suspense>
      <Controls gyro={gyro} initialYaw={initialYaw} onPick={onPick} controlRef={controlRef} />
      {hotspots.map((h) => (
        <HotspotMarker key={h.id} hotspot={h} />
      ))}
      {children}
    </Canvas>
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

// HotspotMarker places a clickable "go to room" button at a direction inside the panorama.
function HotspotMarker({ hotspot }: { hotspot: ViewerHotspot }) {
  const position = directionFromAngles(hotspot.yaw, hotspot.pitch).multiplyScalar(HOTSPOT_DISTANCE);
  return (
    <Html position={position.toArray()} center zIndexRange={[20, 0]}>
      <button
        type="button"
        onClick={hotspot.onSelect}
        className="flex flex-col items-center gap-1 text-white drop-shadow-lg cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-xl"
        aria-label={`Pindah ke ${hotspot.label}`}
      >
        <ArrowUpCircle className="w-10 h-10 fill-black/40" aria-hidden="true" />
        <span className="text-xs font-bold bg-black/60 rounded-lg px-2 py-1 whitespace-nowrap">{hotspot.label}</span>
      </button>
    </Html>
  );
}
