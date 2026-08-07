import "server-only";

import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";
import { listBundledFontFiles } from "@/lib/sm/server-fonts";

/**
 * Rasterize an SVG text overlay with explicit font files.
 * Sharp/librsvg ignores @font-face — resvg reads fontFiles directly.
 */
export async function compositeSvgOverlay(
  imageBuffer: Buffer,
  svg: string,
  fontFilePaths: string[]
): Promise<Buffer> {
  const fonts = [...new Set(fontFilePaths.filter(Boolean))];

  if (fonts.length === 0) {
    console.error(
      `[svg-rasterize] NO font files — download text will show tofu. Bundled: ${listBundledFontFiles().join(", ") || "none"}`
    );
  }

  let overlayPng: Buffer;
  try {
    const resvg = new Resvg(svg, {
      fitTo: { mode: "original" },
      font: {
        fontFiles: fonts,
        // Host fonts are absent on Vercel — bundled files must carry everything.
        loadSystemFonts: false,
        defaultFontFamily: "Noto Sans",
      },
    });
    overlayPng = Buffer.from(resvg.render().asPng());
  } catch (error) {
    console.error("[svg-rasterize] resvg failed:", error);
    throw error;
  }

  return sharp(imageBuffer)
    .composite([{ input: overlayPng, top: 0, left: 0 }])
    .jpeg({ quality: 90 })
    .toBuffer();
}
