import assert from "node:assert/strict";
import { test } from "node:test";
import { Euler, Quaternion } from "three";
import { advanceSteady, createSpeedTracker, steadyProgress } from "../src/lib/capture/steadiness.ts";
import { STEADY_HOLD_MS } from "../../shared/capturePolicy.ts";

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

test("a short wobble drains the hold instead of restarting it", () => {
  const input = { targetId: 1, distance: 1, tolerance: 4, speed: 1 };
  let state = null;
  for (let t = 0; t <= 300; t += 20) state = advanceSteady(state, { ...input, now: t });
  const before = state.heldMs;
  state = advanceSteady(state, { ...input, speed: 12, now: 320 });
  assert.ok(state && state.heldMs < before && state.heldMs > 0);
  for (let t = 340; state.heldMs < STEADY_HOLD_MS; t += 20) state = advanceSteady(state, { ...input, now: t });
  assert.equal(steadyProgress(state), 1);
});

test("drifting just past the circle keeps the hold; leaving the point restarts it", () => {
  const start = advanceSteady(null, { targetId: 1, distance: 3, tolerance: 4, speed: 1, now: 0 });
  assert.ok(advanceSteady(null, { targetId: 1, distance: 5, tolerance: 4, speed: 1, now: 0 }) === null);
  const edge = advanceSteady(start, { targetId: 1, distance: 5.5, tolerance: 4, speed: 1, now: 20 });
  assert.ok(edge && edge.heldMs === 20);
  assert.equal(advanceSteady(edge, { targetId: 1, distance: 11, tolerance: 4, speed: 1, now: 40 }), null);
  assert.equal(advanceSteady(edge, { targetId: 2, distance: 1, tolerance: 4, speed: 1, now: 40 }).heldMs, 0);
});
