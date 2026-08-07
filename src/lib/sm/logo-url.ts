import { withBasePath } from "@/lib/base-path";
import type { SMLogoSet } from "@/types/sm";
import { selectLogoForFormat } from "@/lib/sm/logo-selector";

export function isValidLogoUrl(url?: string | null): url is string {
  if (!url?.trim()) return false;
  const t = url.trim();
  return (
    t.startsWith("http://") ||
    t.startsWith("https://") ||
    t.startsWith("/api/")
  );
}

export function firstValidLogoUrl(...candidates: (string | undefined | null)[]): string | null {
  for (const url of candidates) {
    if (isValidLogoUrl(url)) return url;
  }
  return null;
}

export function resolveLogoFromSet(
  logos: SMLogoSet,
  options?: {
    format?: string;
    brightness?: number;
  }
): string | null {
  const picked = selectLogoForFormat(logos, options?.format, options?.brightness);
  return firstValidLogoUrl(
    picked,
    logos.primary,
    logos.dark,
    logos.white,
    logos.symbol
  );
}

export function clientLogoProxyUrl(
  clientId: string,
  options?: { brightness?: number; format?: string }
): string {
  const params = new URLSearchParams();
  if (options?.brightness !== undefined) {
    params.set("brightness", String(Math.round(options.brightness)));
  }
  if (options?.format) params.set("format", options.format);
  const qs = params.toString();
  return withBasePath(`/api/sm/clients/${clientId}/logo/file${qs ? `?${qs}` : ""}`);
}
