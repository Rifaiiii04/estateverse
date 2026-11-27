import assert from 'node:assert/strict';
import { test } from 'node:test';
import { encodePanoramaBitmap } from '../src/lib/capture/panoramaBitmap.ts';
import { localTourFiles } from '../src/types/capture.ts';
import { preferredPictureSize, selectPictureSize } from '../src/lib/capture/cameraSize.ts';
import { cameraDeadline } from '../src/lib/capture/cameraDeadline.ts';

test('native codec input preserves upright rows, RGB channel order, and BMP row padding', () => {
  const data = [10, 20, 30, 255, 40, 50, 60, 255];
  const bytes = encodePanoramaBitmap({ width: 1, height: 2, data });
  const view = new DataView(bytes.buffer);
  assert.equal(view.getInt32(18, true), 1);
  assert.equal(view.getInt32(22, true), 2);
  assert.equal(view.getUint32(2, true), bytes.length);
  assert.deepEqual([...bytes.slice(54)], [60, 50, 40, 0, 30, 20, 10, 0]);
  assert.throws(() => encodePanoramaBitmap({ width: 2, height: 2, data }), /Dimensi/);
});

test('camera size enumeration supports native-only high resolutions, empty lists and presets', () => {
  assert.equal(selectPictureSize(['4032x3024', '3840x2160']), '3840x2160');
  assert.equal(selectPictureSize(['1280x720', '640x360', '4032x3024']), '640x360');
  assert.equal(selectPictureSize([]), undefined);
  assert.equal(selectPictureSize(['Photo', 'High']), undefined);
});

test('a rejected or stalled native size enumeration activates the camera default', async () => {
  assert.equal(await preferredPictureSize({ getAvailablePictureSizesAsync: () => Promise.reject(new Error()) }), undefined);
  assert.equal(await preferredPictureSize({ getAvailablePictureSizesAsync: () => new Promise(() => {}) }, 5), undefined);
});

test('timed-out native file writes discard their JPEG if they settle after a retry', async () => {
  let complete;
  const removed = [];
  const task = new Promise(resolve => { complete = resolve; });
  await assert.rejects(cameraDeadline(task, 5, 'Kamera terhenti.', file => removed.push(file)), /terhenti/);
  complete('late.jpg');
  await task;
  assert.deepEqual(removed, ['late.jpg']);
});

test('completed panoramas are the only owned files after collecting the new camera', () => {
  const bands = [0, 1, 2].map(index => ({ uri: `band-${index}.jpg`, meta: { index } }));
  assert.deepEqual(localTourFiles({ bands }), bands);
  assert.deepEqual(localTourFiles({ id: 1 }), []);
  assert.deepEqual(localTourFiles({ frames: [{ uri: 'old.jpg' }] }), [{ uri: 'old.jpg' }]);
});
