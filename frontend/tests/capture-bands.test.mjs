import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Quaternion, Euler } from 'three';
import { PanoramaSweep } from '../../shared/panoramaSweep.ts';
import { registrationSample } from '../../shared/panoramaRegistration.ts';

const rad = Math.PI / 180;

// Generates a continuous synthetic spherical scene with detail at every latitude.
function shade(x, y, z) {
  return Math.round(125 + 38 * Math.sin(11 * x + 8 * y - 9 * z) + 28 * Math.cos(20 * y + 13 * z) + 20 * Math.sin(35 * x - 22 * z));
}

// Exposes a portrait rectilinear camera at the supplied pose, with optional sensor error.
function exposure(yaw, pitch, fov, sensorError = 0, scene = shade, width = 96, height = 170) {
  const data = new Uint8ClampedArray(width * height * 4);
  const focal = width / (2 * Math.tan(fov * rad / 2));
  const sy = Math.sin(yaw * rad), cy = Math.cos(yaw * rad);
  const sp = Math.sin(pitch * rad), cp = Math.cos(pitch * rad);
  for (let i = 0; i < width * height; i++) {
    const u = (i % width + .5 - width / 2) / focal;
    const v = (height / 2 - Math.floor(i / width) - .5) / focal;
    const scale = 1 / Math.hypot(u, v, 1);
    const t = v * sp - cp;
    const level = scene((cy * u - sy * t) * scale, (cp * v + sp) * scale, (sy * u + cy * t) * scale);
    data.set([level, level, level, 255], i * 4);
  }
  const q = new Quaternion().setFromEuler(new Euler(pitch * rad, -(yaw + sensorError) * rad, 0, 'YXZ'));
  return { pixels: { width, height, data }, pose: [q.w, q.x, q.y, q.z] };
}

// Compares the stitched JPEG input to the known sphere at the wrap seam, poles and interior.
function checkBand({ meta, pixels }, scene = shade) {
  let totalError = 0, samples = 0;
  for (let y = 0; y < pixels.height; y += 3) {
    const pitch = (meta.max_pitch - (y + .5) / pixels.height * (meta.max_pitch - meta.min_pitch)) * rad;
    for (let x = 0; x < pixels.width; x += 3) {
      const yaw = ((x + .5) / pixels.width * 360 - 180) * rad;
      const expected = scene(Math.cos(pitch) * Math.sin(yaw), Math.sin(pitch), -Math.cos(pitch) * Math.cos(yaw));
      const offset = (y * pixels.width + x) * 4;
      assert.equal(pixels.data[offset + 3], 255);
      totalError += Math.abs(expected - pixels.data[offset]);
      samples++;
    }
  }
  assert.ok(totalError / samples < 7, 'Mean pixel error ' + totalError / samples);
}

// Traces rays to doors, a tiled floor and a plain ceiling in a rectangular room.
function roomShade(x, y, z) {
  const wallDistance = Math.min(2.4 / Math.abs(x), 3 / Math.abs(z));
  const verticalDistance = (y > 0 ? 1.25 : -1.55) / y;
  if (verticalDistance > 0 && verticalDistance < wallDistance) {
    if (y > 0) return 210;
    const tileX = (x * verticalDistance + 4) / .55;
    const tileZ = (z * verticalDistance + 4) / .55;
    return Math.min(tileX % 1, tileZ % 1) < .055 ? 75 : 128 + 10 * ((Math.floor(tileX) + Math.floor(tileZ)) % 2);
  }
  const sideWall = Math.abs(x * wallDistance) > 2.39;
  const across = (sideWall ? z : x) * wallDistance;
  const elevation = y * wallDistance;
  const wall = sideWall ? 174 : 185;
  if (Math.abs(across) < .48 && elevation < .65) {
    return Math.abs(across) > .42 || elevation > .58 ? 45 : 110;
  }
  return elevation < -1.44 ? 90 : wall;
}

test('door frames, floor tiles and a featureless ceiling survive all three turns', () => {
  const sweep = new PanoramaSweep(512);
  for (let band = 0; band < 3; band++) {
    for (let turn = 0; turn <= 372 && !sweep.ready; turn += 4) {
      const yaw = 350 + turn;
      const pitch = sweep.pitch + 1.1 * Math.sin(turn * rad);
      const frame = exposure(yaw, pitch, 54, .4 * Math.sin(yaw * rad), roomShade);
      if (sweep.wants(frame.pose)) assert.equal(sweep.add(frame), '');
    }
    assert.ok(sweep.ready, 'Incomplete room pass ' + band);
    checkBand(sweep.finish(), roomShade);
  }
  assert.ok(sweep.done);
});

