import "server-only";

import sharp from "sharp";
import { getOverlayConfig } from "@/lib/sm/overlay-config";
import {
  getClientTypography,
  getReadableBrandAccent,
  getTierFontSizesPx,
  getTypography,
  resolveHeadlineTiers,
  splitWord,
} from "@/lib/sm/typography";
import type { SMCreativeFormat, SMClient } from "@/types/sm";

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

function buildPunchTspans(
  punch: string,
  emphasisWord: string | undefined,
  accentColor: string | undefined,
  punchColor: string,
  textTransform: string
): string {
  const words = punch.split(" ");
  const accentIndex = emphasisWord
    ? words.findIndex((w) => splitWord(w).clean.toLowerCase() === emphasisWord.toLowerCase())
    : words.length - 1;
  const targetIndex = accentIndex >= 0 ? accentIndex : words.length - 1;

  return words
    .map((word, i) => {
      const { clean, punct } = splitWord(word);
      const content = escapeXml(textTransform === "uppercase" ? clean.toUpperCase() : clean);
      const suffix = escapeXml(punct);
      const spacer = i < words.length - 1 ? " " : "";
      const isAccent = accentColor && i === targetIndex;
      const fill = isAccent ? accentColor : punchColor;
      return `<tspan fill="${fill}">${content}${suffix}</tspan>${spacer ? `<tspan>${spacer}</tspan>` : ""}`;
    })
    .join("");
}

export async function compositeTextOntoImage(
  imageBuffer: Buffer,
  headline: string,
  client?: SMClient,
  options?: {
    setup?: string;
    punch?: string;
    emphasis_word?: string;
    creative_format?: SMCreativeFormat;
  }
): Promise<Buffer> {
  const { width = 1080, height = 1080 } = await sharp(imageBuffer).metadata();
  const typo = client ? getClientTypography(client) : getTypography();
  const tiers = resolveHeadlineTiers(headline, options);
  if (!tiers) return imageBuffer;

  const format = options?.creative_format;
  const punchWordCount = tiers.punch.split(" ").length;
  const overlay = getOverlayConfig(format, punchWordCount);
  const { setup: setupSize, punch: punchSize } = getTierFontSizesPx(punchWordCount, width);
  const paddingX = Math.round(width * (format === "print_ad" ? 0.07 : 0.05));
  const paddingY = Math.round(height * 0.05);
  const setupWeight = Math.max(typo.fontWeight - 200, 300);
  const punchWeight = Math.min(typo.fontWeight + 200, 900);
  const accentColor = client ? getReadableBrandAccent(client) : undefined;

  const punchLineH = punchSize * 1.1;
  const gradientH = Math.round(height * 0.6);
  const textBlockBottom = height - paddingY;
  const punchY = textBlockBottom - punchSize * 0.2;
  const setupY = punchY - punchLineH - (tiers.setup ? setupSize * 0.3 : 0);

  const setupText = tiers.setup
    ? `<text x="${paddingX}" y="${setupY}"
      font-family="${typo.fontStack}" font-size="${setupSize}" font-weight="${setupWeight}"
      letter-spacing="${typo.letterSpacing}"
      fill="${overlay.setupColor}" filter="url(#shadow)">${escapeXml(tiers.setup)}</text>`
    : "";

  const punchLetterSpacing =
    typo.textTransform === "uppercase" ? "0.04em" : typo.letterSpacing;

  const punchText = `<text x="${paddingX}" y="${punchY}"
      font-family="${typo.fontStack}" font-size="${punchSize}" font-weight="${punchWeight}"
      letter-spacing="${punchLetterSpacing}"
      filter="url(#shadow)">${buildPunchTspans(
        tiers.punch,
        options?.emphasis_word,
        accentColor,
        overlay.punchColor,
        typo.textTransform
      )}</text>`;

  const whiteBand =
    format === "print_ad"
      ? `<rect x="0" y="${height - Math.round(height * 0.22)}" width="${width}" height="${Math.round(height * 0.22)}" fill="white"/>`
      : "";

  const gradientRect =
    overlay.gradientStyle !== "none"
      ? `<rect x="0" y="${height - gradientH}" width="${width}" height="${gradientH}" fill="url(#grad)"/>`
      : "";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs>
      <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="black" stop-opacity="0"/>
        <stop offset="45%" stop-color="black" stop-opacity="0.4"/>
        <stop offset="100%" stop-color="black" stop-opacity="0.78"/>
      </linearGradient>
      <filter id="shadow">
        <feDropShadow dx="0" dy="1" stdDeviation="3" flood-opacity="0.6"/>
      </filter>
    </defs>
    ${whiteBand}
    ${gradientRect}
    ${setupText}
    ${punchText}
  </svg>`;

  return sharp(imageBuffer)
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .jpeg({ quality: 90 })
    .toBuffer();
}
