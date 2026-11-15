import assert from "node:assert/strict";
import { test } from "node:test";
import { Quaternion, Vector3 } from "three";
import { buildCaptureTargets, nextPending, directionFromAngles } from "../src/lib/capture/captureTargets.ts";
import { angularSpeed, forwardAngles, orientationToQuaternion, subscribeOrientation } from "../src/lib/capture/orientation.ts";
import { calibratedTargets } from '../../shared/capturePolicy.ts';

test("both clients start with just three overlapping calibration photographs", () => {
  const targets = buildCaptureTargets();
  assert.deepEqual(targets.map((t) => [t.id,t.yaw,t.pitch,t.ring]), [[0,0,0,'horizon'],[1,20,0,'horizon'],[2,40,0,'horizon']]);
});

test("server plans retain calibration photos and reject missing or invalid targets", () => {
  const targets = [...buildCaptureTargets(), ...Array.from({ length: 5 }, (_,i) => ({id:i+3,yaw:90+i*45,pitch:45,ring:'up'}))];
  assert.equal(calibratedTargets({targets}),targets);
  for (const invalid of [targets.slice(0,3), targets.map((t) => ({...t,id:0})),
    targets.map((t) => ({...t,yaw:NaN})), targets.map((t) => ({...t,pitch:91})),
    targets.map((t) => ({...t,yaw:t.yaw+1}))]) assert.throws(() => calibratedTargets({targets:invalid}));
});

test("aiming at another ring cannot skip the next required photo", () => {
  const targets = buildCaptureTargets();
  const done = new Set([0]);
  assert.equal(nextPending(targets, done, directionFromAngles(40, 0)).target.id, 1);
  done.add(1);
  assert.equal(nextPending(targets, done, directionFromAngles(20, 0)).target.id, 2);
  assert.equal(nextPending(targets, new Set(targets.map((t) => t.id)), new Vector3(0, 0, -1)), null);
});

test("rolling a phone is motion even when the lens points in the same direction", () => {
  const a = { quaternion: new Quaternion(), timestamp: 0 };
  const b = { quaternion: new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), Math.PI / 2), timestamp: 1000 };
  assert.ok(Math.abs(angularSpeed(a, b) - 90) < 1e-8);
  assert.ok(new Vector3(0, 0, -1).applyQuaternion(a.quaternion).distanceTo(new Vector3(0, 0, -1).applyQuaternion(b.quaternion)) < 1e-8);
});

test("upright portrait camera has the same world axes as backend projection", () => {
  const upright = forwardAngles(orientationToQuaternion(0, 90, 0, 0));
  assert.ok(Math.abs(upright.pitch) < 1e-8);
  assert.ok(Math.min(upright.yaw, 360 - upright.yaw) < 1e-8);
  assert.ok(Math.abs(forwardAngles(orientationToQuaternion(0, 135, 0, 0)).pitch - 45) < 1e-8);
});

test("recording starts relative to the first heading and releases its sensor listener", (t) => {
  let handler;
  let removed = false;
  const original = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", { configurable: true, value: {
    addEventListener: (_, callback) => { handler = callback; },
    removeEventListener: (_, callback) => { removed = callback === handler; },
  } });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, "window", original);
    else delete globalThis.window;
  });
  const samples = [];
  const stop = subscribeOrientation((s) => samples.push(s), true);
  handler({ alpha: 123, beta: 90, gamma: 0 });
  handler({ alpha: 93, beta: 90, gamma: 0 });
  assert.ok(Math.min(samples[0].yaw, 360 - samples[0].yaw) < 1e-8);
  assert.ok(Math.abs(samples[1].yaw - 30) < 1e-8);
  stop();
  assert.equal(removed, true);
});
