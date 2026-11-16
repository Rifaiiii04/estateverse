// Turns directions picked in a gravity-aligned 360° panorama into floor measurements in metres.
// The camera sits at the origin, X points right, Y up, and -Z forward (same convention as the tour viewer).
// A floor point seen at pitch p (below the horizon) lies at horizontal distance h / tan(-p), where h is the
// camera height. Every result therefore scales linearly with h, which is why it can be calibrated.

/** A direction in the panorama, as yaw/pitch degrees seen from the camera. */
export interface ViewAngles {
  yaw: number;
  pitch: number;
}

/** A point on the floor plane, in metres from the spot where the panorama was recorded. */
export interface FloorXZ {
  x: number;
  z: number;
}

/** Area and wall lengths of a traced room outline. */
export interface RoomSummary {
  areaM2: number;
  walls: number[];
  /** Average of opposite walls for four-corner rooms, e.g. 3.1 x 4.0 m; null for other shapes. */
  sides: [number, number] | null;
}

const DEG = Math.PI / 180;
/** Points this close to the horizon project absurdly far away, so they are rejected (matches the backend). */
export const MAX_FLOOR_PITCH_DEG = -2;
export const DEFAULT_CAMERA_HEIGHT_CM = 150;

// cameraHeightMeters converts a stored height to metres, falling back to a typical eye height when unknown.
export function cameraHeightMeters(cm: number | undefined): number {
  return cm && cm > 0 ? cm / 100 : DEFAULT_CAMERA_HEIGHT_CM / 100;
}

// floorPointAt projects a direction onto the floor below the camera; null when the direction is not on the floor.
export function floorPointAt({ yaw, pitch }: ViewAngles, heightM: number): FloorXZ | null {
  if (!Number.isFinite(yaw) || !Number.isFinite(pitch) || pitch > MAX_FLOOR_PITCH_DEG) return null;
  const horizontal = heightM / Math.tan(-pitch * DEG);
  return { x: horizontal * Math.sin(yaw * DEG), z: -horizontal * Math.cos(yaw * DEG) };
}

// distanceBetween returns the straight floor distance between two floor points.
export function distanceBetween(a: FloorXZ, b: FloorXZ): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

// heightAboveFloor measures how high a point is when it sits straight above a known floor point (e.g. a door top).
export function heightAboveFloor(base: FloorXZ, top: ViewAngles, heightM: number): number {
  return heightM + Math.hypot(base.x, base.z) * Math.tan(top.pitch * DEG);
}

// outlineToFloor projects traced corners onto the floor, dropping any that are not on the floor.
export function outlineToFloor(outline: ViewAngles[], heightM: number): FloorXZ[] {
  return outline.map((p) => floorPointAt(p, heightM)).filter((p): p is FloorXZ => p !== null);
}

// polygonArea computes a closed outline's area with the shoelace formula.
export function polygonArea(points: FloorXZ[]): number {
  let twice = 0;
  points.forEach((p, i) => {
    const q = points[(i + 1) % points.length];
    twice += p.x * q.z - q.x * p.z;
  });
  return Math.abs(twice) / 2;
}

// wallLengths lists each edge of a closed outline, including the edge back to the first corner.
export function wallLengths(points: FloorXZ[]): number[] {
  return points.map((p, i) => distanceBetween(p, points[(i + 1) % points.length]));
}

// summarizeRoom returns area and walls of a traced outline, or null when fewer than three corners are on the floor.
export function summarizeRoom(outline: ViewAngles[], heightCm: number | undefined): RoomSummary | null {
  const floor = outlineToFloor(outline, cameraHeightMeters(heightCm));
  if (floor.length < 3) return null;
  const walls = wallLengths(floor);
  const sides: [number, number] | null = walls.length === 4 ? [(walls[0] + walls[2]) / 2, (walls[1] + walls[3]) / 2] : null;
  return { areaM2: polygonArea(floor), walls, sides };
}

// calibratedHeightCm rescales the camera height so a length measured in the panorama matches its real length.
export function calibratedHeightCm(currentCm: number, measuredM: number, realM: number): number {
  if (measuredM <= 0 || realM <= 0) return currentCm;
  return Math.round(cameraHeightMeters(currentCm) * (realM / measuredM) * 100);
}

// formatMeters renders a length the Indonesian way, e.g. "3,25 m".
export function formatMeters(m: number): string {
  return `${m.toFixed(2).replace(".", ",")} m`;
}

// formatArea renders an area the Indonesian way, e.g. "12,4 m²".
export function formatArea(m2: number): string {
  return `${m2.toFixed(1).replace(".", ",")} m²`;
}
