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

test("hints point to the next photo instead of asking the user to search", () => {
  assert.match(guideHint(plan, plan[1], poseFacing(0, 0), 0), /kanan/);
  assert.match(guideHint(plan, plan[1], poseFacing(40, 0), 0), /kiri/);
  assert.match(guideHint(plan, plan[1], poseFacing(20, 0), 0), /Tahan/);
  assert.match(guideHint(plan, plan[1], poseFacing(20, 0), 20), /Terlalu cepat/);
});

test("entering a new ring asks for a pure tilt before any turning", () => {
  assert.match(guideHint(plan, plan[4], poseFacing(80, 0), 0), /Dongakkan HP ke atas tanpa memutar badan/);
  assert.match(guideHint(plan, plan[6], poseFacing(140, 55), 0), /tundukkan HP ke bawah/);
  assert.match(guideHint(plan, plan[4], poseFacing(80, 50), 0), /Naikkan/);
});
