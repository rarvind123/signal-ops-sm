import type { SMClient, SMTone } from "@/types/sm";

export interface TypographyStyle {
  cssClass: string;
  fontStack: string;
  fontFamily?: string;
  fontWeight: number;
  letterSpacing: string;
  textTransform: "uppercase" | "none";
  lineHeight: number;
  italic: boolean;
  isCustomFont?: boolean;
}

export const TONE_TYPOGRAPHY: Record<SMTone, TypographyStyle> = {
  bold: {
    cssClass: "font-bebas",
    fontStack: "'Bebas Neue', Impact, sans-serif",
    fontWeight: 400,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    lineHeight: 1.0,
    italic: false,
  },
  premium: {
    cssClass: "font-cormorant",
    fontStack: "'Cormorant Garamond', 'Times New Roman', serif",
    fontWeight: 300,
    letterSpacing: "0.06em",
    textTransform: "none",
    lineHeight: 1.3,
    italic: true,
  },
  warm: {
    cssClass: "font-lora",
    fontStack: "'Lora', Georgia, serif",
    fontWeight: 400,
    letterSpacing: "0.01em",
    textTransform: "none",
    lineHeight: 1.4,
    italic: false,
  },
  playful: {
    cssClass: "font-dm",
    fontStack: "'DM Sans', Arial, sans-serif",
    fontWeight: 700,
    letterSpacing: "-0.02em",
    textTransform: "none",
    lineHeight: 1.1,
    italic: false,
  },
  professional: {
    cssClass: "font-inter",
    fontStack: "'Inter', Arial, sans-serif",
    fontWeight: 600,
    letterSpacing: "-0.01em",
    textTransform: "none",
    lineHeight: 1.2,
    italic: false,
  },
  urgent: {
    cssClass: "font-oswald",
    fontStack: "'Oswald', Impact, sans-serif",
    fontWeight: 700,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    lineHeight: 1.0,
    italic: false,
  },
};

export function getTypography(tone?: SMTone): TypographyStyle {
  return TONE_TYPOGRAPHY[tone ?? "professional"];
}

function buildCustomTypography(fontPrimary: string): TypographyStyle {
  const isSerif = /garamond|georgia|times|palatino|lora|merriweather|playfair/i.test(
    fontPrimary
  );
  const isDisplay = /bebas|oswald|impact|condensed|anton/i.test(fontPrimary);
  const fallback = isSerif ? "Georgia, serif" : "Arial, sans-serif";

  return {
    cssClass: "",
    fontFamily: fontPrimary,
    fontStack: `'${fontPrimary}', ${fallback}`,
    fontWeight: isDisplay ? 700 : isSerif ? 400 : 600,
    letterSpacing: isDisplay ? "0.04em" : isSerif ? "0.01em" : "-0.01em",
    textTransform: isDisplay ? "uppercase" : "none",
    lineHeight: isDisplay ? 1.0 : 1.25,
    italic: false,
    isCustomFont: true,
  };
}

export function getClientTypography(client: SMClient): TypographyStyle {
  if (client.font_primary) {
    return buildCustomTypography(client.font_primary);
  }
  return getTypography(client.tone);
}

/**
 * Fallback stacks when embedding is unavailable.
 * Prefer generic system faces — Google family names will tofu in Sharp.
 */
export function svgSafeFontStack(typo: TypographyStyle): string {
  const primary = `${typo.fontFamily ?? ""} ${typo.fontStack}`;
  if (/garamond|georgia|times|palatino|lora|merriweather|playfair|cormorant|serif/i.test(primary)) {
    return "Georgia, 'Times New Roman', serif";
  }
  if (/bebas|oswald|impact|condensed|anton/i.test(primary)) {
    return "Impact, 'Arial Black', sans-serif";
  }
  return "Arial, Helvetica, sans-serif";
}

export function getTypographyFontProps(typo: TypographyStyle): {
  className: string;
  fontFamily?: string;
} {
  return {
    className: typo.isCustomFont ? "" : typo.cssClass,
    fontFamily: typo.isCustomFont ? typo.fontStack : undefined,
  };
}

export interface HeadlineTiers {
  setup: string;
  punch: string;
}

