import { Vector3 } from "three";
const DEG = Math.PI / 180;

// directionFromAngles converts yaw/pitch (degrees) into a unit world direction (X right, Y up, -Z forward).
export function directionFromAngles(yaw: number, pitch: number): Vector3 {
  const y = yaw * DEG;
  const p = pitch * DEG;
  return new Vector3(Math.cos(p) * Math.sin(y), Math.sin(p), -Math.cos(p) * Math.cos(y));
}
