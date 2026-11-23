import assert from "node:assert/strict";
import { test } from "node:test";
import { Euler, Quaternion, Vector3 } from "three";
import { checkSweepImage, overlapScore } from "../../shared/sweepImage.ts";
import { SweepRecorder } from "../src/lib/capture/sweepRecorder.ts";
import { buildCaptureTargets } from "../../shared/capturePolicy.ts";

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

// Supplies working video, motion and canvas interfaces so the complete recorder can run without hardware.
function browserCamera(t) {
  const state = { handler: null, stopped: 0, heading: 0, pitch: 0, time: 500, preview: null };
  const track = { readyState: "live", stop: () => { state.stopped++; } };
  const stream = { getTracks: () => [track], getVideoTracks: () => [track] };
  const video = { videoWidth: 720, videoHeight: 1200, readyState: 4, play: async () => {} };
  const createCanvas = () => ({
    getContext: () => ({
      drawImage: () => {}, getImageData: () => renderScene(state.heading, state.pitch).pixels,
      putImageData: (image) => { state.preview = image.data; },
      createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    }),
    toBlob: (done) => done(new Blob(["jpeg"])), toDataURL: () => "data:image/png;base64,test",
  });
  const globals = {
    window: { DeviceOrientationEvent: {}, removeEventListener: () => { state.handler = null; },
      addEventListener: (_, fn) => { state.handler = fn; fn({ alpha: 0, beta: 90, gamma: 0 }); } },
    navigator: { mediaDevices: { getUserMedia: async () => stream } },
    document: { hidden: false, createElement: createCanvas },
    performance: { now: () => state.time },
  };
  for (const [name, value] of Object.entries(globals)) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, value });
    t.after(() => descriptor ? Object.defineProperty(globalThis, name, descriptor) : delete globalThis[name]);
  }
  return { state, video };
}

// Moves the camera continuously between two headings and lets each asynchronous exposure complete.
async function sweepTo(state, yaw, pitch = 0) {
  do {
    state.heading = Math.min(yaw, state.heading + 1);
    const tilt = pitch - state.pitch;
    state.pitch += Math.sign(tilt) * Math.min(1, Math.abs(tilt));
    state.time += 95;
    state.handler?.({ alpha: -state.heading, beta: 90 + state.pitch, gamma: 0 });
    await new Promise((resolve) => setImmediate(resolve));
  } while (state.heading < yaw || state.pitch !== pitch);
}

test("a moving web panorama reaches review with the calibration frames reused in the upload", async (t) => {
  const { state, video } = browserCamera(t);
  const targets = buildCaptureTargets();
  const path = [];
  for (let yaw = 72; yaw <= 328; yaw += 32) path.push({ yaw, pitch: 0, ring: "horizon" });
  for (const pitch of [55, -55]) {
    const start = path.at(-1).yaw;
    for (let i = 0; i < 8; i++) path.push({ yaw: start + i * 45, pitch, ring: pitch > 0 ? "up" : "down" });
  }
  path.forEach((p) => targets.push({ ...p, id: targets.length, yaw: p.yaw % 360 }));
  const views = [];
  let attempts = 0;
  // Retries an interrupted calibration using the same three accepted photographs.
  const measureLens = async (photos) => {
    assert.equal(photos.length, 3);
    if (++attempts === 1) throw new Error("Koneksi terputus.");
    return { horizontal_fov: HFOV, aspect_ratio: 0.6, calibrated: true, confidence: 1, targets };
  };
  const recorder = new SweepRecorder({ current: video }, (view) => views.push(view), () => {}, measureLens);
  t.after(() => recorder.stop());
  await recorder.start(() => {});
  assert.equal(views.at(-1).phase, "capturing");
  await sweepTo(state, 0);
  await sweepTo(state, 40);
  assert.equal(views.at(-1).phase, "calibrationError");
  recorder.retryCalibration();
  await new Promise((resolve) => setImmediate(resolve));
  for (const target of path) await sweepTo(state, target.yaw, target.pitch);
  assert.ok(views.some((view) => view.phase === "calibrating"));
  assert.equal(views.at(-1).phase, "review", views.at(-1).error);
  assert.match(views.at(-1).preview, /^data:image/);
  const covered = state.preview.filter((value, index) => index % 4 === 3 && value === 255).length;
  assert.ok(covered > .98 * state.preview.length / 4, "the preview must include the upper and lower sweeps");
  assert.deepEqual(recorder.frames.map((f) => f.targetId), targets.map((t) => t.id));
  assert.ok(recorder.frames.every((f) => f.blob instanceof Blob && f.orientation.length === 4));
  assert.equal(state.handler, null);
  assert.equal(state.stopped, 1);
  recorder.reset();
  assert.equal(recorder.frames.length, 0);
  assert.equal(views.at(-1).preview, "");
});
