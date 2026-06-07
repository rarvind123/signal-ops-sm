import type { SMColorPalette, SMLogoSet } from "@/types/sm";

export function hexToBrightness(hex: string): number {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return 128;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

export function brightnessFromPalette(palette?: SMColorPalette): number | undefined {
  const hex = palette?.background ?? palette?.primary;
  return hex ? hexToBrightness(hex) : undefined;
}

export async function getImageRegionBrightness(
  imageUrl: string,
  region: { x: number; y: number; w: number; h: number; imgW: number; imgH: number }
): Promise<number> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(128);
      ctx.drawImage(img, 0, 0);
      const pw = Math.max(1, Math.round((region.w / region.imgW) * img.width));
      const ph = Math.max(1, Math.round((region.h / region.imgH) * img.height));
      const px = Math.round((region.x / region.imgW) * img.width);
      const py = Math.round((region.y / region.imgH) * img.height);
      const data = ctx.getImageData(px, py, pw, ph).data;
      let total = 0;
      for (let i = 0; i < data.length; i += 4) {
        total += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      }
      resolve(total / (data.length / 4));
    };
    img.onerror = () => resolve(128);
    img.src = imageUrl;
  });
}

export function selectLogo(logos: SMLogoSet, brightness: number): string | null {
  if (brightness > 160) {
    return logos.dark ?? logos.primary ?? null;
  }
  if (brightness < 96) {
    return logos.white ?? logos.primary ?? null;
  }
  return logos.primary ?? logos.dark ?? logos.white ?? null;
}

export function selectLogoForFormat(
  logos: SMLogoSet,
  format?: string,
  brightness?: number
): string | null {
  if (format === "print_ad") {
    return logos.dark ?? logos.primary ?? null;
  }
  if (format === "outdoor") {
    return logos.white ?? logos.primary ?? null;
  }
  if (brightness !== undefined) {
    return selectLogo(logos, brightness);
  }
  return logos.primary ?? logos.dark ?? logos.white ?? null;
}
