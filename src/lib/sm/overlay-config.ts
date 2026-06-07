import type { SMCreativeFormat } from "@/types/sm";

export interface OverlayConfig {
  gradientStyle: string | "none";
  containerClass: string;
  setupColor: string;
  punchColor: string;
  fontSize: { setup: string; punch: string };
  punchShadow: string;
  setupShadow: string;
}

export function getOverlayConfig(
  format?: SMCreativeFormat,
  punchWordCount = 5
): OverlayConfig {
  const socialPunch =
    punchWordCount <= 3
      ? "clamp(18px, 5.5cqi, 28px)"
      : punchWordCount <= 5
        ? "clamp(15px, 4.5cqi, 24px)"
        : punchWordCount <= 8
          ? "clamp(13px, 3.8cqi, 20px)"
          : "clamp(12px, 3.2cqi, 17px)";

  const socialSetup =
    punchWordCount <= 3 ? "clamp(11px, 2.8cqi, 15px)" : "clamp(11px, 2.6cqi, 14px)";

  switch (format) {
    case "print_ad":
      return {
        gradientStyle: "none",
        containerClass: "absolute bottom-0 left-0 right-0 bg-white px-8 py-6",
        setupColor: "#555555",
        punchColor: "#000000",
        fontSize: {
          setup: "clamp(11px, 2.2cqi, 16px)",
          punch: "clamp(16px, 4cqi, 26px)",
        },
        setupShadow: "none",
        punchShadow: "none",
      };
    case "outdoor":
      return {
        gradientStyle: "none",
        containerClass: "absolute bottom-0 left-0 right-0 px-8 pb-8",
        setupColor: "rgba(255,255,255,0.8)",
        punchColor: "white",
        fontSize: {
          setup: "clamp(14px, 3.5cqi, 22px)",
          punch: "clamp(22px, 7cqi, 48px)",
        },
        setupShadow: "0 1px 4px rgba(0,0,0,0.5)",
        punchShadow: "0 2px 8px rgba(0,0,0,0.7)",
      };
    default:
      return {
        gradientStyle:
          "linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.4) 45%, transparent 100%)",
        containerClass: "relative px-5 pb-5 pt-10",
        setupColor: "rgba(255,255,255,0.75)",
        punchColor: "white",
        fontSize: { setup: socialSetup, punch: socialPunch },
        setupShadow: "0 1px 3px rgba(0,0,0,0.5)",
        punchShadow: "0 1px 6px rgba(0,0,0,0.7)",
      };
  }
}
