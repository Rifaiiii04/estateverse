import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NativeSweepSession } from '../src/lib/capture/nativeSweepSession.ts';
import { multiplyQuat } from '../../shared/captureMath.ts';
import { rotationMatrix } from '../../shared/sweepImage.ts';

// Builds the camera orientation for a clockwise turn with the phone held upright.
function pose(yaw, pitch) {
  const angle = Math.PI / 360;
  return multiplyQuat([Math.cos(yaw * angle), 0, -Math.sin(yaw * angle), 0],
    [Math.cos(pitch * angle), Math.sin(pitch * angle), 0, 0]);
}

// Generates a textured indoor-scene surrogate for an oriented portrait phone camera.
function view(quaternion) {
  const width = 80, height = 144, data = new Uint8ClampedArray(width * height * 4);
  const focal = width / (2 * Math.tan(26 * Math.PI / 180)), r = rotationMatrix(quaternion);
  for (let i = 0; i < width * height; i++) {
    const u = i % width + 0.5 - width / 2, v = height / 2 - Math.floor(i / width) - 0.5;
    const scale = 1 / Math.hypot(u, v, focal);
    const x = (r[0] * u + r[1] * v - r[2] * focal) * scale;
    const y = (r[3] * u + r[4] * v - r[5] * focal) * scale;
    const z = (r[6] * u + r[7] * v - r[8] * focal) * scale;
    const luma = 120 + 36 * Math.sin(22 * x + 9 * y) + 32 * Math.cos(18 * y - 10 * z) + 24 * Math.sin(16 * z - 7 * x);
    data.set([luma, luma, luma, 255], i * 4);
  }
  return { width, height, data };
}

test('the native recorder collects three finished strips and releases all temporary samples and previews', async t => {
  const files = new Set();
  let sequence = 0, sample, state, current, time = performance.now() + 1000;
  let firstBandFailure = true, encodings = 0, finishEncoding;
  // Allocates a fake local file so the test can observe ownership through collection and cleanup.
  const allocate = () => {
    const uri = `camera-cache/${++sequence}.jpg`;
    files.add(uri);
    return { uri };
  };
  const recorder = new NativeSweepSession({
    listen: async handler => { sample = handler; return () => { sample = null; }; },
    capture: async () => allocate(),
    pixels: async () => view(current),
    encode: async pixels => {
      if (pixels.width === 2048 && firstBandFailure) { firstBandFailure = false; throw new Error('Disk sedang sibuk'); }
      if (pixels.width === 2048 && ++encodings === 1) await new Promise(resolve => { finishEncoding = resolve; });
      return allocate();
    },
    remove: items => items.forEach(item => files.delete(item.uri)),
  }, next => { state = next; });
  t.after(() => recorder.dispose());
  await recorder.start();
  let livePreview = false, initialPreview = false;
  for (let turn = 0; turn < 3; turn++) {
    const tilt = state.pitch;
    for (let degree = 0; degree <= 390 && state.bands.length === turn; degree++) {
      current = pose(degree, tilt);
      sample({ quaternion: current, timestamp: time += 110, orientation: 0 });
      await new Promise(resolve => setImmediate(resolve));
      livePreview ||= !!state.preview && state.progress > 0.2;
      initialPreview ||= !!state.preview && state.count === 0;
      if (state.phase === 'saving' && state.error) {
        const first = recorder.saveBand();
        recorder.setError('Kamera sedang sibuk');
        const repeated = recorder.saveBand();
        assert.equal(encodings, 1, 'a second tap cannot start a duplicate band export');
        finishEncoding();
        await Promise.all([first, repeated]);
      }
    }
    assert.equal(state.bands.length, turn + 1, state.error || state.hint);
  }
  assert.ok(livePreview);
  assert.ok(initialPreview);
  assert.equal(state.phase, 'review');
  assert.equal(sample, null);
  const bands = recorder.collect();
  assert.equal(recorder.collect(), null, 'repeated naming button taps cannot claim the same room twice');
  recorder.dispose();
  assert.deepEqual(bands.map(band => band.meta.index), [0, 1, 2]);
  assert.deepEqual([...files], bands.map(band => band.uri));
});

test('a backgrounded camera can reopen while a late shutter returns from the cancelled room', async t => {
  const files = new Set(['pending.jpg']);
  let sample, finish, state, reads = 0, subscriptions = 0;
  const recorder = new NativeSweepSession({
    listen: async handler => { subscriptions++; sample = handler; return () => { subscriptions--; }; },
    capture: () => new Promise(resolve => { finish = resolve; }),
    pixels: async () => { reads++; return view(pose(0, 0)); },
    encode: async () => ({ uri: 'unused-preview.jpg' }),
    remove: items => items.forEach(file => files.delete(file.uri)),
  }, next => { state = next; });
  t.after(() => recorder.dispose());
  await recorder.start();
  const timestamp = performance.now();
  sample({ quaternion: pose(0, 0), timestamp, orientation: 0 });
  sample({ quaternion: pose(0, 0), timestamp: timestamp + 100, orientation: 0 });
  assert.equal(typeof finish, 'function');
  recorder.interrupt();
  assert.equal(subscriptions, 0);
  assert.equal(state.phase, 'intro');
  await recorder.start();
  assert.equal(subscriptions, 1);
  finish({ uri: 'pending.jpg', width: 80, height: 144 });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(files.size, 0);
  assert.equal(reads, 0);
  assert.equal(state.phase, 'capturing');
  assert.equal(state.progress, 0);
});

test('a camera mount failure cancels sensor startup even when the permission response arrives after reopening', async t => {
  const pending = [], subscriptions = new Set();
  let state;
  const recorder = new NativeSweepSession({
    listen: () => new Promise(resolve => pending.push(() => {
      const handle = Symbol('sensor');
      subscriptions.add(handle);
      resolve(() => subscriptions.delete(handle));
    })),
    remove: () => {},
  }, next => { state = next; });
  t.after(() => recorder.dispose());
  const first = recorder.start();
  recorder.cameraFailed('Kamera sibuk');
  assert.equal(state.phase, 'intro');
  assert.match(state.error, /sibuk/);
  const second = recorder.start();
  pending[1]();
  await second;
  pending[0]();
  await first;
  assert.equal(subscriptions.size, 1);
  assert.equal(state.phase, 'capturing');
  recorder.dispose();
  assert.equal(subscriptions.size, 0);
});

test('a frozen sensor after its first reading releases the camera session and permits a new sweep', async t => {
  let now = 1000, state, sample, subscribed = false;
  t.mock.method(performance, 'now', () => now);
  t.mock.timers.enable({ apis: ['setInterval'] });
  const recorder = new NativeSweepSession({
    listen: async handler => { subscribed = true; sample = handler; return () => { subscribed = false; }; },
    remove: () => {},
  }, next => { state = next; });
  t.after(() => recorder.dispose());
  await recorder.start();
  sample({ quaternion: pose(0, 0), timestamp: now, orientation: 0 });
  now += 3800;
  t.mock.timers.tick(3800);
  assert.equal(subscribed, false);
  assert.equal(state.phase, 'intro');
  assert.match(state.error, /Sensor berhenti/);
  await recorder.start();
  assert.equal(subscribed, true);
  assert.equal(state.phase, 'capturing');
});
