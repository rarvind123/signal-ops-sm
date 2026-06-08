export type CornerPosition = "bottom-left" | "bottom-right" | "top-left" | "top-right";

export interface OverlayOptions {
  textPosition: "bottom" | "top";
  textSize: "sm" | "md" | "lg" | "xl";
  logoBg: "pill" | "none" | "circle";
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

export const DEFAULT_OVERLAY_OPTIONS: OverlayOptions = {
  textPosition: "bottom",
  textSize: "md",
  logoBg: "pill",
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

export function logoBgClass(
  logoBg: OverlayOptions["logoBg"],
  onSolidBand = false
): string {
  if (logoBg === "pill") {
    return onSolidBand
      ? "rounded-lg bg-white/95 px-2 py-1.5 shadow-sm"
      : "rounded-lg bg-white/80 backdrop-blur-sm px-2 py-1.5 shadow-md";
  }
  if (logoBg === "circle") {
    return onSolidBand
      ? "rounded-full bg-white/95 p-1.5 shadow-sm"
      : "rounded-full bg-white/80 backdrop-blur-sm p-1.5 shadow-md";
  }
  return "";
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
