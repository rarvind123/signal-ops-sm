import "server-only";

import { existsSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
import { getFontById, recommendFontId } from "@/lib/sm/font-catalogue";
import type { TypographyStyle } from "@/lib/sm/typography";

export type ResolvedServerFont = {
  /** CSS font-family name used inside the SVG */
  family: string;
  /** @font-face block (ignored by Sharp; kept for reference) */
  fontFaceCss: string;
  fontWeight: number;
  /** Absolute paths passed to resvg fontFiles */
  fontFilePaths: string[];
};

// turbopackIgnore keeps file tracing scoped to assets/fonts (not whole project).
const FONT_DIR = join(/* turbopackIgnore: true */ process.cwd(), "assets", "fonts");

/** Catalogue id → local file basename (without extension). */
const FONT_FILE_IDS: Record<string, string> = {
  bebas: "bebas",
  oswald: "oswald",
  anton: "anton",
  cormorant: "cormorant",
  playfair: "playfair",
  lora: "lora",
  inter: "inter",
  "dm-sans": "dm-sans",
  outfit: "outfit",
  syne: "syne",
  "space-grotesk": "space-grotesk",
  fraunces: "fraunces",
  "noto-sans": "noto-sans",
};

const TONE_TO_FONT_ID: Record<string, string> = {
  bold: "bebas",
  urgent: "oswald",
  premium: "cormorant",
  warm: "lora",
  playful: "dm-sans",
  professional: "inter",
};

const cache = new Map<string, ResolvedServerFont>();

function findFontPath(basename: string): { path: string; format: string } | null {
  for (const ext of ["woff2", "ttf", "otf", "woff"] as const) {
    const full = join(FONT_DIR, `${basename}.${ext}`);
    if (existsSync(full)) {
      const format =
        ext === "woff2"
          ? "woff2"
          : ext === "woff"
            ? "woff"
            : ext === "otf"
              ? "opentype"
              : "truetype";
      return { path: full, format };
    }
  }
  return null;
}

function systemFallbackFont(): ResolvedServerFont | null {
  const candidates = [
    "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/liberation/LiberationSans-Bold.ttf",
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "/Library/Fonts/Arial.ttf",
  ];
  for (const path of candidates) {
    if (!existsSync(path)) continue;
    const b64 = readFileSync(path).toString("base64");
    const family = "SMSystemSans";
    return {
      family,
      fontWeight: 700,
      fontFaceCss: `@font-face{font-family:'${family}';src:url('data:font/ttf;base64,${b64}') format('truetype');font-weight:400 900;font-style:normal;}`,
      fontFilePaths: [path],
    };
  }
  return null;
}

function notoFontPath(): string | null {
  return findFontPath("noto-sans")?.path ?? null;
}

/** Always include Noto for ₹ and other non-ASCII headline glyphs. */
export function fontPathsForText(primaryPath: string | null): string[] {
  const paths: string[] = [];
  if (primaryPath) paths.push(primaryPath);
  const noto = notoFontPath();
  if (noto && !paths.includes(noto)) paths.push(noto);
  return paths;
}

function buildEmbeddedFont(
  fileId: string,
  family: string,
  fontWeight: number
): ResolvedServerFont | null {
  const found = findFontPath(fileId);
  if (!found) return null;
  const bytes = readFileSync(found.path);
  const b64 = bytes.toString("base64");
  const mime =
    found.format === "woff2"
      ? "font/woff2"
      : found.format === "woff"
        ? "font/woff"
        : "font/ttf";
  const safeFamily = family.replace(/'/g, "");
  return {
    family: safeFamily,
    fontWeight,
    fontFaceCss: `@font-face{font-family:'${safeFamily}';src:url('data:${mime};base64,${b64}') format('${found.format}');font-weight:400 900;font-style:normal;}`,
    fontFilePaths: fontPathsForText(found.path),
  };
}

/**
 * Resolve an embeddable font for Sharp SVG composites.
 * Prefer catalogue / tone match from assets/fonts; fall back to system sans.
 */
export function resolveServerFont(options?: {
  selectedFontId?: string | null;
  typo?: TypographyStyle;
  tone?: string | null;
  goal?: string | null;
  /** Headline/extra copy — used to attach Noto for ₹ etc. */
  text?: string;
}): ResolvedServerFont {
  void options?.text; // reserved for cache key / future script-aware fonts
  const cacheKey = [
    options?.selectedFontId ?? "",
    options?.typo?.fontFamily ?? options?.typo?.cssClass ?? "",
    options?.tone ?? "",
    options?.goal ?? "",
    options?.text?.slice(0, 40) ?? "",
  ].join("|");

  const hit = cache.get(cacheKey);
  if (hit) return hit;

  let fileId: string | null = null;
  let family = "Inter";
  let weight = 600;

  if (options?.selectedFontId) {
    const opt = getFontById(options.selectedFontId);
    if (opt) {
      fileId = FONT_FILE_IDS[opt.id] ?? opt.id;
      family = opt.family;
      weight = opt.weight;
    }
  }

  if (!fileId && options?.typo) {
    const name = `${options.typo.fontFamily ?? ""} ${options.typo.cssClass ?? ""} ${options.typo.fontStack}`;
    if (/bebas/i.test(name)) fileId = "bebas";
    else if (/oswald/i.test(name)) fileId = "oswald";
    else if (/anton/i.test(name)) fileId = "anton";
    else if (/cormorant/i.test(name)) fileId = "cormorant";
    else if (/playfair/i.test(name)) fileId = "playfair";
    else if (/lora/i.test(name)) fileId = "lora";
    else if (/dm\s*sans|font-dm/i.test(name)) fileId = "dm-sans";
    else if (/outfit/i.test(name)) fileId = "outfit";
    else if (/syne/i.test(name)) fileId = "syne";
    else if (/space\s*grotesk/i.test(name)) fileId = "space-grotesk";
    else if (/fraunces/i.test(name)) fileId = "fraunces";
    else if (/inter/i.test(name)) fileId = "inter";
    family = options.typo.fontFamily ?? family;
    weight = options.typo.fontWeight;
  }

  if (!fileId) {
    const recommended = recommendFontId(options?.tone, options?.goal);
    fileId = FONT_FILE_IDS[recommended] ?? "inter";
    const opt = getFontById(recommended);
    if (opt) {
      family = opt.family;
      weight = opt.weight;
    } else if (options?.tone && TONE_TO_FONT_ID[options.tone]) {
      fileId = TONE_TO_FONT_ID[options.tone];
    }
  }

  const embedded = fileId ? buildEmbeddedFont(fileId, family, weight) : null;
  if (embedded) {
    cache.set(cacheKey, embedded);
    return embedded;
  }

  // Last resort: Noto / Inter file, then OS fonts.
  const noto = buildEmbeddedFont("noto-sans", "Noto Sans", 400);
  if (noto) {
    cache.set(cacheKey, noto);
    return noto;
  }
  const inter = buildEmbeddedFont("inter", "Inter", 600);
  if (inter) {
    cache.set(cacheKey, inter);
    return inter;
  }

  const sys = systemFallbackFont();
  if (sys) {
    cache.set(cacheKey, {
      ...sys,
      fontFilePaths: fontPathsForText(null),
    });
    return cache.get(cacheKey)!;
  }

  // Should never happen — resvg will fail loudly in svg-rasterize.
  const bare: ResolvedServerFont = {
    family: "Noto Sans",
    fontWeight: 600,
    fontFaceCss: "",
    fontFilePaths: fontPathsForText(notoFontPath()),
  };
  cache.set(cacheKey, bare);
  return bare;
}

/** Debug helper — which font files are present at runtime. */
export function listBundledFontFiles(): string[] {
  try {
    return readdirSync(FONT_DIR);
  } catch {
    return [];
  }
}
