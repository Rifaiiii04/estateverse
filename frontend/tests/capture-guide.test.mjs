import assert from "node:assert/strict";
import { test } from "node:test";
import { Euler, Quaternion } from "three";
import { captureStage, guideHint } from "../src/lib/capture/captureGuide.ts";

const DEG = Math.PI / 180;

// poseFacing builds the camera-to-world pose of an upright phone aimed at a yaw/pitch heading.
function poseFacing(yaw, pitch) {
  return new Quaternion().setFromEuler(new Euler(pitch * DEG, -yaw * DEG, 0, "YXZ"));
}

const plan = [
  { id: 0, yaw: 0, pitch: 0, ring: "horizon" },
  { id: 1, yaw: 20, pitch: 0, ring: "horizon" },
  { id: 2, yaw: 40, pitch: 0, ring: "horizon" },
  { id: 3, yaw: 80, pitch: 0, ring: "horizon" },
  { id: 4, yaw: 80, pitch: 55, ring: "up" },
  { id: 5, yaw: 140, pitch: 55, ring: "up" },
  { id: 6, yaw: 140, pitch: -55, ring: "down" },
];

test("stages count one sweep per tilt level along the sequential path", () => {
  assert.deepEqual(captureStage(plan, plan[2]), { index: 0, total: 3, label: "Setinggi mata" });
  assert.deepEqual(captureStage(plan, plan[5]), { index: 1, total: 3, label: "Atas" });
  assert.deepEqual(captureStage(plan, plan[6]), { index: 2, total: 3, label: "Bawah" });
});

// pose wraps a heading into the live pose the hint reads.
function pose(yaw, pitch, speed = 0) {
  return { quaternion: poseFacing(yaw, pitch), speed };
}

test("hints point to the next photo instead of asking the user to search", () => {
  assert.match(guideHint(plan, plan[1], pose(0, 0)), /kanan/);
  assert.match(guideHint(plan, plan[1], pose(40, 0)), /kiri/);
  assert.match(guideHint(plan, plan[1], pose(20, 0, 10)), /otomatis/);
  assert.match(guideHint(plan, plan[1], pose(20, 0, 20)), /Terlalu cepat/);
});

test("guidance corrects sideways roll even when the optical axis follows the sweep", () => {
  const tilted = pose(20, 0);
  tilted.quaternion.multiply(new Quaternion().setFromEuler(new Euler(0, 0, 0.4)));
  assert.match(guideHint(plan, plan[1], tilted), /Luruskan/);
});

test("entering a new ring asks for a pure tilt before any turning", () => {
  assert.match(guideHint(plan, plan[4], pose(80, 0)), /Dongakkan HP ke atas tanpa memutar badan/);
  assert.match(guideHint(plan, plan[6], pose(140, 55)), /tundukkan HP ke bawah/);
  assert.match(guideHint(plan, plan[4], pose(80, 50)), /Naikkan/);
});
