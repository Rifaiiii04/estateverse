import assert from "node:assert/strict";
import { test } from "node:test";
import { Euler, Quaternion, Vector3 } from "three";
import { checkSweepImage, overlapScore } from "../../shared/sweepImage.ts";
import { SweepRecorder } from "../src/lib/capture/sweepRecorder.ts";
import { uploadTourCapture } from "../src/lib/api/tours.ts";

const RAD = Math.PI / 180;
const HFOV = 50;

// Renders a textured spherical room through a rectilinear phone camera at a specified heading.
function renderScene(yaw, pitch = 0, offset = 0, flat) {
  const width = 96, height = 160;
  const q = new Quaternion().setFromEuler(new Euler(pitch * RAD, -yaw * RAD, 0, "YXZ"));
  const focal = width / (2 * Math.tan(HFOV * RAD / 2));
  const data = new Uint8ClampedArray(width * height * 4);
  const ray = new Vector3();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      ray.set(x + 0.5 - width / 2, height / 2 - y - 0.5, -focal).normalize().applyQuaternion(q);
      const light = flat ?? 120 + 32 * Math.sin(29 * ray.x + 13 * ray.y)
        + 35 * Math.cos(39 * ray.y + 25 * ray.z) + 24 * Math.sin(36 * ray.z - 17 * ray.x);
      data.set([light + offset, light + offset, light + offset, 255], (y * width + x) * 4);
    }
  }
  return { pose: [q.w, q.x, q.y, q.z], pixels: { width, height, data } };
}

test("visual gates recognize moving overlap across the seam and changes in exposure", () => {
  const history = [renderScene(342)];
  const next = renderScene(8, 1, 17);
  assert.ok(overlapScore(next, history[0], HFOV) > .98);
  assert.equal(checkSweepImage(next, history, HFOV, 12), "");
  const otherRoom = { ...next, pixels: renderScene(143, -26).pixels };
  assert.match(checkSweepImage(otherRoom, history, HFOV, 5), /belum menyambung/);
  assert.match(checkSweepImage({ ...next, pixels: history[0].pixels }, history, HFOV, 0), /belum berubah/);
  assert.match(checkSweepImage(renderScene(158), history, HFOV, 0), /belum menyambung/);
});

test("uniform ceilings require a slower sweep while unusable exposures are rejected", () => {
  const wall = renderScene(30, 0, 0, 158);
  const history = [renderScene(0, 0, 0, 155)];
  assert.match(checkSweepImage(wall, history, HFOV, 10), /Perlambat/);
  assert.equal(checkSweepImage(wall, history, HFOV, 2), "");
  assert.match(checkSweepImage(renderScene(0, 0, 0, 1), [], null, 0), /cahaya/);
});

// Supplies live video exposures and records the JPEG encoder inputs from the production recorder.
function browserCamera(t) {
  const state = { handler: null, present: null, stopped: 0, heading: 0, pitch: 0, time: 500, jpeg: [] };
  const track = Object.assign(new EventTarget(), { readyState: "live", stop: () => { state.stopped++; } });
  const stream = { getTracks: () => [track], getVideoTracks: () => [track] };
  const video = { videoWidth: 96, videoHeight: 160, readyState: 4, play: async () => {},
    requestVideoFrameCallback: (fn) => { state.present = fn; return 1; },
    cancelVideoFrameCallback: () => { state.present = null; } };
  // Models pixel readback and records every completed canvas sent for JPEG compression.
  const createCanvas = () => {
    let buffer;
    const canvas = {
      width: 0, height: 0,
      getContext: () => ({
        clearRect: () => {}, drawImage: () => {}, getImageData: () => renderScene(state.heading, state.pitch).pixels,
        putImageData: (image) => { buffer = image.data; },
        createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
      }),
      toBlob: (done, type) => {
        if (state.failNextEncoding) { state.failNextEncoding = false; return done(null); }
        state.jpeg.push({ width: canvas.width, height: canvas.height, opaque: buffer.filter((v, i) => i % 4 === 3 && v === 255).length });
        done(new Blob([String(state.jpeg.length)], { type }));
      },
      toDataURL: () => "data:image/png;base64,test",
    };
    return canvas;
  };
  const globals = {
    window: Object.assign(new EventTarget(), { DeviceOrientationEvent: {} }),
    navigator: { mediaDevices: { getUserMedia: async () => stream } },
    document: Object.assign(new EventTarget(), { hidden: false, createElement: createCanvas }), performance: { now: () => state.time },
    requestAnimationFrame: (fn) => setImmediate(() => { state.handler({ alpha: 0, beta: 90, gamma: 0 }); fn(); }),
    cancelAnimationFrame: clearImmediate,
  };
  for (const [name, value] of Object.entries(globals)) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, value });
    t.after(() => descriptor ? Object.defineProperty(globalThis, name, descriptor) : delete globalThis[name]);
  }
  state.handler = (angles) => globals.window.dispatchEvent(Object.assign(new Event("deviceorientation"), angles));
  return { state, video, track };
}

