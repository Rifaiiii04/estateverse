"use client";

import { useCallback, useState } from "react";
import { distanceBetween, floorPointAt, FloorXZ, heightAboveFloor, ViewAngles } from "@/lib/measure/roomGeometry";
import { FURNITURE_PRESETS, FurniturePreset, presetById } from "./furniturePresets";

export type MeasureMode = "distance" | "height" | "furniture";

export interface PlacedFurniture {
  id: number;
  preset: FurniturePreset;
  at: FloorXZ;
  rotationDeg: number;
}

export interface MeasureState {
  mode: MeasureMode;
  /** Distance mode: up to two floor points. Height mode: the floor point under the object. */
  points: FloorXZ[];
  /** Height mode: measured height above the floor, once the top was tapped. */
  heightM: number | null;
  furniture: PlacedFurniture[];
  presetId: string;
  hint: string;
}

const MAX_FURNITURE = 4;
const OFF_FLOOR_HINT = "Ketuk titik di lantai (di bawah garis cakrawala).";
const MODE_HINTS: Record<MeasureMode, string> = {
  distance: "Ketuk dua titik di lantai untuk mengukur jaraknya.",
  height: "Ketuk lantai tepat di bawah benda (mis. kaki pintu), lalu ketuk ujung atasnya.",
  furniture: "Pilih furnitur lalu ketuk lantai untuk menaruhnya.",
};

// initialState returns a fresh tool state for one mode, keeping placed furniture and the chosen preset.
function initialState(mode: MeasureMode, keep?: MeasureState): MeasureState {
  return {
    mode,
    points: [],
    heightM: null,
    furniture: keep?.furniture ?? [],
    presetId: keep?.presetId ?? FURNITURE_PRESETS[0].id,
    hint: MODE_HINTS[mode],
  };
}

// useMeasureTool holds the buyer's measuring session for one room viewed from a camera `cameraHeightM` above the floor.
export function useMeasureTool(cameraHeightM: number) {
  const [state, setState] = useState<MeasureState>(() => initialState("distance"));

  // Applies one tap in the panorama to the active measuring mode.
  const pick = useCallback(
    (yaw: number, pitch: number) => setState((s) => applyPick(s, { yaw, pitch }, cameraHeightM)),
    [cameraHeightM]
  );
  // Switches mode and clears unfinished measurements.
  const setMode = useCallback((mode: MeasureMode) => setState((s) => initialState(mode, s)), []);
  // Chooses which furniture the next tap places.
  const setPreset = useCallback((presetId: string) => setState((s) => ({ ...s, presetId })), []);
  // Turns the most recently placed furniture by 90 degrees.
  const rotateLast = useCallback(() => setState((s) => ({ ...s, furniture: rotateLastItem(s.furniture) })), []);
  // Removes measurements and furniture from the current room.
  const clear = useCallback(() => setState((s) => ({ ...initialState(s.mode), presetId: s.presetId })), []);

  return { state, pick, setMode, setPreset, rotateLast, clear };
}

// applyPick turns a tapped direction into the next measuring step, explaining when the tap missed the floor.
function applyPick(s: MeasureState, angles: ViewAngles, cameraHeightM: number): MeasureState {
  if (s.mode === "height" && s.points.length === 1 && s.heightM === null) {
    return { ...s, heightM: heightAboveFloor(s.points[0], angles, cameraHeightM), hint: "Ketuk lantai lagi untuk mengukur benda lain." };
  }
  const floor = floorPointAt(angles, cameraHeightM);
  if (!floor) return { ...s, hint: OFF_FLOOR_HINT };
  if (s.mode === "height") {
    return { ...s, points: [floor], heightM: null, hint: "Sekarang ketuk ujung atas benda tepat di atas titik itu." };
  }
  if (s.mode === "distance") {
    const points = s.points.length >= 2 ? [floor] : [...s.points, floor];
    return { ...s, points, hint: points.length === 1 ? "Ketuk titik kedua di lantai." : "Ketuk lagi untuk mengukur ulang." };
  }
  const item: PlacedFurniture = { id: Date.now(), preset: presetById(s.presetId), at: floor, rotationDeg: -angles.yaw };
  return { ...s, furniture: [...s.furniture, item].slice(-MAX_FURNITURE), hint: "Ketuk lantai lagi untuk menambah, atau putar furnitur." };
}

// rotateLastItem turns the newest furniture item by a quarter turn.
function rotateLastItem(items: PlacedFurniture[]): PlacedFurniture[] {
  if (items.length === 0) return items;
  const last = items[items.length - 1];
  return [...items.slice(0, -1), { ...last, rotationDeg: last.rotationDeg + 90 }];
}

// measuredDistance returns the distance between the two picked floor points, if both exist.
export function measuredDistance(state: MeasureState): number | null {
  return state.mode === "distance" && state.points.length === 2 ? distanceBetween(state.points[0], state.points[1]) : null;
}
