import assert from "node:assert/strict";
import { test } from "node:test";
import { Euler, Quaternion } from "three";
import { ExposurePoses, frameTime } from "../src/lib/capture/exposurePose.ts";
import { forwardAngles } from "../src/lib/capture/orientation.ts";
import { startRearCamera } from "../src/lib/capture/frameGrabber.ts";

test("the video loop processes only camera presentations and ignores a cancelled callback", async () => {
  const { watchVideo } = await import("../src/lib/capture/videoSweep.ts");
  const timestamps = [];
  let present, cancelled;
  const video = { readyState: 4, requestVideoFrameCallback: (callback) => { present = callback; return 5; },
    cancelVideoFrameCallback: (id) => { cancelled = id; } };
  const stop = watchVideo(video, (now) => timestamps.push(now));
  assert.deepEqual(timestamps, []);
  present(100);
  present(130);
  stop();
  present(160);
  assert.deepEqual(timestamps, [100, 130]);
  assert.equal(cancelled, 5);
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


test("delayed video uses the interpolated exposure rotation and handles a different camera clock", () => {
  const poses = new ExposurePoses();
  for (let t = 100; t <= 400; t += 50) {
    const degrees = 358 + (t - 100) / 50;
    poses.add({ timestamp: t, quaternion: new Quaternion().setFromEuler(new Euler(0, -degrees * Math.PI / 180, 0)) });
  }
  const exposure = frameTime(400, { captureTime: 175, presentationTime: 390 });
  assert.ok(Math.abs(forwardAngles(poses.at(exposure)).yaw - 359.5) < 1e-6);
  assert.equal(frameTime(400, { captureTime: 5000000, presentationTime: 390 }), 390);
  assert.equal(frameTime(400, { presentationTime: NaN }), 400);
  assert.equal(poses.at(900), null);
});

test("a dismissed camera permission cannot replace the next recording's video", async (t) => {
  const first = Promise.withResolvers();
  const stopped = [];
  const streams = ["old", "new"].map((id) => ({ getTracks: () => [{ stop: () => stopped.push(id) }] }));
  const requests = [first.promise, Promise.resolve(streams[1])];
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: () => requests.shift() } });
  t.after(() => delete navigator.mediaDevices);
  const old = new AbortController(), current = new AbortController();
  const video = { play: async () => {} };
  const pending = startRearCamera(video, old.signal);
  old.abort();
  await startRearCamera(video, current.signal);
  first.resolve(streams[0]);
  await assert.rejects(pending, { name: "AbortError" });
  assert.equal(video.srcObject, streams[1]);
  assert.deepEqual(stopped, ["old"]);
  current.abort();
  assert.deepEqual(stopped, ["old", "new"]);
  assert.equal(video.srcObject, null);
});

test("closing a camera releases the stream while inline playback is still pending", async (t) => {
  const playing = Promise.withResolvers(), attached = Promise.withResolvers();
  const stop = t.mock.fn();
  Object.defineProperty(navigator, "mediaDevices", { configurable: true,
    value: { getUserMedia: async () => ({ getTracks: () => [{ stop }] }) } });
  t.after(() => delete navigator.mediaDevices);
  const video = { play: () => { attached.resolve(); return playing.promise; } };
  const controller = new AbortController();
  const pending = startRearCamera(video, controller.signal);
  await attached.promise;
  controller.abort();
  assert.equal(stop.mock.callCount(), 1);
  assert.equal(video.srcObject, null);
  playing.reject(new Error("interrupted"));
  await assert.rejects(pending);
  assert.equal(stop.mock.callCount(), 1);
});
