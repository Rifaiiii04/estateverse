import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SweepMotion } from '../src/lib/capture/sweepMotion.ts';

// Creates a portrait-camera sample moving clockwise through the horizon band.
function reading(yaw, timestamp) {
  const half = yaw * Math.PI / 360;
  return { quaternion: [Math.cos(half), 0, -Math.sin(half), 0], orientation: 0, timestamp };
}

test('a continuous ten-degree-per-second sweep takes a frame without a stationary hold', () => {
  const motion = new SweepMotion();
  for (let time = 0; time <= 200; time += 25) motion.observe(reading(18 + time / 100, time));
  assert.ok(Math.abs(motion.speed - 10) < 0.01);
  assert.ok(motion.canExpose());
  motion.beginShutter(motion.latest);
  for (let time = 225; time <= 550; time += 25) motion.observe(reading(18 + time / 100, time));
  const pose = motion.finishShutter(550);
  assert.ok(pose.every((value, i) => Math.abs(value - reading(21.75, 0).quaternion[i]) < 1e-8));
});

test('fast turns slow acquisition while a fresh slow turn allows any heading', () => {
  const motion = new SweepMotion();
  for (let time = 0; time <= 200; time += 25) motion.observe(reading(12 + time / 25, time));
  assert.equal(motion.canExpose(), false);
  for (let time = 250; time <= 650; time += 25) motion.observe(reading(30, time));
  assert.equal(motion.canExpose(), true);
});

test('a shutter that drifts away and comes back still rejects the photograph', () => {
  const motion = new SweepMotion();
  motion.observe(reading(20, 0));
  motion.beginShutter(motion.latest);
  motion.observe(reading(24, 80));
  motion.observe(reading(20, 160));
  assert.throws(() => motion.finishShutter(170), /Perlambat/);
});

test('a sensor freeze or a gap during exposure cannot advance the strip', () => {
  const motion = new SweepMotion();
  motion.observe(reading(20, 0));
  motion.beginShutter(motion.latest);
  assert.throws(() => motion.finishShutter(350), /Perlambat/);
  motion.beginShutter(motion.latest);
  motion.observe(reading(20, 400));
  assert.throws(() => motion.finishShutter(410), /Perlambat/);
  assert.equal(motion.canExpose(), false);
});
