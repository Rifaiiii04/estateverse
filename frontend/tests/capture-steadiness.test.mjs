import assert from "node:assert/strict";
import { test } from "node:test";
import { Euler, Quaternion } from "three";
import { createSpeedTracker } from "../src/lib/capture/steadiness.ts";

const DEG = Math.PI / 180;

// sampleAt builds a sensor sample for an upright phone at a heading and time.
function sampleAt(yaw, pitch, timestamp) {
  return { quaternion: new Quaternion().setFromEuler(new Euler(pitch * DEG, -yaw * DEG, 0, "YXZ")), yaw, pitch, timestamp };
}

test("hand tremor between 60 Hz sensor events does not read as motion", () => {
  const speed = createSpeedTracker();
  let last = 0;
  for (let i = 0; i < 60; i++) last = speed(sampleAt(i % 2 ? 0.15 : -0.15, 0, i * 16));
  assert.ok(last < 3, `tremor read as ${last.toFixed(1)}°/s`);
});

test("a real pan is still measured at its true speed", () => {
  const speed = createSpeedTracker();
  let last = 0;
  for (let i = 0; i < 60; i++) last = speed(sampleAt(i * 16 * 0.02, 0, i * 16));
  assert.ok(Math.abs(last - 20) < 2, `pan read as ${last.toFixed(1)}°/s`);
});
