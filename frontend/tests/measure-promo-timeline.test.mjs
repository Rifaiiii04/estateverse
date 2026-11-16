import assert from "node:assert/strict";
import { test } from "node:test";
import { buildTimeline, fadeAlpha, MAX_PROMO_ROOMS, sceneAt, totalDuration } from "../src/lib/promo/promoTimeline.ts";

test("promo video has an intro, one scene per room, and an outro back to back", () => {
  const scenes = buildTimeline(3);
  assert.deepEqual(scenes.map((s) => s.kind), ["intro", "room", "room", "room", "outro"]);
  scenes.slice(1).forEach((s, i) => assert.ok(Math.abs(s.start - (scenes[i].start + scenes[i].duration)) < 1e-9));
});

test("room scenes are capped so the video stays short enough for WhatsApp Status", () => {
  const scenes = buildTimeline(20);
  assert.equal(scenes.filter((s) => s.kind === "room").length, MAX_PROMO_ROOMS);
  assert.ok(totalDuration(scenes) <= 30, "WhatsApp Status clips are limited to 30 seconds");
});

test("sceneAt finds the room playing at a given time", () => {
  const scenes = buildTimeline(2);
  const { scene, progress } = sceneAt(scenes, scenes[2].start + scenes[2].duration / 2);
  assert.equal(scene.kind, "room");
  assert.equal(scene.roomIndex, 1);
  assert.ok(Math.abs(progress - 0.5) < 1e-9);
});

test("scenes dip to black only at their edges", () => {
  assert.equal(fadeAlpha(0, 3), 0);
  assert.equal(fadeAlpha(1.5, 3), 1);
  assert.equal(fadeAlpha(3, 3), 0);
});
