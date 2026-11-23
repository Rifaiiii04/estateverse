"use client";

import React, { useEffect, useMemo } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";

const FONT_FAMILY = '"Plus Jakarta Sans", system-ui, sans-serif';
const LABEL_HEIGHT = { normal: 0.055, strong: 0.07 }; // fraction-of-view units because size attenuation is off

interface SpriteLabelProps {
  position: [number, number, number];
  text: string;
  strong?: boolean;
}

// SpriteLabel draws an always-on-top text tag inside the WebGL scene; unlike DOM overlays it never races React unmounts.
export function SpriteLabel({ position, text, strong = false }: SpriteLabelProps) {
  const { texture, aspect } = useMemo(() => labelTexture(text, strong), [text, strong]);
  useEffect(() => () => texture.dispose(), [texture]);
  const height = strong ? LABEL_HEIGHT.strong : LABEL_HEIGHT.normal;
  return (
    <sprite position={position} scale={[height * aspect, height, 1]} renderOrder={10}>
      <spriteMaterial map={texture} sizeAttenuation={false} depthTest={false} depthWrite={false} transparent toneMapped={false} />
    </sprite>
  );
}

// labelTexture renders the text onto a rounded dark tag and returns it as a texture plus its width/height ratio.
function labelTexture(text: string, strong: boolean): { texture: CanvasTexture; aspect: number } {
  const font = `${strong ? 700 : 600} ${strong ? 30 : 24}px ${FONT_FAMILY}`;
  const padding = 14;
  const height = strong ? 48 : 38;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return { texture: new CanvasTexture(canvas), aspect: 1 };
  ctx.font = font;
  canvas.width = Math.ceil(ctx.measureText(text).width) + padding * 2;
  canvas.height = height;
  ctx.font = font; // resizing a canvas resets its drawing state
  ctx.fillStyle = strong ? "rgba(41, 82, 70, 0.95)" : "rgba(0, 0, 0, 0.65)";
  ctx.beginPath();
  ctx.roundRect(0, 0, canvas.width, height, 10);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "middle";
  ctx.fillText(text, padding, height / 2 + 1);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return { texture, aspect: canvas.width / height };
}
