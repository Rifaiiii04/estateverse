import assert from "node:assert/strict";
import { test } from "node:test";
import { grabFrame, startRearCamera } from "../src/lib/capture/frameGrabber.ts";

// installCanvas records the order of pose sampling, pixel copying, and JPEG encoding in a fake browser.
function installCanvas(t, calls) {
  const canvas = {
    width: 0, height: 0,
    getContext: () => ({ drawImage: () => calls.push("pixels") }),
    toBlob: (done) => { calls.push("jpeg"); done(new Blob(["jpeg"])); },
  };
  t.mock.method(globalThis, "setTimeout", () => 1);
  t.mock.method(globalThis, "clearTimeout", () => {});
  const original = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", { configurable: true, value: { createElement: () => canvas } });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, "document", original);
    else delete globalThis.document;
  });
  return canvas;
}

test("a fresh frame samples its pose before pixels and preserves portrait aspect", async (t) => {
  const calls = [];
  const canvas = installCanvas(t, calls);
  let present;
  const video = { videoWidth: 1080, videoHeight: 1920, readyState: 4,
    requestVideoFrameCallback: (callback) => { present = callback; return 1; } };
  const pending = grabFrame(video, () => calls.push("pose"));
  assert.deepEqual(calls, []);
  present();
  assert.ok(await pending instanceof Blob);
  assert.deepEqual(calls, ["pose", "pixels", "jpeg"]);
  assert.deepEqual([canvas.width, canvas.height], [720, 1280]);
});

test("motion detected at snapshot time discards the frame before copying pixels", async (t) => {
  const calls = [];
  installCanvas(t, calls);
  const video = { videoWidth: 720, videoHeight: 1280, readyState: 4 };
  await assert.rejects(grabFrame(video, () => { throw new Error("phone moved"); }), /phone moved/);
  assert.deepEqual(calls, []);
});

test("camera startup failure releases every camera track", async (t) => {
  let stopped = false;
  let constraints;
  const devices = { getUserMedia: async (options) => {
    constraints = options;
    return { getTracks: () => [{ stop: () => { stopped = true; } }] };
  } };
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: devices });
  t.after(() => delete navigator.mediaDevices);
  await assert.rejects(startRearCamera({ play: async () => { throw new Error("play failed"); } }), /play failed/);
  assert.equal(stopped, true);
  assert.equal(constraints.video.facingMode.exact, "environment");
});
