import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calibratedHeightCm,
  distanceBetween,
  floorPointAt,
  heightAboveFloor,
  summarizeRoom,
} from "../src/lib/measure/roomGeometry.ts";

const DEG = Math.PI / 180;

// anglesTo returns the yaw/pitch at which a camera `h` metres high sees the floor point (x, z).
function anglesTo(x, z, h) {
  return { yaw: Math.atan2(x, -z) / DEG, pitch: -Math.atan2(h, Math.hypot(x, z)) / DEG };
}

// near compares two lengths in metres to the millimetre.
function near(actual, expected, tolerance = 0.001) {
  assert.ok(Math.abs(actual - expected) < tolerance, `${actual} is not close to ${expected}`);
}

test("a floor point straight ahead at 45 degrees down lies one camera height away", () => {
  const p = floorPointAt({ yaw: 0, pitch: -45 }, 1.5);
  near(p.x, 0);
  near(p.z, -1.5);
});

test("directions on walls or the ceiling are not floor points", () => {
  assert.equal(floorPointAt({ yaw: 10, pitch: 0 }, 1.5), null);
  assert.equal(floorPointAt({ yaw: 10, pitch: 30 }, 1.5), null);
});

test("distance between two picked floor points matches the real distance", () => {
  const h = 1.45;
  const a = floorPointAt(anglesTo(-1.2, -2.0, h), h);
  const b = floorPointAt(anglesTo(1.8, -2.0, h), h);
  near(distanceBetween(a, b), 3.0);
});

test("a 3 x 4 m room traced from its corners has 12 m2 and the right sides", () => {
  const h = 1.5;
  const corners = [[-1, -1.5], [2, -1.5], [2, 2.5], [-1, 2.5]].map(([x, z]) => anglesTo(x, z, h));
  const room = summarizeRoom(corners, 150);
  near(room.areaM2, 12);
  near(room.sides[0], 3);
  near(room.sides[1], 4);
});

test("door top height is measured from its floor point", () => {
  const h = 1.5;
  const base = floorPointAt(anglesTo(0, -2.5, h), h);
  const top = { yaw: 0, pitch: Math.atan2(2.1 - h, 2.5) / DEG };
  near(heightAboveFloor(base, top, h), 2.1);
});

test("calibration rescales camera height so a known length matches", () => {
  // Seller typed 150 cm, a 0.80 m door measured 0.75 m, so the phone was really higher.
  assert.equal(calibratedHeightCm(150, 0.75, 0.8), 160);
  assert.equal(calibratedHeightCm(150, 0, 0.8), 150);
});
