import React from "react";
import { distanceBetween, formatMeters, FloorXZ } from "@/lib/measure/roomGeometry";

const VIEW = 200;
const PAD = 28;

interface FloorPlanSketchProps {
  points: FloorXZ[];
  title: string;
  className?: string;
}

// FloorPlanSketch draws a top-down sketch of a traced room with wall lengths and the recording spot.
export function FloorPlanSketch({ points, title, className = "" }: FloorPlanSketchProps) {
  if (points.length < 3) return null;
  const { toSvg } = fitToView(points);
  const svgPoints = points.map(toSvg);
  const camera = toSvg({ x: 0, z: 0 });
  return (
    <svg viewBox={`0 0 ${VIEW} ${VIEW}`} role="img" aria-label={title} className={className}>
      <polygon points={svgPoints.map((p) => `${p.x},${p.y}`).join(" ")} className="fill-sage-100 stroke-sage-600" strokeWidth={2} />
      {points.map((p, i) => {
        const q = points[(i + 1) % points.length];
        const a = svgPoints[i];
        const b = svgPoints[(i + 1) % points.length];
        return (
          <text key={i} x={(a.x + b.x) / 2} y={(a.y + b.y) / 2} textAnchor="middle" dominantBaseline="middle"
            className="fill-neutral-800 text-[9px] font-semibold" paintOrder="stroke" stroke="white" strokeWidth={3}>
            {formatMeters(distanceBetween(p, q))}
          </text>
        );
      })}
      <circle cx={camera.x} cy={camera.y} r={3.5} className="fill-neutral-900" />
    </svg>
  );
}

// fitToView scales and centres floor points (metres) into the square SVG, keeping forward (-Z) at the top.
function fitToView(points: FloorXZ[]) {
  const xs = points.map((p) => p.x);
  const zs = points.map((p) => p.z);
  const minX = Math.min(...xs, 0);
  const maxX = Math.max(...xs, 0);
  const minZ = Math.min(...zs, 0);
  const maxZ = Math.max(...zs, 0);
  const scale = (VIEW - 2 * PAD) / Math.max(maxX - minX, maxZ - minZ, 0.5);
  const offsetX = (VIEW - (maxX - minX) * scale) / 2;
  const offsetY = (VIEW - (maxZ - minZ) * scale) / 2;
  return {
    toSvg: (p: FloorXZ) => ({ x: offsetX + (p.x - minX) * scale, y: offsetY + (p.z - minZ) * scale }),
  };
}
