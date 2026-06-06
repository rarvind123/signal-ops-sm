import type { SMTone } from "@/types/sm";

export interface TypographyStyle {
  fontFamily: string;
  fontWeight: number;
  letterSpacing: string;
  textTransform: "uppercase" | "none";
  lineHeight: number;
  googleFontsUrl: string;
}

export const TONE_TYPOGRAPHY: Record<SMTone, TypographyStyle> = {
  bold: {
    fontFamily: "Bebas Neue",
    fontWeight: 400,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    lineHeight: 1.0,
    googleFontsUrl: "https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap",
  },
  premium: {
    fontFamily: "Cormorant Garamond",
    fontWeight: 300,
    letterSpacing: "0.08em",
    textTransform: "none",
    lineHeight: 1.2,
    googleFontsUrl:
      "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400&display=swap",
  },
  warm: {
    fontFamily: "Lora",
    fontWeight: 400,
    letterSpacing: "0.01em",
    textTransform: "none",
    lineHeight: 1.3,
    googleFontsUrl: "https://fonts.googleapis.com/css2?family=Lora:wght@400;500&display=swap",
  },
  playful: {
    fontFamily: "DM Sans",
    fontWeight: 700,
    letterSpacing: "-0.02em",
    textTransform: "none",
    lineHeight: 1.1,
    googleFontsUrl: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700&display=swap",
  },
  professional: {
    fontFamily: "Inter",
    fontWeight: 600,
    letterSpacing: "-0.01em",
    textTransform: "none",
    lineHeight: 1.2,
    googleFontsUrl: "https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap",
  },
  urgent: {
    fontFamily: "Oswald",
    fontWeight: 700,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    lineHeight: 1.0,
    googleFontsUrl: "https://fonts.googleapis.com/css2?family=Oswald:wght@600;700&display=swap",
  },
};

export function getTypography(tone?: SMTone): TypographyStyle {
  return TONE_TYPOGRAPHY[tone ?? "professional"];
}
