import type { FluxAspectRatio } from "@/lib/sm/image-gen";
import type { SMCreativeFormat } from "@/types/sm";

export const CUSTOM_SIZE_ID = "custom";

export interface AdSize {
  id: string;
  label: string;
  dimensions: string;
  aspect_ratio: string;
  composition_note: string;
  common_use: string;
}

export const PRINT_AD_SIZES: AdSize[] = [
  {
    id: "a4_portrait",
    label: "A4 Portrait",
    dimensions: "210 × 297 mm",
    aspect_ratio: "3:4",
    composition_note:
      "A4 portrait orientation, full bleed, text-safe margins of at least 5mm on all sides",
    common_use: "Magazine, newspaper inserts, flyers",
  },
  {
    id: "a4_landscape",
    label: "A4 Landscape",
    dimensions: "297 × 210 mm",
    aspect_ratio: "4:3",
    composition_note:
      "A4 landscape orientation, horizontal composition, subject positioned for wide reading",
    common_use: "Brochures, table cards",
  },
  {
    id: "a3_portrait",
    label: "A3 Portrait",
    dimensions: "297 × 420 mm",
    aspect_ratio: "3:4",
    composition_note:
      "A3 portrait, large format — composition must work at poster scale, bold elements",
    common_use: "Posters, in-store displays",
  },
  {
    id: "half_page",
    label: "Half Page",
    dimensions: "210 × 148 mm",
    aspect_ratio: "3:2",
    composition_note:
      "Half-page horizontal, compact layout — headline must be immediately readable",
    common_use: "Newspaper half-page ads",
  },
  {
    id: "full_page_tabloid",
    label: "Tabloid Full Page",
    dimensions: "280 × 400 mm",
    aspect_ratio: "7:10",
    composition_note:
      "Tabloid full page, vertical — bold headline, single strong visual, clear hierarchy",
    common_use: "Newspaper full page (Mumbai Mirror, Midday)",
  },
];

export const OUTDOOR_AD_SIZES: AdSize[] = [
  {
    id: "billboard_standard",
    label: "Billboard",
    dimensions: "14 × 48 ft",
    aspect_ratio: "16:9",
    composition_note:
      "Standard billboard, extreme widescreen — 3-second read at 60km/h. Subject far left OR far right, headline OPPOSITE side. Maximum 7 words. No body copy.",
    common_use: "Highway billboards, large outdoor hoardings",
  },
  {
    id: "hoarding_large",
    label: "Large Hoarding",
    dimensions: "20 × 10 ft",
    aspect_ratio: "2:1",
    composition_note:
      "Large hoarding, wide horizontal — bold single image, minimal text, readable at distance. High contrast essential.",
    common_use: "City hoardings, building wraps",
  },
  {
    id: "bus_shelter",
    label: "Bus Shelter",
    dimensions: "4 × 6 ft",
    aspect_ratio: "2:3",
    composition_note:
      "Bus shelter, tall vertical panel — pedestrians view close up. Can carry more detail than a billboard. Portrait composition.",
    common_use: "Bus stops, metro station panels",
  },
  {
    id: "unipole",
    label: "Unipole",
    dimensions: "20 × 30 ft",
    aspect_ratio: "2:3",
    composition_note:
      "Tall unipole format — vertical billboard, single bold image, headline maximum 5 words, viewed from distance",
    common_use: "Standalone pole structures on highways",
  },
  {
    id: "mall_banner",
    label: "Mall Banner",
    dimensions: "4 × 8 ft",
    aspect_ratio: "1:2",
    composition_note:
      "Vertical mall banner, tall narrow format — top half image, bottom half brand+text. Shoppers view at close range.",
    common_use: "Shopping mall corridors, retail displays",
  },
  {
    id: "transit_bus_back",
    label: "Bus Back",
    dimensions: "10 × 4.5 ft",
    aspect_ratio: "16:7",
    composition_note:
      "Bus back, ultra-wide horizontal — seen by following vehicles. Single punchline + logo. No fine print.",
    common_use: "Back of buses, auto-rickshaw panels",
  },
];

export function parseCustomSizeId(
  sizeId: string
): { widthCm: number; heightCm: number } | null {
  const match = sizeId.match(/^custom_(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const widthCm = parseFloat(match[1]);
  const heightCm = parseFloat(match[2]);
  if (!Number.isFinite(widthCm) || !Number.isFinite(heightCm) || widthCm <= 0 || heightCm <= 0) {
    return null;
  }
  return { widthCm, heightCm };
}

export function buildCustomSizeId(widthCm: number, heightCm: number): string {
  const w = Number(widthCm.toFixed(1));
  const h = Number(heightCm.toFixed(1));
  return `custom_${w}x${h}`;
}

export function isCustomSizeId(sizeId: string): boolean {
  return sizeId === CUSTOM_SIZE_ID || sizeId.startsWith("custom_");
}

function aspectRatioLabel(widthCm: number, heightCm: number): string {
  const ratio = widthCm / heightCm;
  if (ratio >= 1.55) return "16:9";
  if (ratio >= 1.2) return "4:3";
  if (ratio >= 0.85) return "3:4";
  if (ratio >= 0.6) return "2:3";
  return "9:16";
}

export function buildCustomAdSize(
  widthCm: number,
  heightCm: number,
  formatId: string
): AdSize {
  const widthMm = Math.round(widthCm * 10);
  const heightMm = Math.round(heightCm * 10);
  const formatLabel = formatId === "outdoor" ? "outdoor" : "print";
  return {
    id: buildCustomSizeId(widthCm, heightCm),
    label: "Custom size",
    dimensions: `${widthCm} × ${heightCm} cm (${widthMm} × ${heightMm} mm)`,
    aspect_ratio: aspectRatioLabel(widthCm, heightCm),
    composition_note: `Custom ${formatLabel} size ${widthCm}×${heightCm} cm. Scale headline and visual hierarchy for this exact proportion; keep 5mm+ safe margins.`,
    common_use: "Custom specification",
  };
}

const FLUX_RATIO_MAP: Record<string, FluxAspectRatio> = {
  "3:4": "3:4",
  "4:3": "16:9",
  "3:2": "16:9",
  "2:3": "9:16",
  "16:9": "16:9",
  "2:1": "16:9",
  "1:2": "9:16",
  "7:10": "3:4",
  "16:7": "16:9",
};

export function getAdSize(formatId: string, sizeId: string): AdSize | null {
  const custom = parseCustomSizeId(sizeId);
  if (custom) return buildCustomAdSize(custom.widthCm, custom.heightCm, formatId);
  const sizes = formatId === "print_ad" ? PRINT_AD_SIZES : OUTDOOR_AD_SIZES;
  return sizes.find((s) => s.id === sizeId) ?? null;
}

export function getSizesForFormat(formatId: SMCreativeFormat | string): AdSize[] {
  if (formatId === "print_ad") return PRINT_AD_SIZES;
  if (formatId === "outdoor") return OUTDOOR_AD_SIZES;
  return [];
}

export function fluxAspectRatioForAdSize(size: AdSize): FluxAspectRatio {
  return FLUX_RATIO_MAP[size.aspect_ratio] ?? "4:5";
}
