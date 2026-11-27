import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { saveTourDrafts } from '../src/lib/capture/saveTourDrafts.ts';
import { roomManifest } from '../src/lib/capture/roomManifest.ts';

// draft builds the same room metadata and file identities retained by the native form after recording.
function draft(name) {
  const bands = [0, 1, 2].map(index => ({ meta: { index }, uri: `${name}-${index}.jpg` }));
  return { name, roomSpecs: 'Jendela timur', panoramaUrl: '', bands, captureId: randomUUID() };
}

test('a lost POST response reuses its identity and files, while a failed note update retries only metadata', async () => {
  const first = draft('Dapur'), second = draft('Kamar');
  let rooms = [first, second], loseResponse = true, failNote = true;
  const uploads = [], removed = [], updates = [];
  const api = {
    upload: async (_, room) => {
      uploads.push(roomManifest(room).capture_id);
      if (loseResponse) { loseResponse = false; throw new Error('Koneksi putus'); }
      return { id: room === first ? 10 : 11, status: 'processing' };
    },
    update: async (id, _name, note) => {
      updates.push([id, note]);
      if (failNote) { failNote = false; throw new Error('Catatan gagal'); }
    },
    remove: files => removed.push(...files.map(file => file.uri)),
  };
  // save applies the form checkpoint by room identity, including on repeated attempts.
  const save = () => saveTourDrafts(42, rooms, api, (before, after) => {
    rooms = rooms.map(room => room === before ? after : room);
  });
  await assert.rejects(save(), /Koneksi putus/);
  assert.deepEqual(removed, []);
  assert.equal(rooms[0], first);
  await assert.rejects(save(), /Catatan gagal/);
  assert.equal(rooms[0].id, 10);
  assert.equal(rooms[0].bands, undefined);
  assert.equal(rooms[1], second);
  await save();
  assert.deepEqual(uploads, [first.captureId, first.captureId, second.captureId]);
  assert.deepEqual(updates, [[10, first.roomSpecs], [10, first.roomSpecs], [11, second.roomSpecs]]);
  assert.deepEqual(removed, [...first.bands, ...second.bands].map(file => file.uri));
});

test('older sweep and raw-frame drafts preserve their original multipart manifests', () => {
  const room = draft('Kamar');
  const meta = JSON.parse(JSON.stringify(roomManifest({ ...room, captureId: undefined })));
  assert.deepEqual(meta, { name: room.name, bands: room.bands.map(band => band.meta) });
  const orientation = [1, 0, 0, 0];
  assert.deepEqual(roomManifest({ name: room.name, frames: [{ orientation }] }),
    { name: room.name, frames: [{ index: 0, orientation }] });
});
