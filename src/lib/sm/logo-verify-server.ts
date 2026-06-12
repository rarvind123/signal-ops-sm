import "server-only";

import sharp from "sharp";

export async function verifyLogoImageBuffer(
  buffer: Buffer
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!buffer.length) {
    return { ok: false, message: "That file is empty. Choose a different image." };
  }
  try {
    const meta = await sharp(buffer).metadata();
    if (!meta.width || !meta.height || meta.width < 2 || meta.height < 2) {
      return {
        ok: false,
        message:
          "This file cannot be rendered as a logo. Export a PNG or SVG at least 2×2 pixels.",
      };
    }
    return { ok: true };
  } catch {
    return {
      ok: false,
      message:
        "This file is corrupted or not a supported image. Try PNG, JPG, WebP, or SVG.",
    };
  }
}
