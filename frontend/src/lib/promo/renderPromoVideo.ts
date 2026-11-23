import { BufferTarget, CanvasSource, canEncodeVideo, Mp4OutputFormat, Output, QUALITY_HIGH } from "mediabunny";
import type { Texture } from "three";
import { createPanoramaRenderer, loadPanoramaTextures, PanoramaRenderer } from "./panoramaRenderer";
import { drawBrand, drawIntro, drawOutro, drawRoomCaption, dipToBlack, ensurePromoFonts, PromoListing, PromoRoomCaption } from "./promoOverlay";
import {
  buildTimeline,
  cameraFor,
  fadeAlpha,
  MAX_PROMO_ROOMS,
  PROMO_FPS,
  PROMO_HEIGHT,
  PROMO_WIDTH,
  PromoScene,
  sceneAt,
  totalDuration,
} from "./promoTimeline";

export interface PromoRoom {
  panoramaUrl: string;
  caption: PromoRoomCaption;
}

export interface PromoInput {
  listing: PromoListing;
  rooms: PromoRoom[];
}

interface FrameContext {
  ctx: CanvasRenderingContext2D;
  pano: PanoramaRenderer;
  textures: Texture[];
  scenes: PromoScene[];
  input: PromoInput;
}

// promoVideoSupported reports whether this browser can encode H.264 MP4 video with WebCodecs.
export async function promoVideoSupported(): Promise<boolean> {
  if (typeof window === "undefined" || typeof VideoEncoder === "undefined") return false;
  return canEncodeVideo("avc", { width: PROMO_WIDTH, height: PROMO_HEIGHT, quality: QUALITY_HIGH });
}

// renderPromoVideo renders the 9:16 promo frame by frame and encodes it to an MP4 file entirely in the browser.
export async function renderPromoVideo(input: PromoInput, onProgress: (fraction: number) => void): Promise<Blob> {
  const rooms = input.rooms.slice(0, MAX_PROMO_ROOMS);
  await ensurePromoFonts();
  const textures = await loadPanoramaTextures(rooms.map((r) => r.panoramaUrl));
  const pano = createPanoramaRenderer(PROMO_WIDTH, PROMO_HEIGHT);
  const frame = document.createElement("canvas");
  frame.width = PROMO_WIDTH;
  frame.height = PROMO_HEIGHT;
  const ctx = frame.getContext("2d");
  if (!ctx) throw new Error("Browser tidak mendukung kanvas 2D.");

  const output = new Output({ format: new Mp4OutputFormat({ fastStart: "in-memory" }), target: new BufferTarget() });
  const source = new CanvasSource(frame, { codec: "avc", quality: QUALITY_HIGH });
  output.addVideoTrack(source, { frameRate: PROMO_FPS });
  const scenes = buildTimeline(rooms.length);
  const frameCount = Math.round(totalDuration(scenes) * PROMO_FPS);
  const context: FrameContext = { ctx, pano, textures, scenes, input: { ...input, rooms } };
  try {
    await output.start();
    for (let i = 0; i < frameCount; i++) {
      drawFrame(context, i / PROMO_FPS);
      await source.add(i / PROMO_FPS, 1 / PROMO_FPS);
      onProgress((i + 1) / frameCount);
    }
    await output.finalize();
  } catch (err) {
    if (output.state === "started") await output.cancel();
    throw err;
  } finally {
    pano.dispose();
    textures.forEach((t) => t.dispose());
  }
  const buffer = output.target.buffer;
  if (!buffer) throw new Error("Video gagal dibuat.");
  return new Blob([buffer], { type: "video/mp4" });
}

// drawFrame composes one video frame: the moving panorama view, the scene's text, the brand, and fades.
function drawFrame({ ctx, pano, textures, scenes, input }: FrameContext, t: number) {
  const { scene, local, progress } = sceneAt(scenes, t);
  pano.setPanorama(textures[scene.roomIndex]);
  pano.render(cameraFor(scene.kind, progress));
  ctx.drawImage(pano.canvas, 0, 0, PROMO_WIDTH, PROMO_HEIGHT);
  if (scene.kind === "intro") drawIntro(ctx, input.listing);
  if (scene.kind === "room") drawRoomCaption(ctx, input.rooms[scene.roomIndex].caption, scene.roomIndex, input.rooms.length);
  if (scene.kind === "outro") drawOutro(ctx, input.listing);
  drawBrand(ctx);
  dipToBlack(ctx, fadeAlpha(local, scene.duration));
}
