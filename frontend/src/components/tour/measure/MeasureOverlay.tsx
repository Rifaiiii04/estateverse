"use client";

import React, { useMemo } from "react";
import { Edges, Html, Line } from "@react-three/drei";
import { DoubleSide, Shape, Vector2 } from "three";
import { distanceBetween, formatMeters, FloorXZ } from "@/lib/measure/roomGeometry";
import type { MeasureState, PlacedFurniture } from "./useMeasureTool";

const DEG = Math.PI / 180;
const FLOOR_LIFT_M = 0.01; // keeps overlays just above the floor plane so they do not flicker
const ACCENT = "#a2c3b7";

interface MeasureOverlayProps {
  cameraHeightM: number;
  state?: MeasureState;
  /** Seller-traced floor outline, drawn as a translucent room footprint with wall lengths. */
  outline?: FloorXZ[];
}

// MeasureOverlay draws measurements, the room outline, and furniture boxes in true scale inside the panorama scene.
export function MeasureOverlay({ cameraHeightM, state, outline }: MeasureOverlayProps) {
  const floorY = -cameraHeightM;
  return (
    <>
      {outline && outline.length >= 3 && <RoomFootprint points={outline} floorY={floorY} />}
      {state?.points.map((p, i) => <FloorMarker key={i} at={p} floorY={floorY} />)}
      {state?.mode === "distance" && state.points.length === 2 && (
        <FloorSegment a={state.points[0]} b={state.points[1]} floorY={floorY} />
      )}
      {state?.mode === "height" && state.points.length === 1 && state.heightM !== null && (
        <HeightLine base={state.points[0]} floorY={floorY} heightM={state.heightM} />
      )}
      {state?.furniture.map((item) => <FurnitureBox key={item.id} item={item} floorY={floorY} />)}
    </>
  );
}

// RoomFootprint fills the traced floor outline and labels every wall with its length.
function RoomFootprint({ points, floorY }: { points: FloorXZ[]; floorY: number }) {
  const shape = useMemo(() => new Shape(points.map((p) => new Vector2(p.x, -p.z))), [points]);
  const line = [...points, points[0]].map((p) => [p.x, floorY + FLOOR_LIFT_M, p.z] as [number, number, number]);
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, floorY + FLOOR_LIFT_M / 2, 0]}>
        <shapeGeometry args={[shape]} />
        <meshBasicMaterial color={ACCENT} transparent opacity={0.18} side={DoubleSide} depthWrite={false} />
      </mesh>
      <Line points={line} color={ACCENT} lineWidth={3} />
      {points.map((p, i) => {
        const q = points[(i + 1) % points.length];
        return <Label key={i} position={[(p.x + q.x) / 2, floorY + FLOOR_LIFT_M, (p.z + q.z) / 2]} text={formatMeters(distanceBetween(p, q))} />;
      })}
    </>
  );
}

// FloorMarker shows where the buyer tapped on the floor.
function FloorMarker({ at, floorY }: { at: FloorXZ; floorY: number }) {
  return (
    <mesh position={[at.x, floorY + FLOOR_LIFT_M, at.z]}>
      <sphereGeometry args={[0.04, 16, 12]} />
      <meshBasicMaterial color="#ffffff" />
    </mesh>
  );
}

// FloorSegment connects two floor points and labels the distance between them.
function FloorSegment({ a, b, floorY }: { a: FloorXZ; b: FloorXZ; floorY: number }) {
  const y = floorY + FLOOR_LIFT_M;
  return (
    <>
      <Line points={[[a.x, y, a.z], [b.x, y, b.z]]} color="#ffffff" lineWidth={3} />
      <Label position={[(a.x + b.x) / 2, y, (a.z + b.z) / 2]} text={formatMeters(distanceBetween(a, b))} strong />
    </>
  );
}

// HeightLine draws a vertical ruler from a floor point up to the measured height.
function HeightLine({ base, floorY, heightM }: { base: FloorXZ; floorY: number; heightM: number }) {
  return (
    <>
      <Line points={[[base.x, floorY, base.z], [base.x, floorY + heightM, base.z]]} color="#ffffff" lineWidth={3} />
      <Label position={[base.x, floorY + heightM / 2, base.z]} text={formatMeters(heightM)} strong />
    </>
  );
}

// FurnitureBox renders a real-size translucent box standing on the floor where the buyer tapped.
function FurnitureBox({ item, floorY }: { item: PlacedFurniture; floorY: number }) {
  const { widthM, depthM, heightM, label } = item.preset;
  return (
    <group position={[item.at.x, floorY + heightM / 2, item.at.z]} rotation={[0, item.rotationDeg * DEG, 0]}>
      <mesh>
        <boxGeometry args={[widthM, heightM, depthM]} />
        <meshBasicMaterial color={ACCENT} transparent opacity={0.35} depthWrite={false} />
        <Edges color="#ffffff" />
      </mesh>
      <Label position={[0, heightM / 2 + 0.05, 0]} text={label} />
    </group>
  );
}

// Label is a small non-interactive text tag pinned to a 3D position.
function Label({ position, text, strong = false }: { position: [number, number, number]; text: string; strong?: boolean }) {
  return (
    <Html position={position} center zIndexRange={[15, 0]} style={{ pointerEvents: "none" }}>
      <span className={`whitespace-nowrap rounded-md px-1.5 py-0.5 text-white ${strong ? "bg-sage-700 text-sm font-bold" : "bg-black/65 text-[11px] font-semibold"}`}>
        {text}
      </span>
    </Html>
  );
}
