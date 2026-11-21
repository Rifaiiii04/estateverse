// Scene timing and camera motion for the auto-generated 9:16 promo video. Pure functions, no browser APIs.

export const PROMO_FPS = 30;
export const PROMO_WIDTH = 720;
export const PROMO_HEIGHT = 1280;
export const MAX_PROMO_ROOMS = 6;

const INTRO_S = 2.8;
const ROOM_S = 3.2;
const OUTRO_S = 3.4;
const FADE_S = 0.35;

export type PromoSceneKind = "intro" | "room" | "outro";

export interface PromoScene {
  kind: PromoSceneKind;
  /** Which panorama is shown behind this scene. */
  roomIndex: number;
  start: number;
  duration: number;
}

export interface PromoCamera {
  yaw: number;
  pitch: number;
  fov: number;
}

// buildTimeline lays out an intro, one scene per room (capped), and an outro, back to back.
export function buildTimeline(roomCount: number): PromoScene[] {
  const rooms = Math.max(1, Math.min(roomCount, MAX_PROMO_ROOMS));
  const scenes: PromoScene[] = [{ kind: "intro", roomIndex: 0, start: 0, duration: INTRO_S }];
  for (let i = 0; i < rooms; i++) scenes.push({ kind: "room", roomIndex: i, start: INTRO_S + i * ROOM_S, duration: ROOM_S });
  scenes.push({ kind: "outro", roomIndex: 0, start: INTRO_S + rooms * ROOM_S, duration: OUTRO_S });
  return scenes;
}

// totalDuration returns the length of the whole video in seconds.
export function totalDuration(scenes: PromoScene[]): number {
  const last = scenes[scenes.length - 1];
  return last.start + last.duration;
}

// sceneAt finds the scene playing at time t and how far into it we are.
export function sceneAt(scenes: PromoScene[], t: number): { scene: PromoScene; local: number; progress: number } {
  const scene = scenes.find((s) => t < s.start + s.duration) ?? scenes[scenes.length - 1];
  const local = Math.max(0, t - scene.start);
  return { scene, local, progress: Math.min(1, local / scene.duration) };
}

// cameraFor gives each scene a slow, comfortable camera move: a pan with a gentle push-in for rooms.
export function cameraFor(kind: PromoSceneKind, progress: number): PromoCamera {
  const p = easeInOut(progress);
  if (kind === "room") return { yaw: -35 + 70 * p, pitch: -6, fov: 80 - 8 * p };
  if (kind === "intro") return { yaw: 12 * p, pitch: 0, fov: 86 };
  return { yaw: 180 + 15 * p, pitch: 0, fov: 88 };
}

// fadeAlpha is 1 while a scene is fully visible and ramps to 0 at its edges (dip to black between scenes).
export function fadeAlpha(local: number, duration: number): number {
  return Math.max(0, Math.min(1, local / FADE_S, (duration - local) / FADE_S));
}

// easeInOut smooths motion so pans start and stop gently.
export function easeInOut(x: number): number {
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}
