import { Quaternion, Vector3 } from "three";
import { CaptureTarget, directionFromAngles, STEADY_HOLD_MS } from "@/lib/capture/captureTargets";

/** Approximate horizontal field of view of the full-screen camera preview, used only for drawing guides. */
const PREVIEW_HFOV_DEG = 50;
const COLORS = {
  pending: "rgba(255,255,255,0.95)",
  upcoming: "rgba(255,255,255,0.45)",
  done: "rgba(74,222,128,0.95)",
  accent: "#4ade80",
};
/** How many targets of the path are visible at once: the next one plus a faint trail of the ones after it. */
const TRAIL_LENGTH = 3;

type ScreenPoint = { x: number; y: number };

export interface OverlayState {
  quaternion: Quaternion;
  targets: CaptureTarget[];
  done: ReadonlySet<number>;
  nearestId: number | null;
  steadySince: number | null;
  now: number;
}

// projectToScreen maps a world direction into canvas pixels for the current phone orientation.
export function projectToScreen(dir: Vector3, inv: Quaternion, w: number, h: number) {
  const c = dir.clone().applyQuaternion(inv);
  if (c.z > -0.05) return null;
  const f = w / 2 / Math.tan(((PREVIEW_HFOV_DEG / 2) * Math.PI) / 180);
  return { x: w / 2 + (f * c.x) / -c.z, y: h / 2 - (f * c.y) / -c.z, camera: c };
}

// drawTargets shows captured points in green, the single next point in white, and a faint trail to the ones after
// it; the rest of the path stays hidden so the photographer follows one point instead of choosing among many.
export function drawTargets(ctx: CanvasRenderingContext2D, s: OverlayState, w: number, h: number) {
  const inv = s.quaternion.clone().invert();
  const project = (t: CaptureTarget) => projectToScreen(directionFromAngles(t.yaw, t.pitch), inv, w, h);
  const nextIndex = s.targets.findIndex((t) => t.id === s.nearestId);
  const trail = nextIndex < 0 ? [] : s.targets.slice(nextIndex, nextIndex + TRAIL_LENGTH);
  drawTrail(ctx, trail.map(project));
  for (const t of s.targets) {
    const p = project(t);
    if (!p) continue;
    if (s.done.has(t.id)) drawDot(ctx, p, 7, COLORS.done, COLORS.done);
    else if (t.id === s.nearestId) drawDot(ctx, p, 16, "rgba(15,23,42,0.35)", COLORS.pending);
    else if (trail.includes(t)) drawDot(ctx, p, 8, "rgba(15,23,42,0.25)", COLORS.upcoming);
  }
}

// drawTrail links the next point to the following ones with a dashed line so the direction of travel is visible.
function drawTrail(ctx: CanvasRenderingContext2D, points: (ScreenPoint | null)[]) {
  ctx.save();
  ctx.setLineDash([6, 8]);
  ctx.lineWidth = 2;
  ctx.strokeStyle = COLORS.upcoming;
  for (let i = 1; i < points.length; i++) {
    const [a, b] = [points[i - 1], points[i]];
    if (!a || !b) continue;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.restore();
}

// drawDot paints one filled, outlined target marker.
function drawDot(ctx: CanvasRenderingContext2D, p: ScreenPoint, radius: number, fill: string, stroke: string) {
  ctx.beginPath();
  ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = stroke;
  ctx.stroke();
}

// drawReticle renders the center ring that fills up while the phone is held steady on a target.
export function drawReticle(ctx: CanvasRenderingContext2D, s: OverlayState, w: number, h: number) {
  const cx = w / 2;
  const cy = h / 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 26, 0, Math.PI * 2);
  ctx.lineWidth = 3;
  ctx.strokeStyle = COLORS.pending;
  ctx.stroke();
  if (s.steadySince === null) return;
  const progress = Math.min(1, (s.now - s.steadySince) / STEADY_HOLD_MS);
  ctx.beginPath();
  ctx.arc(cx, cy, 26, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
  ctx.lineWidth = 6;
  ctx.strokeStyle = COLORS.accent;
  ctx.stroke();
}

// drawGuideArrow points from the center towards the next target when it is off-screen or far away.
export function drawGuideArrow(ctx: CanvasRenderingContext2D, s: OverlayState, w: number, h: number) {
  const target = s.targets.find((t) => t.id === s.nearestId);
  if (!target) return;
  const c = directionFromAngles(target.yaw, target.pitch).applyQuaternion(s.quaternion.clone().invert());
  const angle = Math.atan2(-c.y, c.x);
  const onScreen = projectToScreen(directionFromAngles(target.yaw, target.pitch), s.quaternion.clone().invert(), w, h);
  if (onScreen && Math.hypot(onScreen.x - w / 2, onScreen.y - h / 2) < Math.min(w, h) * 0.3) return;
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(70, 0);
  ctx.lineTo(48, -14);
  ctx.lineTo(48, 14);
  ctx.closePath();
  ctx.fillStyle = COLORS.accent;
  ctx.fill();
  ctx.restore();
}

// drawMiniMap renders a small equirectangular coverage map with the current viewing direction.
export function drawMiniMap(ctx: CanvasRenderingContext2D, s: OverlayState, yaw: number, pitch: number, w: number) {
  const mw = 132;
  const mh = 66;
  const x0 = w - mw - 12;
  const y0 = 64;
  ctx.fillStyle = "rgba(15,23,42,0.55)";
  ctx.fillRect(x0, y0, mw, mh);
  const toMap = (ty: number, tp: number) => ({ x: x0 + ((ty % 360) / 360) * mw, y: y0 + ((90 - tp) / 180) * mh });
  for (const t of s.targets) {
    const p = toMap(t.yaw, t.pitch);
    const isNext = t.id === s.nearestId;
    const size = isNext ? 7 : 5;
    ctx.fillStyle = s.done.has(t.id) ? COLORS.done : isNext ? COLORS.pending : COLORS.upcoming;
    ctx.fillRect(p.x - size / 2, p.y - size / 2, size, size);
  }
  const me = toMap(yaw, pitch);
  ctx.strokeStyle = COLORS.accent;
  ctx.lineWidth = 2;
  ctx.strokeRect(me.x - 5, me.y - 5, 10, 10);
}