for (const [fov, count] of [[54, 3], [36, 5]]) {
  test('one file per complete turn for a ' + fov + ' degree lens', () => {
    const sweep = new PanoramaSweep(360);
    for (let band = 0; band < count; band++) {
      const pitch = sweep.pitch;
      for (let turn = 0; turn <= 372 && !sweep.ready; turn += 4) {
        const yaw = 350 + 17 * band + turn;
        const frame = exposure(yaw, pitch + 1.3 * Math.sin(2 * yaw * rad), fov, .6 * Math.sin(2 * yaw * rad));
        if (sweep.wants(frame.pose)) assert.equal(sweep.add(frame), '');
        if (turn === 120) assert.equal(sweep.ready, false);
      }
      assert.equal(sweep.bands.length, count);
      assert.ok(sweep.ready, 'Band ' + band + ' incomplete at ' + sweep.progress + ' ' + sweep.guide(exposure(0, pitch, fov).pose));
      const strip = sweep.finish();
      assert.equal(strip.meta.index, band);
      checkBand(strip);
    }
    assert.ok(sweep.done);
  });
}

test('a skipped sector, a frozen image and a dark exposure cannot produce a finished strip', () => {
  const sweep = new PanoramaSweep(360);
  const first = exposure(0, 0, 54);
  assert.equal(sweep.add(first), '');
  const frozen = { ...first, pose: exposure(12, 0, 54).pose };
  assert.ok(sweep.add(frozen));
  const dark = exposure(12, 0, 54);
  dark.pixels.data.fill(0);
  assert.ok(sweep.add(dark));
  for (const yaw of [12, 24, 36, 48]) sweep.add(exposure(yaw, 0, 54));
  assert.equal(sweep.wants(exposure(130, 0, 54).pose), false);
  assert.throws(() => sweep.finish());
});

test('fine alternating tiles average to the same luminance at either sampling phase', () => {
  const width = 192, height = 320;
  const data = new Uint8ClampedArray(width * height * 4);
  for (const phase of [0, 1]) {
    for (let i = 0; i < width * height; i++) {
      const value = (i + Math.floor(i / width) + phase) % 2 ? 200 : 40;
      data.set([value, value, value, 255], 4 * i);
    }
    const image = registrationSample({ pose: [1, 0, 0, 0], pixels: { width, height, data } });
    assert.equal(image.pixels.width, 96);
    assert.ok(image.pixels.data.every((channel, i) => channel === (i % 4 === 3 ? 255 : 120)));
  }
});

test('the first exposure appears in the strip before lens measurement finishes', () => {
  const sweep = new PanoramaSweep(360);
  assert.equal(sweep.add(exposure(335, 0, 54)), '');
  assert.equal(sweep.bands.length, 0);
  const { data } = sweep.preview(160);
  assert.ok(data.some((value, i) => i % 4 === 3 && value === 255));
  assert.ok(data.some((value, i) => i % 4 === 3 && value === 0));
  assert.equal(sweep.ready, false);
});

test('camera readbacks larger than the registration thumbnail preserve the optical geometry', () => {
  const sweep = new PanoramaSweep(1024);
  for (let yaw = 0; yaw <= 368 && !sweep.ready; yaw += 8) {
    const frame = exposure(yaw, 0, 54, 0, shade, 224, 392);
    if (sweep.wants(frame.pose)) assert.equal(sweep.add(frame), '');
  }
  assert.equal(sweep.bands.length, 3);
  assert.ok(sweep.ready);
  checkBand(sweep.finish());
});

test('switching to the ceiling cannot stamp a frozen wall frame into the new panorama', () => {
  const sweep = new PanoramaSweep(360);
  let last;
  for (let yaw = 0; yaw <= 372 && !sweep.ready; yaw += 4) {
    const frame = exposure(yaw, 0, 54);
    if (!sweep.wants(frame.pose)) continue;
    assert.equal(sweep.add(frame), '');
    last = frame;
  }
  sweep.finish();
  const ceiling = exposure(0, sweep.pitch, 54);
  assert.match(sweep.add({ pose: ceiling.pose, pixels: last.pixels }), /belum berubah/);
  assert.equal(sweep.preview().data.some((channel, i) => i % 4 === 3 && channel !== 0), false);
  assert.equal(sweep.add(ceiling), '');
});

test('a flat obstruction replacing a textured overlap cannot advance a calibrated pass', () => {
  const sweep = new PanoramaSweep(360);
  for (const yaw of [0, 12, 24]) assert.equal(sweep.add(exposure(yaw, 0, 54)), '');
  const progress = sweep.progress;
  assert.ok(sweep.add(exposure(36, 0, 54, 0, () => 62)));
  assert.equal(sweep.progress, progress);
  assert.equal(sweep.add(exposure(36, 0, 54)), '');
  assert.ok(sweep.progress > progress);
});

test('after starting on a plain wall the user can aim at a distant doorway to calibrate', () => {
  const sweep = new PanoramaSweep(360);
  for (const yaw of [0, 12, 24]) sweep.add(exposure(yaw, 0, 54, 0, () => 150));
  assert.equal(sweep.bands.length, 0);
  for (const yaw of [125, 137, 149]) {
    const doorway = exposure(yaw, 0, 54);
    assert.ok(sweep.wants(doorway.pose), 'The recorder must allow a fresh starting direction');
    assert.equal(sweep.add(doorway), '');
  }
  assert.equal(sweep.bands.length, 3);
  assert.ok(sweep.progress < .1, 'Repositioning the lens must not count toward the panorama');
});
