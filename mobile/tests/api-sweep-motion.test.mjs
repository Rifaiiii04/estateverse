import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SweepMotion } from '../src/lib/capture/sweepMotion.ts';
import { sweepGuidance } from '../src/lib/capture/sweepGuidance.ts';

const target = { id: 1, yaw: 20, pitch: 0, ring: 'horizon' };

// Creates a portrait-camera sample moving clockwise through the horizon band.
function reading(yaw, timestamp) {
  const half = yaw * Math.PI / 360;
  return { quaternion: [Math.cos(half), 0, -Math.sin(half), 0], orientation: 0, timestamp };
}

test('a continuous ten-degree-per-second sweep takes a frame without a stationary hold', () => {
  const motion = new SweepMotion();
  for (let time = 0; time <= 200; time += 25) motion.observe(reading(18 + time / 100, time));
  assert.ok(Math.abs(motion.speed - 10) < 0.01);
  assert.ok(motion.canExpose(target));
  motion.beginShutter(motion.latest);
  motion.observe(reading(21, 300));
  assert.doesNotThrow(() => motion.finishShutter(310));
});

test('fast turns and a missed portion cannot advance coverage', () => {
  const motion = new SweepMotion();
  for (let time = 0; time <= 200; time += 25) motion.observe(reading(12 + time / 25, time));
  assert.equal(motion.canExpose(target), false);
  for (let time = 250; time <= 650; time += 25) motion.observe(reading(30, time));
  assert.equal(motion.canExpose(target), false);
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
  assert.equal(motion.canExpose(target), false);
});

test('guidance corrects a four-degree pitch miss and gives a level cue at the pole', () => {
  const low = -2 * Math.PI / 180;
  const level = { ...target, yaw: 0 };
  assert.equal(sweepGuidance([Math.cos(low), Math.sin(low), 0, 0], level, 0, true).arrow, '↑');
  const pole = { ...target, yaw: 90, pitch: 90, ring: 'ceiling' };
  assert.match(sweepGuidance([Math.SQRT1_2, Math.SQRT1_2, 0, 0], pole, 0, true).arrow, /[↶↷]/);
});
