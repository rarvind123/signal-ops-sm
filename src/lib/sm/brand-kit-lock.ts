import type { SMClient, SMOverlaySettings } from "@/types/sm";
import { recommendFontId } from "@/lib/sm/font-catalogue";
import type { OverlayOptions } from "@/lib/sm/overlay-options";

export function brandKitLocked(client: SMClient): boolean {
  return client.has_brand_kit === true;
}

export function lockedFontId(
  client: SMClient,
  fallbackTone?: string | null,
  fallbackGoal?: string | null
): string | null {
  if (!brandKitLocked(client)) {
    return recommendFontId(fallbackTone ?? client.tone, fallbackGoal);
  }
  if (client.font_primary) return null;
  return recommendFontId(client.tone, fallbackGoal);
}

export function enforceBrandKitOverlay(
  client: SMClient,
  overlay: SMOverlaySettings,
  goal?: string | null
): SMOverlaySettings {
  if (!brandKitLocked(client)) return overlay;
  return {
    ...overlay,
    selected_font_id: lockedFontId(client, client.tone, goal),
    extra_text_enabled: overlay.extra_text_enabled ?? false,
  };
}

export function enforceBrandKitOverlayOptions(
  client: SMClient,
  options: OverlayOptions,
  goal?: string | null
): OverlayOptions {
  if (!brandKitLocked(client)) return options;
  return {
    ...options,
    selectedFontId: lockedFontId(client, client.tone, goal),
  };
}

export function brandKitColorDirective(client: SMClient): string | null {
  if (!brandKitLocked(client)) return null;
  const p = client.color_palette ?? {};
  const colors = [p.primary, p.secondary, p.accent, p.background, p.text].filter(Boolean);
  if (colors.length) {
    return `STRICT brand colours only: ${colors.join(", ")}. Do not introduce off-brand hues.`;
  }
  if (client.brand_colors?.length) {
    return `STRICT brand colours only: ${client.brand_colors.map((c) => c.hex).join(", ")}.`;
  }
  return null;
}
