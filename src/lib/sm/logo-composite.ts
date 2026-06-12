import "server-only";

import sharp from "sharp";
import type { SMLogoStyle } from "@/lib/sm/overlay-options";

export async function compositeLogoOntoImage(
  imageBuffer: Buffer,
  logoUrl: string,
  position: "top-right" | "top-left" | "bottom-right" | "bottom-left" = "top-right",
  options?: {
    skipGlow?: boolean;
    targetHeight?: number;
    logoStyle?: SMLogoStyle;
  }
): Promise<Buffer> {
  const logoRes = await fetch(logoUrl);
  if (!logoRes.ok) {
    console.warn("[logo-composite] Could not fetch logo:", logoUrl);
    return imageBuffer;
  }
  const logoBuffer = Buffer.from(await logoRes.arrayBuffer());

  const image = sharp(imageBuffer);
  const { width = 1080, height = 1080 } = await image.metadata();

  const targetH = options?.targetHeight ?? Math.round(height * 0.08);
  const resizedLogo = await sharp(logoBuffer)
    .resize({ height: targetH, withoutEnlargement: true })
    .toBuffer();

  const logoMeta = await sharp(resizedLogo).metadata();
  const logoW = logoMeta.width ?? targetH;
  const logoH = logoMeta.height ?? targetH;
  const padding = Math.round(width * 0.03);

  const positions: Record<typeof position, { top: number; left: number }> = {
    "top-right": { top: padding + 20, left: width - logoW - padding },
    "top-left": { top: padding + 20, left: padding },
    "bottom-right": { top: height - logoH - padding, left: width - logoW - padding },
    "bottom-left": { top: height - logoH - padding, left: padding },
  };
  const { top, left } = positions[position];

  const layers: sharp.OverlayOptions[] = [];
  const logoStyle = options?.logoStyle ?? "box";

  if (logoStyle === "box") {
    const padX = Math.round(targetH * 0.35);
    const padY = Math.round(targetH * 0.2);
    const boxW = logoW + padX * 2;
    const boxH = logoH + padY * 2;
    const boxTop = top - padY;
    const boxLeft = left - padX;
    const radius = Math.round(boxH / 2);

    const boxSvg = `<svg width="${boxW}" height="${boxH}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${boxW}" height="${boxH}" rx="${radius}" ry="${radius}" fill="rgba(255,255,255,0.9)"/>
    </svg>`;

    layers.push({
      input: Buffer.from(boxSvg),
      top: Math.max(0, boxTop),
      left: Math.max(0, boxLeft),
      blend: "over",
    });
  } else if (logoStyle === "shadow") {
    const shadowBuffer = await sharp(resizedLogo).blur(5).toBuffer();
    layers.push({
      input: shadowBuffer,
      top: Math.max(0, top + 2),
      left: Math.max(0, left + 1),
      blend: "over",
    });
  }

  layers.push({
    input: resizedLogo,
    top: Math.max(0, top),
    left: Math.max(0, left),
    blend: "over",
  });

  return image.composite(layers).jpeg({ quality: 90 }).toBuffer();
}