// Presents a camera frame while rotating slowly through a real adjoining strip.
async function presentView(state, heading, pitch) {
  state.time += 400;
  state.heading = heading;
  state.pitch = pitch;
  state.handler?.({ alpha: -state.heading, beta: 90 + state.pitch, gamma: 0 });
  state.present?.(state.time);
  await new Promise((resolve) => setImmediate(resolve));
}

test("a brief background transition or ended track stops capture before another exposure", async (t) => {
  const { state, video, track } = browserCamera(t);
  let view;
  const recorder = new SweepRecorder({ current: video }, (next) => { view = next; }, () => {});
  t.after(() => recorder.stop());
  await recorder.start(() => {});
  await presentView(state, 0, 0);
  document.hidden = true;
  document.dispatchEvent(new Event("visibilitychange"));
  document.hidden = false;
  assert.equal(view.phase, "error");
  assert.equal(state.present, null);
  assert.equal(video.srcObject, null);
  await recorder.start(() => {});
  assert.equal(view.phase, "capturing");
  track.dispatchEvent(new Event("ended"));
  assert.equal(view.phase, "error");
  assert.equal(state.stopped, 2);
});

test("a live camera track that stops presenting exposures exits capture with a retry message", async (t) => {
  const { state, video } = browserCamera(t);
  let view, check;
  t.mock.method(globalThis, "setInterval", (fn) => { check = fn; return 0; });
  const recorder = new SweepRecorder({ current: video }, (next) => { view = next; }, () => {});
  t.after(() => recorder.stop());
  await recorder.start(() => {});
  state.time += 7000;
  check();
  assert.equal(view.phase, "error");
  assert.match(view.error, /berhenti mengirim gambar/);
  assert.equal(state.stopped, 1);
});

