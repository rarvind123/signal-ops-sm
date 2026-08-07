import "server-only";

import sharp from "sharp";

export async function sampleImageRegionBrightness(
  imageBuffer: Buffer,
  region: { x: number; y: number; w: number; h: number; imgW: number; imgH: number }
): Promise<number> {
  const meta = await sharp(imageBuffer).metadata();
  const width = meta.width ?? 1080;
  const height = meta.height ?? 1080;

  const px = Math.max(0, Math.round((region.x / region.imgW) * width));
  const py = Math.max(0, Math.round((region.y / region.imgH) * height));
  const pw = Math.max(1, Math.round((region.w / region.imgW) * width));
  const ph = Math.max(1, Math.round((region.h / region.imgH) * height));
  const extractW = Math.min(pw, width - px);
  const extractH = Math.min(ph, height - py);
  if (extractW <= 0 || extractH <= 0) return 128;

  const { data, info } = await sharp(imageBuffer)
    .extract({ left: px, top: py, width: extractW, height: extractH })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = info.channels;
  const pixelCount = data.length / channels;
  if (pixelCount <= 0) return 128;

  let total = 0;
  for (let i = 0; i < data.length; i += channels) {
    total += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  return total / pixelCount;
}

export function logoRegionForPosition(
  position: "top-right" | "top-left" | "bottom-right" | "bottom-left"
): { x: number; y: number; w: number; h: number; imgW: number; imgH: number } {
  switch (position) {
    case "bottom-left":
      return { x: 0, y: 320, w: 160, h: 80, imgW: 400, imgH: 400 };
    case "top-left":
      return { x: 0, y: 0, w: 160, h: 80, imgW: 400, imgH: 400 };
    case "top-right":
      return { x: 240, y: 0, w: 160, h: 80, imgW: 400, imgH: 400 };
    default:
      return { x: 240, y: 320, w: 160, h: 80, imgW: 400, imgH: 400 };
  }
}
