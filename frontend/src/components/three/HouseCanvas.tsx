"use client";

import React, { Suspense, useRef, useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { MousePointer } from "lucide-react";
import { Model3DMetadata } from "@/types/property";
import { ModelLoader } from "./ModelLoader";
import { FirstPersonControls } from "./FirstPersonControls";
import { ViewerControls, ViewMode } from "./ViewerControls";

interface HouseCanvasProps {
  modelUrl?: string;
  metadata?: Model3DMetadata;
}

// SceneLoadingFallback displays a subtle architectural wireframe placeholder during model streaming.
function SceneLoadingFallback() {
  return (
    <mesh position={[0, 1.2, 0]}>
      <boxGeometry args={[4, 2.2, 4]} />
      <meshStandardMaterial color="#d4d4d4" wireframe />
    </mesh>
  );
}

// HouseCanvas sets up WebGL context, camera controls, fullscreen support, and minimal HUD.
export function HouseCanvas({ modelUrl, metadata }: HouseCanvasProps) {
  const [mode, setMode] = useState<ViewMode>("explore");
  const [roofOff, setRoofOff] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const orbitRef = useRef<OrbitControlsImpl>(null);

  // Resets orbit camera angles to optimal exterior isometric perspective.
  const resetCamera = () => {
    if (orbitRef.current) {
      orbitRef.current.reset();
      orbitRef.current.object.position.set(12, 10, 14);
      orbitRef.current.target.set(0, 1.5, 0);
    }
  };

  // Toggles browser fullscreen mode for focused spatial inspection.
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  useEffect(() => {
    // Synchronizes fullscreen state when user escapes via Esc key or system gesture.
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative w-full rounded-2xl overflow-hidden border border-neutral-200/90 bg-[#f2f5f3] shadow-inner transition-all ${
        isFullscreen ? "h-screen rounded-none border-0" : "h-[380px] sm:h-[480px] lg:h-[580px]"
      }`}
    >
      <ViewerControls
        mode={mode}
        onModeChange={(m) => setMode(m)}
        roofOff={roofOff}
        onToggleRoof={() => setRoofOff((prev) => !prev)}
        onResetCamera={resetCamera}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
      />

      <Canvas
        shadows
        camera={{ position: [12, 10, 14], fov: 45 }}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      >
        <ambientLight intensity={0.8} />
        <hemisphereLight groundColor="#737373" color="#ffffff" intensity={0.7} />
        <directionalLight
          position={[12, 18, 10]}
          intensity={1.4}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <directionalLight position={[-12, 9, -10]} intensity={0.35} color="#f5f5f5" />
        <pointLight position={[0, 3, 0]} intensity={0.25} color="#ffffff" />

        <Suspense fallback={<SceneLoadingFallback />}>
          <ModelLoader modelUrl={modelUrl} roofOff={roofOff} metadata={metadata} />
        </Suspense>

        {mode === "explore" ? (
          <OrbitControls
            ref={orbitRef}
            makeDefault
            maxPolarAngle={Math.PI / 2.05}
            minDistance={3.5}
            maxDistance={35}
            target={[0, 1.5, 0]}
          />
        ) : (
          <FirstPersonControls metadata={metadata} />
        )}
      </Canvas>

      {/* Floating Minimal Spatial Guide */}
      <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 max-w-[92%] bg-white/95 backdrop-blur-md px-3.5 sm:px-4 py-1.5 rounded-full text-xs text-neutral-800 flex items-center gap-2 pointer-events-none border border-neutral-200/90 shadow-md">
        <MousePointer className="w-3.5 h-3.5 text-sage-600 shrink-0" />
        <span className="text-[10px] sm:text-[11px] font-medium tracking-wide truncate">
          {mode === "explore"
            ? "Klik & tahan untuk memutar • Scroll untuk memperbesar"
            : "Gunakan tombol W/A/S/D untuk berjalan • Geser mouse untuk melihat sekitar"}
        </span>
        <span className="w-1.5 h-1.5 rounded-full bg-sage-600 animate-pulse ml-0.5 shrink-0" />
      </div>
    </div>
  );
}