export function splitHeadlineIntoTiers(headline: string): HeadlineTiers | null {
  if (!headline || headline.length < 10) return null;

  if (headline.includes(" — ")) {
    const [setup, ...rest] = headline.split(" — ");
    return { setup: setup.trim(), punch: rest.join(" — ").trim() };
  }

  const sentences = headline.match(/[^.!?]+[.!?]+\s*/g);
  if (sentences && sentences.length >= 2) {
    const punch = sentences[sentences.length - 1].trim();
    const setup = sentences.slice(0, -1).join("").trim();
    return { setup, punch };
  }

  if (headline.includes(", ")) {
    const idx = headline.indexOf(", ");
    return {
      setup: headline.slice(0, idx + 1).trim(),
      punch: headline.slice(idx + 2).trim(),
    };
  }

  const words = headline.split(" ");
  if (words.length >= 4) {
    const splitAt = Math.ceil(words.length * 0.45);
    return {
      setup: words.slice(0, splitAt).join(" "),
      punch: words.slice(splitAt).join(" "),
    };
  }

  return { setup: "", punch: headline };
}

export function resolveHeadlineTiers(
  headline: string,
  meta?: { setup?: string; punch?: string }
): HeadlineTiers | null {
  if (meta?.setup && meta?.punch) {
    return { setup: meta.setup, punch: meta.punch };
  }
  return splitHeadlineIntoTiers(headline);
}

export function isColorReadableOnDark(hex: string): boolean {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return false;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.7;
}

export function getBrandAccentColor(
  client?: Pick<SMClient, "brand_colors" | "color_palette">
): string | null {
  if (!client) return null;
  if (client.color_palette?.accent) return client.color_palette.accent;
  if (client.color_palette?.primary) return client.color_palette.primary;
  if (client.brand_colors?.length) return client.brand_colors[0].hex;
  return null;
}

export function getReadableBrandAccent(
  client?: Pick<SMClient, "brand_colors" | "color_palette">
): string | undefined {
  const hex = getBrandAccentColor(client);
  if (!hex || !isColorReadableOnDark(hex)) return undefined;
  return hex;
}

export function getTierFontSizes(punchWordCount: number): { setup: string; punch: string } {
  const punch =
    punchWordCount <= 3
      ? "clamp(18px, 5.5cqi, 28px)"
      : punchWordCount <= 5
        ? "clamp(15px, 4.5cqi, 24px)"
        : punchWordCount <= 8
          ? "clamp(13px, 3.8cqi, 20px)"
          : "clamp(12px, 3.2cqi, 17px)";

  const setup =
    punchWordCount <= 3 ? "clamp(11px, 2.8cqi, 15px)" : "clamp(11px, 2.6cqi, 14px)";

  return { setup, punch };
}

export function splitWord(word: string): { clean: string; punct: string } {
  const match = word.match(/^(.+?)([.!?,;:]+)?$/);
  return { clean: match?.[1] ?? word, punct: match?.[2] ?? "" };
}

export function getTierFontSizesPx(
  punchWordCount: number,
  width: number
): { setup: number; punch: number } {
  const punch =
    punchWordCount <= 3
      ? Math.round(width * 0.052)
      : punchWordCount <= 5
        ? Math.round(width * 0.042)
        : punchWordCount <= 8
          ? Math.round(width * 0.036)
          : Math.round(width * 0.03);

  const setup =
    punchWordCount <= 3 ? Math.round(width * 0.026) : Math.round(width * 0.024);

  return { setup, punch };
}

export function formatHeadlineLines(headline: string): string[] {
  const sentenceBreaks = headline.match(/[^.!?]+[.!?]+/g);
  if (sentenceBreaks && sentenceBreaks.length > 1) {
    return sentenceBreaks.map((s) => s.trim());
  }

  if (headline.includes(" — ")) {
    return headline.split(" — ").map((s) => s.trim());
  }

  if (headline.length > 30 && headline.includes(",")) {
    return headline.split(",").map((s) => s.trim());
  }

  const words = headline.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (current.length + word.length > 32 && current) {
      lines.push(current.trim());
      current = word;
    } else {
      current += (current ? " " : "") + word;
    }
  }
  if (current) lines.push(current.trim());
  return lines;
}
