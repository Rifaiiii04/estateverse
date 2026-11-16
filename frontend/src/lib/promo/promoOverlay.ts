// 2D text overlays drawn on top of the panorama frames of the promo video (720 x 1280 canvas).
import { PROMO_HEIGHT, PROMO_WIDTH } from "./promoTimeline";

export interface PromoListing {
  title: string;
  priceText: string;
  locationText: string;
  specsText: string;
  /** Listing address shown on the closing card, without protocol. */
  linkText: string;
  verifiedRooms: number;
}

export interface PromoRoomCaption {
  name: string;
  sizeText: string | null;
  note: string;
}

const FONT = '"Plus Jakarta Sans", system-ui, sans-serif';
const SAGE = "#356859";
const SAGE_PALE = "#c8dcd4";
const MARGIN = 48;

// ensurePromoFonts waits for the brand font so the first frames do not fall back to a system font.
export async function ensurePromoFonts(): Promise<void> {
  await Promise.all(["800 64px", "700 36px", "600 28px"].map((spec) => document.fonts.load(`${spec} "Plus Jakarta Sans"`)));
}

// drawIntro shows the price, title, location, and key specs over a darkened first room.
export function drawIntro(ctx: CanvasRenderingContext2D, listing: PromoListing) {
  shade(ctx, 0.25, 0.85);
  let y = PROMO_HEIGHT - 520;
  y = pill(ctx, "DIJUAL LANGSUNG PEMILIK", MARGIN, y);
  ctx.fillStyle = "#ffffff";
  ctx.font = `800 64px ${FONT}`;
  ctx.fillText(listing.priceText, MARGIN, y + 70);
  ctx.font = `700 38px ${FONT}`;
  wrapText(ctx, listing.title, PROMO_WIDTH - 2 * MARGIN, 3).forEach((line, i) => ctx.fillText(line, MARGIN, y + 140 + i * 48));
  ctx.font = `600 28px ${FONT}`;
  ctx.fillStyle = SAGE_PALE;
  ctx.fillText(listing.locationText, MARGIN, y + 310);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(listing.specsText, MARGIN, y + 356);
}

// drawRoomCaption labels the room on screen with its measured size and the seller's note.
export function drawRoomCaption(ctx: CanvasRenderingContext2D, caption: PromoRoomCaption, index: number, total: number) {
  shade(ctx, 0.55, 0.8);
  const top = PROMO_HEIGHT - 300;
  ctx.fillStyle = SAGE_PALE;
  ctx.font = `600 26px ${FONT}`;
  ctx.fillText(`Ruangan ${index + 1} dari ${total}`, MARGIN, top);
  ctx.fillStyle = "#ffffff";
  ctx.font = `800 54px ${FONT}`;
  ctx.fillText(caption.name, MARGIN, top + 66);
  let y = top + 66;
  if (caption.sizeText) y = pill(ctx, caption.sizeText, MARGIN, y + 34);
  if (caption.note) {
    ctx.font = `600 26px ${FONT}`;
    ctx.fillStyle = "#ffffff";
    wrapText(ctx, caption.note, PROMO_WIDTH - 2 * MARGIN, 2).forEach((line, i) => ctx.fillText(line, MARGIN, y + 46 + i * 34));
  }
}

// drawOutro closes with the call to action, the listing link, and the on-site recording proof when available.
export function drawOutro(ctx: CanvasRenderingContext2D, listing: PromoListing) {
  ctx.fillStyle = "rgba(27, 53, 46, 0.86)";
  ctx.fillRect(0, 0, PROMO_WIDTH, PROMO_HEIGHT);
  ctx.textAlign = "center";
  const cx = PROMO_WIDTH / 2;
  ctx.fillStyle = "#ffffff";
  ctx.font = `800 56px ${FONT}`;
  ctx.fillText("Lihat tur 360°", cx, 470);
  ctx.fillText("lengkapnya", cx, 534);
  ctx.font = `600 28px ${FONT}`;
  ctx.fillStyle = SAGE_PALE;
  ctx.fillText("Ukur ruangan & coba furnitur langsung dari HP", cx, 600);
  ctx.fillStyle = "#ffffff";
  ctx.font = `700 30px ${FONT}`;
  wrapText(ctx, listing.linkText, PROMO_WIDTH - 2 * MARGIN, 2).forEach((line, i) => ctx.fillText(line, cx, 700 + i * 40));
  if (listing.verifiedRooms > 0) {
    ctx.font = `700 26px ${FONT}`;
    ctx.fillStyle = SAGE_PALE;
    ctx.fillText(`✓ ${listing.verifiedRooms} ruangan direkam langsung di lokasi`, cx, 820);
  }
  ctx.textAlign = "left";
}

// drawBrand stamps the EstateVerse mark on every frame.
export function drawBrand(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
  ctx.beginPath();
  ctx.roundRect(MARGIN - 16, 52, 360, 56, 28);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = `800 26px ${FONT}`;
  ctx.fillText("EstateVerse", MARGIN + 4, 89);
  ctx.font = `600 22px ${FONT}`;
  ctx.fillStyle = SAGE_PALE;
  ctx.fillText("Walk Inside 360°", MARGIN + 170, 88);
}

// dipToBlack darkens the frame near scene boundaries; alpha 1 means fully visible.
export function dipToBlack(ctx: CanvasRenderingContext2D, alpha: number) {
  if (alpha >= 1) return;
  ctx.fillStyle = `rgba(0, 0, 0, ${1 - alpha})`;
  ctx.fillRect(0, 0, PROMO_WIDTH, PROMO_HEIGHT);
}

// shade darkens the lower part of the frame so white text stays readable on bright rooms.
function shade(ctx: CanvasRenderingContext2D, fromFraction: number, strength: number) {
  const gradient = ctx.createLinearGradient(0, PROMO_HEIGHT * fromFraction, 0, PROMO_HEIGHT);
  gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
  gradient.addColorStop(1, `rgba(0, 0, 0, ${strength})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, PROMO_WIDTH, PROMO_HEIGHT);
}

// pill draws a rounded sage label and returns the y coordinate just below it.
function pill(ctx: CanvasRenderingContext2D, text: string, x: number, y: number): number {
  ctx.font = `700 24px ${FONT}`;
  const width = ctx.measureText(text).width + 36;
  ctx.fillStyle = SAGE;
  ctx.beginPath();
  ctx.roundRect(x, y, width, 46, 23);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.fillText(text, x + 18, y + 31);
  return y + 46;
}

// wrapText splits text into at most maxLines lines that fit maxWidth, adding an ellipsis when cut.
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth || !line) {
      line = candidate;
      continue;
    }
    lines.push(line);
    line = word;
  }
  if (line) lines.push(line);
  if (lines.length <= maxLines) return lines;
  return [...lines.slice(0, maxLines - 1), `${lines[maxLines - 1]}…`];
}