test("video presentations become completed 360 degree strips before review and multipart upload", async (t) => {
  const { state, video } = browserCamera(t);
  let view;
  const recorder = new SweepRecorder({ current: video }, (next) => { view = next; }, () => {});
  t.after(() => recorder.stop());
  await recorder.start(() => {});
  assert.equal(view.phase, "capturing");
  await presentView(state, 0, 0);
  await presentView(state, 4, 0);
  assert.equal(state.jpeg.length, 0);
  for (let band = 0; band < 5 && view.phase !== "review"; band++) {
    const pitch = view.pitch;
    state.failNextEncoding = band > 0 && band + 1 === view.total;
    const start = band === 0 ? 8 : 0;
    for (let yaw = start; yaw <= 372 && recorder.bands.length === band; yaw += 4) {
      await presentView(state, yaw, pitch);
      if (view.phase === "encodeError") {
        assert.equal(state.stopped, 1, "the final pixels no longer need a camera");
        document.hidden = true;
        document.dispatchEvent(new Event("visibilitychange"));
        document.hidden = false;
        assert.equal(view.phase, "encodeError");
        await Promise.all([recorder.saveBand(), recorder.saveBand()]);
      }
      if (yaw === 120) assert.equal(state.jpeg.length, band, "a partial pass must stay on device as an unfinished canvas");
    }
    assert.equal(recorder.bands.length, band + 1, view.hint || view.error);
  }
  assert.equal(view.phase, "review");
  assert.equal(state.stopped, 1);
  assert.equal(state.present, null);
  assert.equal(state.jpeg.length, view.total);
  assert.ok(view.total === 3 || view.total === 5);
  assert.match(view.preview, /^data:image/);
  for (const { meta, blob } of recorder.bands) {
    const { width, height, opaque } = state.jpeg[meta.index];
    assert.equal(width, 3072);
    assert.equal(height, Math.round(width * (meta.max_pitch - meta.min_pitch) / 360));
    assert.equal(opaque, width * height);
    assert.equal(blob.type, "image/jpeg");
  }
  await assertBandUpload(t, recorder.bands);
  const network = Promise.withResolvers();
  const first = recorder.uploadReview(() => network.promise);
  assert.equal(await recorder.uploadReview(() => assert.fail("double submission")), null);
  network.reject(new Error("offline"));
  assert.equal(await first, null);
  assert.equal(view.phase, "review");
  assert.equal(view.error, "offline");
  const bands = recorder.bands.slice();
  assert.equal(await recorder.uploadReview(async (retry) => {
    assert.deepEqual(retry, bands);
    return 42;
  }), 42);
  assert.equal(view.phase, "done");
  recorder.reset();
  assert.equal(recorder.bands.length, 0);
  assert.equal(view.preview, "");
});

// Exercises the seller upload adapter with a captured multipart request and a normal room response.
async function assertBandUpload(t, bands) {
  let body;
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "XMLHttpRequest");
  class UploadRequest {
    upload = {};
    status = 201;
    responseText = '{"data":{"id":17}}';
    // Records the named API route used to create a live capture.
    open(method, url) { assert.equal(method, "POST"); assert.match(url, /\/tours\/captures$/); }
    // Receives the actual multipart body produced by the web application.
    send(form) { body = form; this.onload(); }
  }
  Object.defineProperty(globalThis, "XMLHttpRequest", { configurable: true, value: UploadRequest });
  t.after(() => descriptor ? Object.defineProperty(globalThis, "XMLHttpRequest", descriptor) : delete globalThis.XMLHttpRequest);
  const response = await uploadTourCapture(8, "Ruang tamu", { bands, extras: { camera_height_cm: 155 } });
  assert.equal(response.id, 17);
  const manifest = JSON.parse(body.get("meta"));
  const { capture_id, ...metadata } = manifest;
  assert.match(capture_id, /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/);
  assert.deepEqual(metadata, { name: "Ruang tamu", camera_height_cm: 155, bands: bands.map((b) => b.meta) });
  assert.equal(body.get("property_id"), "8");
  assert.equal([...body.keys()].length, bands.length + 2);
  for (const [i, { blob }] of bands.entries()) assert.equal(await body.get(`frame_${i}`).text(), await blob.text());
  await uploadTourCapture(8, "Ruang tamu", { bands: bands.slice(), extras: {} });
  assert.equal(JSON.parse(body.get("meta")).capture_id, capture_id);
  const other = bands.map(({ blob, meta }) => ({ blob: blob.slice(), meta }));
  const original = Object.getOwnPropertyDescriptor(crypto, "randomUUID");
  Object.defineProperty(crypto, "randomUUID", { configurable: true, value: undefined });
  t.after(() => original ? Object.defineProperty(crypto, "randomUUID", original) : delete crypto.randomUUID);
  await uploadTourCapture(8, "Ruangan lain", { bands: other, extras: {} });
  const fallback = JSON.parse(body.get("meta")).capture_id;
  assert.match(fallback, /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/);
  assert.notEqual(fallback, capture_id);
}
