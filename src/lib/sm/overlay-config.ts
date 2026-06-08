import { isColorReadableOnDark } from "@/lib/sm/typography";
import type { SMCreativeFormat, SMLayoutTemplate } from "@/types/sm";

export type LogoPosition = "top-right" | "top-left" | "bottom-right" | "bottom-left";

export interface OverlayConfig {
  gradientStyle: string | "none";
  containerClass: string;
  wrapperClass: string;
  gradientAnchor: "top" | "bottom" | "none";
  setupColor: string;
  punchColor: string;
  fontSize: { setup: string; punch: string };
  punchShadow: string;
  setupShadow: string;
  logoPosition: LogoPosition;
  bandColor?: string;
  bandPosition?: "bottom" | "left";
  imageClass: string;
  logoInBand: boolean;
}

function textColorsForBand(brandColor: string): { setup: string; punch: string } {
  const onDark = isColorReadableOnDark(brandColor);
  return {
    setup: onDark ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.65)",
    punch: onDark ? "#ffffff" : "#000000",
  };
}

function socialFontSizes(punchWordCount: number): { setup: string; punch: string } {
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

function layoutOverlayConfig(
  layoutTemplate: SMLayoutTemplate,
  brandColor: string,
  punchWordCount: number
): OverlayConfig {
  const fontSize = socialFontSizes(punchWordCount);
  const bandText = textColorsForBand(brandColor);

  switch (layoutTemplate) {
    case "brand_band_bottom":
      return {
        gradientStyle: "none",
        wrapperClass: "absolute bottom-0 left-0 right-0 h-[35%]",
        containerClass: "relative flex h-full flex-col justify-center px-5",
        gradientAnchor: "none",
        setupColor: bandText.setup,
        punchColor: bandText.punch,
        fontSize,
        setupShadow: "none",
        punchShadow: "none",
        logoPosition: "bottom-right",
        bandColor: brandColor,
        bandPosition: "bottom",
        imageClass: "absolute inset-x-0 top-0 h-[65%] w-full object-cover",
        logoInBand: true,
      };

    case "brand_band_left":
      return {
        gradientStyle: "none",
        wrapperClass: "absolute top-0 left-0 bottom-0 w-2/5",
        containerClass: "relative flex h-full flex-col justify-end p-4",
        gradientAnchor: "none",
        setupColor: bandText.setup,
        punchColor: bandText.punch,
        fontSize,
        setupShadow: "none",
        punchShadow: "none",
        logoPosition: "bottom-left",
        bandColor: brandColor,
        bandPosition: "left",
        imageClass: "absolute top-0 right-0 bottom-0 w-3/5 object-cover",
        logoInBand: true,
      };

    case "type_forward":
      return {
        gradientStyle:
          "linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.4) 45%, transparent 100%)",
        wrapperClass: "absolute top-0 left-0 right-0 h-1/2",
        containerClass: "relative px-5 pt-5",
        gradientAnchor: "top",
        setupColor: "rgba(255,255,255,0.75)",
        punchColor: "white",
        fontSize,
        setupShadow: "0 1px 3px rgba(0,0,0,0.5)",
        punchShadow: "0 1px 6px rgba(0,0,0,0.7)",
        logoPosition: "top-right",
        imageClass: "absolute bottom-0 left-0 right-0 h-1/2 w-full object-cover",
        logoInBand: false,
      };

    case "full_bleed_top_text":
      return {
        gradientStyle:
          "linear-gradient(to bottom, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.35) 40%, transparent 100%)",
        wrapperClass: "absolute top-0 left-0 right-0",
        containerClass: "relative px-5 pt-5",
        gradientAnchor: "top",
        setupColor: "rgba(255,255,255,0.75)",
        punchColor: "white",
        fontSize,
        setupShadow: "0 1px 3px rgba(0,0,0,0.5)",
        punchShadow: "0 1px 6px rgba(0,0,0,0.7)",
        logoPosition: "bottom-right",
        imageClass: "h-full w-full object-cover",
        logoInBand: false,
      };

    default:
      return {
        gradientStyle:
          "linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.4) 45%, transparent 100%)",
        wrapperClass: "absolute bottom-0 left-0 right-0",
        containerClass: "relative px-5 pb-5 pt-10",
        gradientAnchor: "bottom",
        setupColor: "rgba(255,255,255,0.75)",
        punchColor: "white",
        fontSize,
        setupShadow: "0 1px 3px rgba(0,0,0,0.5)",
        punchShadow: "0 1px 6px rgba(0,0,0,0.7)",
        logoPosition: "top-right",
        imageClass: "h-full w-full object-cover",
        logoInBand: false,
      };
  }
}

export function getOverlayConfig(
  format?: SMCreativeFormat,
  punchWordCount = 5,
  layoutTemplate?: SMLayoutTemplate,
  brandColor?: string | null
): OverlayConfig {
  const fontSize = socialFontSizes(punchWordCount);

  switch (format) {
    case "print_ad":
      return {
        gradientStyle: "none",
        wrapperClass: "absolute bottom-0 left-0 right-0",
        containerClass: "bg-white px-8 py-6",
        gradientAnchor: "none",
        setupColor: "#555555",
        punchColor: "#000000",
        fontSize: {
          setup: "clamp(11px, 2.2cqi, 16px)",
          punch: "clamp(16px, 4cqi, 26px)",
        },
        setupShadow: "none",
        punchShadow: "none",
        logoPosition: "top-right",
        imageClass: "h-full w-full object-cover",
        logoInBand: false,
      };
    case "outdoor":
      return {
        gradientStyle: "none",
        wrapperClass: "absolute bottom-0 left-0 right-0",
        containerClass: "px-8 pb-8",
        gradientAnchor: "none",
        setupColor: "rgba(255,255,255,0.8)",
        punchColor: "white",
        fontSize: {
          setup: "clamp(14px, 3.5cqi, 22px)",
          punch: "clamp(22px, 7cqi, 48px)",
        },
        setupShadow: "0 1px 4px rgba(0,0,0,0.5)",
        punchShadow: "0 2px 8px rgba(0,0,0,0.7)",
        logoPosition: "top-right",
        imageClass: "h-full w-full object-cover",
        logoInBand: false,
      };
    default:
      if (layoutTemplate && brandColor) {
        return layoutOverlayConfig(layoutTemplate, brandColor, punchWordCount);
      }
      return layoutOverlayConfig("full_bleed_gradient", brandColor ?? "#1a1a1a", punchWordCount);
  }
}
