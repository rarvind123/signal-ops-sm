import type { SMOverlaySettings } from "@/types/sm";

export type CornerPosition = "bottom-left" | "bottom-right" | "top-left" | "top-right";
export type SMLogoStyle = "box" | "shadow" | "plain" | "none";

export interface OverlayOptions {
  textPosition: "bottom" | "top";
  textSize: "sm" | "md" | "lg" | "xl";
  logoStyle: SMLogoStyle;
  logoSize: "sm" | "md" | "lg" | "xl";
  extraText: string;
  extraTextPosition: "bottom-left" | "bottom-right" | "bottom-center";
  showExtraText: boolean;
  qrUrl: string;
  qrPosition: CornerPosition;
  showQr: boolean;
  pipImageUrl: string | null;
  pipPosition: CornerPosition;
  pipSize: "sm" | "md" | "lg";
  showPip: boolean;
}

function migrateLogoStyle(settings: SMOverlaySettings): SMLogoStyle {
  if (settings.logo_style) return settings.logo_style;
  const legacy = settings.logo_background;
  if (legacy === "pill" || legacy === "circle") return "box";
  if (legacy === "none") return "shadow";
  return DEFAULT_OVERLAY_OPTIONS.logoStyle;
}

export function overlaySettingsFromOptions(
  options: OverlayOptions
): SMOverlaySettings {
  return {
    typography_position: options.textPosition,
    typography_size: options.textSize,
    logo_style: options.logoStyle,
    logo_size: options.logoSize,
    extra_text_enabled: options.showExtraText,
    extra_text_content: options.extraText,
    extra_text_position: options.extraTextPosition,
    qr_enabled: options.showQr,
    qr_url: options.qrUrl,
    qr_position: options.qrPosition,
    pip_enabled: options.showPip,
    pip_url: options.pipImageUrl,
    pip_position: options.pipPosition,
    pip_size: options.pipSize,
  };
}

export function overlayOptionsFromSettings(
  settings?: SMOverlaySettings | null
): OverlayOptions {
  if (!settings || Object.keys(settings).length === 0) {
    return DEFAULT_OVERLAY_OPTIONS;
  }
  return {
    textPosition: settings.typography_position ?? DEFAULT_OVERLAY_OPTIONS.textPosition,
    textSize: settings.typography_size ?? DEFAULT_OVERLAY_OPTIONS.textSize,
    logoStyle: migrateLogoStyle(settings),
    logoSize: settings.logo_size ?? DEFAULT_OVERLAY_OPTIONS.logoSize,
    showExtraText: settings.extra_text_enabled ?? DEFAULT_OVERLAY_OPTIONS.showExtraText,
    extraText: settings.extra_text_content ?? DEFAULT_OVERLAY_OPTIONS.extraText,
    extraTextPosition:
      settings.extra_text_position ?? DEFAULT_OVERLAY_OPTIONS.extraTextPosition,
    showQr: settings.qr_enabled ?? DEFAULT_OVERLAY_OPTIONS.showQr,
    qrUrl: settings.qr_url ?? DEFAULT_OVERLAY_OPTIONS.qrUrl,
    qrPosition: settings.qr_position ?? DEFAULT_OVERLAY_OPTIONS.qrPosition,
    showPip: settings.pip_enabled ?? DEFAULT_OVERLAY_OPTIONS.showPip,
    pipImageUrl: settings.pip_url ?? DEFAULT_OVERLAY_OPTIONS.pipImageUrl,
    pipPosition: settings.pip_position ?? DEFAULT_OVERLAY_OPTIONS.pipPosition,
    pipSize: settings.pip_size ?? DEFAULT_OVERLAY_OPTIONS.pipSize,
  };
}

export const DEFAULT_OVERLAY_OPTIONS: OverlayOptions = {
  textPosition: "bottom",
  textSize: "md",
  logoStyle: "box",
  logoSize: "md",
  extraText: "",
  extraTextPosition: "bottom-center",
  showExtraText: false,
  qrUrl: "",
  qrPosition: "bottom-right",
  showQr: false,
  pipImageUrl: null,
  pipPosition: "bottom-right",
  pipSize: "sm",
  showPip: false,
};

export const LOGO_SIZE_PX: Record<OverlayOptions["logoSize"], number> = {
  sm: 28,
  md: 44,
  lg: 62,
  xl: 84,
};

export const TEXT_SIZE_MAP: Record<
  OverlayOptions["textSize"],
  { setup: string; punch: string }
> = {
  sm: { setup: "clamp(10px, 2.2cqi, 13px)", punch: "clamp(12px, 3cqi, 16px)" },
  md: { setup: "clamp(11px, 2.8cqi, 15px)", punch: "clamp(14px, 4.5cqi, 24px)" },
  lg: { setup: "clamp(13px, 3.5cqi, 18px)", punch: "clamp(18px, 5.5cqi, 30px)" },
  xl: { setup: "clamp(15px, 4cqi, 20px)", punch: "clamp(22px, 7cqi, 38px)" },
};

export const TEXT_SIZE_PX: Record<
  OverlayOptions["textSize"],
  { setup: number; punch: number }
> = {
  sm: { setup: 13, punch: 16 },
  md: { setup: 15, punch: 24 },
  lg: { setup: 18, punch: 30 },
  xl: { setup: 20, punch: 38 },
};

export const PIP_SIZE_CLASS: Record<OverlayOptions["pipSize"], string> = {
  sm: "w-20 h-20",
  md: "w-28 h-28",
  lg: "w-36 h-36",
};

export const PIP_SIZE_PX: Record<OverlayOptions["pipSize"], number> = {
  sm: 120,
  md: 170,
  lg: 220,
};

export const CORNER_CLASSES: Record<CornerPosition, string> = {
  "bottom-right": "bottom-10 right-3",
  "bottom-left": "bottom-10 left-3",
  "top-right": "top-12 right-3",
  "top-left": "top-12 left-3",
};

export function logoWrapperClass(
  logoStyle: SMLogoStyle,
  onSolidBand = false
): string {
  if (logoStyle === "box") {
    return onSolidBand
      ? "rounded-full bg-white/95 px-3 py-1.5"
      : "rounded-full bg-white/90 backdrop-blur-sm px-3 py-1.5";
  }
  return "";
}

export function logoWrapperStyle(
  logoStyle: SMLogoStyle
): { filter?: string } | undefined {
  if (logoStyle === "shadow") {
    return { filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.65))" };
  }
  return undefined;
}

export function logoImgStyle(logoSize: OverlayOptions["logoSize"]): {
  height: number;
  width: string;
  display: string;
} {
  return {
    height: LOGO_SIZE_PX[logoSize],
    width: "auto",
    display: "block",
  };
}

export function cornerCoords(
  position: CornerPosition,
  width: number,
  height: number,
  size: number,
  pad = 30,
  verticalOffset = 80
): { top: number; left: number } {
  const top = position.startsWith("bottom")
    ? height - size - pad - verticalOffset
    : pad + 50;
  const left = position.endsWith("right") ? width - size - pad : pad;
  return { top: Math.max(0, top), left: Math.max(0, left) };
}
