import "server-only";

import QRCode from "qrcode";
import sharp from "sharp";
import {
  cornerCoords,
  PIP_SIZE_PX,
  type OverlayOptions,
} from "@/lib/sm/overlay-options";
import { resolveServerFont } from "@/lib/sm/server-fonts";
import { compositeSvgOverlay } from "@/lib/sm/svg-rasterize";

function escapeXml(text: string): string {
  return text.replace(/[<>&"]/g, (c) => {
    const map: Record<string, string> = {
      "<": "&lt;",
      ">": "&gt;",
      "&": "&amp;",
      '"': "&quot;",
    };
    return map[c] ?? c;
  });
}

export async function compositeQrOntoImage(
  imageBuffer: Buffer,
  qrUrl: string,
  position: OverlayOptions["qrPosition"]
): Promise<Buffer> {
  const qrSvg = await QRCode.toString(qrUrl, {
    type: "svg",
    width: 80,
    margin: 1,
  });
  const qrBuffer = Buffer.from(qrSvg);
  const { width = 1080, height = 1080 } = await sharp(imageBuffer).metadata();
  const qrSize = 90;
  const { top, left } = cornerCoords(position, width, height, qrSize);

  const whitePad = await sharp({
    create: {
      width: qrSize + 12,
      height: qrSize + 12,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .png()
    .toBuffer();

  const qrPng = await sharp(qrBuffer).resize(qrSize, qrSize).png().toBuffer();

  return sharp(imageBuffer)
    .composite([
      { input: whitePad, top: top - 6, left: left - 6 },
      { input: qrPng, top, left },
    ])
    .jpeg({ quality: 90 })
    .toBuffer();
}

export async function compositePipOntoImage(
  imageBuffer: Buffer,
  pipImageUrl: string,
  position: OverlayOptions["pipPosition"],
  pipSize: OverlayOptions["pipSize"]
): Promise<Buffer> {
  const size = PIP_SIZE_PX[pipSize];
  let pipBytes: Buffer;

  if (pipImageUrl.startsWith("data:")) {
    const base64 = pipImageUrl.split(",")[1] ?? "";
    pipBytes = Buffer.from(base64, "base64");
  } else {
    const pipRes = await fetch(pipImageUrl);
    if (!pipRes.ok) return imageBuffer;
    pipBytes = Buffer.from(await pipRes.arrayBuffer());
  }

  const resizedPip = await sharp(pipBytes)
    .resize(size, size, { fit: "cover" })
    .jpeg()
    .toBuffer();

  const { width = 1080, height = 1080 } = await sharp(imageBuffer).metadata();
  const { top, left } = cornerCoords(position, width, height, size);

  return sharp(imageBuffer)
    .composite([{ input: resizedPip, top, left }])
    .jpeg({ quality: 90 })
    .toBuffer();
}

export async function compositeExtraTextOntoImage(
  imageBuffer: Buffer,
  text: string,
  position: OverlayOptions["extraTextPosition"],
  fontOptions?: {
    selectedFontId?: string | null;
    tone?: string | null;
  }
): Promise<Buffer> {
  const { width = 1080, height = 1080 } = await sharp(imageBuffer).metadata();
  const padding = Math.round(width * 0.04);
  const fontSize = Math.round(width * 0.028);
  const y = height - padding - 8;
  const serverFont = resolveServerFont({
    selectedFontId: fontOptions?.selectedFontId,
    tone: fontOptions?.tone,
    text,
  });
  const fontStack = `'${serverFont.family}', sans-serif`;

  let x = padding;
  let anchor = "";
  if (position === "bottom-right") {
    x = width - padding;
    anchor = 'text-anchor="end"';
  } else if (position === "bottom-center") {
    x = Math.round(width / 2);
    anchor = 'text-anchor="middle"';
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs>
      <style type="text/css"><![CDATA[
        ${serverFont.fontFaceCss}
      ]]></style>
      <filter id="shadow">
        <feDropShadow dx="0" dy="1" stdDeviation="2" flood-opacity="0.8"/>
      </filter>
    </defs>
    <text x="${x}" y="${y}" ${anchor}
      font-family="${fontStack}" font-size="${fontSize}" font-weight="500"
      letter-spacing="0.04em" fill="rgba(255,255,255,0.9)"
      filter="url(#shadow)">${escapeXml(text)}</text>
  </svg>`;

  return compositeSvgOverlay(imageBuffer, svg, serverFont.fontFilePaths);
}

export async function applyOverlayOptions(
  imageBuffer: Buffer,
  overlayOptions?: Partial<OverlayOptions>,
  fontOptions?: {
    selectedFontId?: string | null;
    tone?: string | null;
  }
): Promise<Buffer> {
  if (!overlayOptions) return imageBuffer;

  let result = imageBuffer;

  if (overlayOptions.showQr && overlayOptions.qrUrl?.trim()) {
    try {
      result = await compositeQrOntoImage(
        result,
        overlayOptions.qrUrl.trim(),
        overlayOptions.qrPosition ?? "bottom-right"
      );
    } catch (e) {
      console.warn("[overlay-composite] QR failed:", e);
    }
  }

  if (overlayOptions.showPip && overlayOptions.pipImageUrl) {
    try {
      result = await compositePipOntoImage(
        result,
        overlayOptions.pipImageUrl,
        overlayOptions.pipPosition ?? "bottom-right",
        overlayOptions.pipSize ?? "sm"
      );
    } catch (e) {
      console.warn("[overlay-composite] PiP failed:", e);
    }
  }

  if (overlayOptions.showExtraText && overlayOptions.extraText?.trim()) {
    try {
      result = await compositeExtraTextOntoImage(
        result,
        overlayOptions.extraText.trim(),
        overlayOptions.extraTextPosition ?? "bottom-center",
        {
          selectedFontId:
            fontOptions?.selectedFontId ?? overlayOptions.selectedFontId,
          tone: fontOptions?.tone,
        }
      );
    } catch (e) {
      console.warn("[overlay-composite] Extra text failed:", e);
    }
  }

  return result;
}
