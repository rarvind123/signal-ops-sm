import "server-only";

import sharp from "sharp";
import type { SMTone } from "@/types/sm";

const FONT_MAP: Record<SMTone, string> = {
  bold: 'Impact, "Arial Black", sans-serif',
  premium: 'Georgia, "Times New Roman", serif',
  warm: "Georgia, Palatino, serif",
  playful: '"Trebuchet MS", Arial, sans-serif',
  professional: "Arial, Helvetica, sans-serif",
  urgent: 'Impact, "Arial Black", sans-serif',
};

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

function wrapHeadline(headline: string, maxChars = 35): string[] {
  const words = headline.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars) {
      if (current) lines.push(current.trim());
      current = word;
    } else {
      current = next;
    }
  }

  if (current) lines.push(current.trim());
  return lines.length > 0 ? lines : [headline];
}

export async function compositeTextOntoImage(
  imageBuffer: Buffer,
  headline: string,
  tone?: SMTone
): Promise<Buffer> {
  const { width = 1080, height = 1080 } = await sharp(imageBuffer).metadata();
  const fontFamily = FONT_MAP[tone ?? "professional"];
  const fontSize = Math.round(width * 0.045);
  const paddingX = Math.round(width * 0.04);
  const paddingY = Math.round(height * 0.04);

  const lines = wrapHeadline(headline);
  const lineHeight = fontSize * 1.2;
  const totalTextH = lines.length * lineHeight;
  const gradientH = Math.round(height * 0.4);
  const textY = height - paddingY - totalTextH;

  const svgText = lines
    .map(
      (line, i) =>
        `<text x="${paddingX}" y="${textY + i * lineHeight + fontSize}" 
      font-family="${fontFamily}" font-size="${fontSize}" font-weight="bold"
      fill="white" filter="url(#shadow)">${escapeXml(line)}</text>`
    )
    .join("\n");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs>
      <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="black" stop-opacity="0"/>
        <stop offset="100%" stop-color="black" stop-opacity="0.65"/>
      </linearGradient>
      <filter id="shadow">
        <feDropShadow dx="0" dy="1" stdDeviation="2" flood-opacity="0.8"/>
      </filter>
    </defs>
    <rect x="0" y="${height - gradientH}" width="${width}" height="${gradientH}" fill="url(#grad)"/>
    ${svgText}
  </svg>`;

  return sharp(imageBuffer)
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .jpeg({ quality: 90 })
    .toBuffer();
}
