import "server-only";

import sharp from "sharp";
import { getOverlayConfig } from "@/lib/sm/overlay-config";
import {
  getBrandAccentColor,
  getClientTypography,
  getReadableBrandAccent,
  getTierFontSizesPx,
  getTypography,
  resolveHeadlineTiers,
  splitWord,
  svgSafeFontStack,
} from "@/lib/sm/typography";
import { TEXT_SIZE_PX, type OverlayOptions } from "@/lib/sm/overlay-options";
import type { SMCreativeFormat, SMClient, SMLayoutTemplate } from "@/types/sm";

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

function topGradientDef(id: string): string {
  return `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="black" stop-opacity="0.72"/>
    <stop offset="40%" stop-color="black" stop-opacity="0.35"/>
    <stop offset="100%" stop-color="black" stop-opacity="0"/>
  </linearGradient>`;
}

function bottomGradientDef(id: string): string {
  return `<linearGradient id="${id}" x1="0" y1="1" x2="0" y2="0">
    <stop offset="0%" stop-color="black" stop-opacity="0.78"/>
    <stop offset="45%" stop-color="black" stop-opacity="0.4"/>
    <stop offset="100%" stop-color="black" stop-opacity="0"/>
  </linearGradient>`;
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
    layout_template?: SMLayoutTemplate;
    text_position?: OverlayOptions["textPosition"];
    text_size?: OverlayOptions["textSize"];
    skip_bands?: boolean;
  }
): Promise<Buffer> {
  const { width = 1080, height = 1080 } = await sharp(imageBuffer).metadata();
  const typo = client ? getClientTypography(client) : getTypography();
  const fontStack = svgSafeFontStack(typo);
  const tiers = resolveHeadlineTiers(headline, options);
  if (!tiers) return imageBuffer;

  const format = options?.creative_format;
  const layout = options?.layout_template ?? "full_bleed_gradient";
  const brandColor = client ? getBrandAccentColor(client) : null;
  const punchWordCount = tiers.punch.split(" ").length;
  const overlay = getOverlayConfig(format, punchWordCount, layout, brandColor);
  const sizeKey = options?.text_size ?? "md";
  const tierPx = TEXT_SIZE_PX[sizeKey];
  const defaultPx = getTierFontSizesPx(punchWordCount, width);
  const setupSize = Math.round((tierPx.setup / 15) * defaultPx.setup);
  const punchSize = Math.round((tierPx.punch / 24) * defaultPx.punch);
  const textAtTop = options?.text_position === "top";
  const useBand = Boolean(overlay.bandPosition);
  const paddingX = Math.round(width * (format === "print_ad" ? 0.07 : 0.05));
  const paddingY = Math.round(height * 0.05);
  const setupWeight = Math.max(typo.fontWeight - 200, 300);
  const punchWeight = Math.min(typo.fontWeight + 200, 900);
  const accentColor = client ? getReadableBrandAccent(client) : undefined;

  const punchLineH = punchSize * 1.1;
  const gradientH = Math.round(height * 0.6);

  let textBlockBottom = height - paddingY;
  let textX = paddingX;

  if (layout === "brand_band_bottom") {
    textX = paddingX;
    if (options?.text_position === "top") {
      textBlockBottom =
        Math.round(height * 0.65) +
        paddingY +
        punchSize +
        (tiers.setup ? setupSize + punchSize * 0.3 : 0);
    } else {
      textBlockBottom = height - Math.round(height * 0.175);
    }
  } else if (layout === "brand_band_left") {
    const bandWidth = Math.round(width * 0.4);
    textX = Math.round(bandWidth * 0.1);
    if (options?.text_position === "top") {
      textBlockBottom =
        paddingY + punchSize + (tiers.setup ? setupSize + punchSize * 0.3 : 0);
    } else {
      textBlockBottom = height - paddingY;
    }
  } else if (!useBand && textAtTop) {
    textBlockBottom = paddingY + punchSize + (tiers.setup ? setupSize + punchSize * 0.3 : 0);
  } else if (!useBand && (layout === "type_forward" || layout === "full_bleed_top_text")) {
    textBlockBottom = paddingY + punchSize + (tiers.setup ? setupSize + punchSize * 0.3 : 0);
  }

  const punchY = textBlockBottom - punchSize * 0.2;
  const setupY = punchY - punchLineH - (tiers.setup ? setupSize * 0.3 : 0);

  const setupText = tiers.setup
    ? `<text x="${textX}" y="${setupY}"
      font-family="${fontStack}" font-size="${setupSize}" font-weight="${setupWeight}"
      letter-spacing="${typo.letterSpacing}"
      fill="${overlay.setupColor}" filter="url(#shadow)">${escapeXml(tiers.setup)}</text>`
    : "";

  const punchLetterSpacing =
    typo.textTransform === "uppercase" ? "0.04em" : typo.letterSpacing;

  const punchText = `<text x="${textX}" y="${punchY}"
      font-family="${fontStack}" font-size="${punchSize}" font-weight="${punchWeight}"
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

  const brandBandBottom =
    !options?.skip_bands &&
    layout === "brand_band_bottom" &&
    overlay.bandColor
      ? `<rect x="0" y="${Math.round(height * 0.65)}" width="${width}" height="${Math.round(height * 0.35)}" fill="${overlay.bandColor}"/>`
      : "";

  const brandBandLeft =
    !options?.skip_bands &&
    layout === "brand_band_left" &&
    overlay.bandColor
      ? `<rect x="0" y="0" width="${Math.round(width * 0.4)}" height="${height}" fill="${overlay.bandColor}"/>`
      : "";

  const gradientAnchor =
    !useBand && textAtTop
      ? "top"
      : !useBand && options?.text_position === "bottom"
        ? "bottom"
        : overlay.gradientAnchor;

  let gradientRect = "";
  if (overlay.gradientStyle !== "none" && gradientAnchor === "bottom") {
    gradientRect = `<rect x="0" y="${height - gradientH}" width="${width}" height="${gradientH}" fill="url(#gradBottom)"/>`;
  } else if (overlay.gradientStyle !== "none" && gradientAnchor === "top") {
    gradientRect = `<rect x="0" y="0" width="${width}" height="${gradientH}" fill="url(#gradTop)"/>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs>
      ${bottomGradientDef("gradBottom")}
      ${topGradientDef("gradTop")}
      <filter id="shadow">
        <feDropShadow dx="0" dy="1" stdDeviation="3" flood-opacity="0.6"/>
      </filter>
    </defs>
    ${whiteBand}
    ${brandBandBottom}
    ${brandBandLeft}
    ${gradientRect}
    ${setupText}
    ${punchText}
  </svg>`;

  return sharp(imageBuffer)
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .jpeg({ quality: 90 })
    .toBuffer();
}
