import "server-only";

import sharp from "sharp";

export async function compositeLogoOntoImage(
  imageBuffer: Buffer,
  logoUrl: string,
  position: "top-right" | "top-left" | "bottom-right" | "bottom-left" = "top-right"
): Promise<Buffer> {
  const logoRes = await fetch(logoUrl);
  if (!logoRes.ok) {
    console.warn("[logo-composite] Could not fetch logo:", logoUrl);
    return imageBuffer;
  }
  const logoBuffer = Buffer.from(await logoRes.arrayBuffer());

  const image = sharp(imageBuffer);
  const { width = 1080, height = 1080 } = await image.metadata();

  const logoMaxWidth = Math.round(width * 0.18);
  const resizedLogo = await sharp(logoBuffer)
    .resize({ width: logoMaxWidth, withoutEnlargement: true })
    .toBuffer();

  const logoMeta = await sharp(resizedLogo).metadata();
  const logoW = logoMeta.width ?? logoMaxWidth;
  const logoH = logoMeta.height ?? 40;
  const padding = Math.round(width * 0.03);

  const positions: Record<typeof position, { top: number; left: number }> = {
    "top-right": { top: padding, left: width - logoW - padding },
    "top-left": { top: padding, left: padding },
    "bottom-right": { top: height - logoH - padding, left: width - logoW - padding },
    "bottom-left": { top: height - logoH - padding, left: padding },
  };
  const { top, left } = positions[position];

  const glowSize = Math.round(logoMaxWidth * 1.15);
  const glowBuffer = await sharp(logoBuffer)
    .resize({ width: glowSize, withoutEnlargement: true })
    .blur(4)
    .tint({ r: 255, g: 255, b: 255 })
    .toBuffer();

  const glowMeta = await sharp(glowBuffer).metadata();
  const glowW = glowMeta.width ?? glowSize;
  const glowH = glowMeta.height ?? logoH;

  const glowTop = top - Math.round((glowH - logoH) / 2);
  const glowLeft = left - Math.round((glowW - logoW) / 2);

  return image
    .composite([
      {
        input: glowBuffer,
        top: Math.max(0, glowTop),
        left: Math.max(0, glowLeft),
        blend: "over",
      },
      {
        input: resizedLogo,
        top,
        left,
        blend: "over",
      },
    ])
    .jpeg({ quality: 90 })
    .toBuffer();
}
