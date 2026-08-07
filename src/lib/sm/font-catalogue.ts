export interface FontOption {
  id: string;
  label: string;
  family: string;
  weight: number;
  letterSpacing: string;
  textTransform: "uppercase" | "none";
  lineHeight: number;
  mood: string;
  googleUrl?: string;
}

export const FONT_CATALOGUE: FontOption[] = [
  {
    id: "bebas",
    label: "Bebas Neue",
    family: "Bebas Neue",
    weight: 400,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    lineHeight: 1.0,
    mood: "Bold · Impact",
    googleUrl: "https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap",
  },
  {
    id: "oswald",
    label: "Oswald",
    family: "Oswald",
    weight: 700,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    lineHeight: 1.0,
    mood: "Urgent · Strong",
    googleUrl: "https://fonts.googleapis.com/css2?family=Oswald:wght@700&display=swap",
  },
  {
    id: "anton",
    label: "Anton",
    family: "Anton",
    weight: 400,
    letterSpacing: "0.03em",
    textTransform: "uppercase",
    lineHeight: 0.95,
    mood: "Heavy · Poster",
    googleUrl: "https://fonts.googleapis.com/css2?family=Anton&display=swap",
  },
  {
    id: "cormorant",
    label: "Cormorant",
    family: "Cormorant Garamond",
    weight: 300,
    letterSpacing: "0.06em",
    textTransform: "none",
    lineHeight: 1.3,
    mood: "Premium · Luxury",
    googleUrl:
      "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400&display=swap",
  },
  {
    id: "playfair",
    label: "Playfair Display",
    family: "Playfair Display",
    weight: 700,
    letterSpacing: "0.01em",
    textTransform: "none",
    lineHeight: 1.2,
    mood: "Editorial · Classic",
    googleUrl: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&display=swap",
  },
  {
    id: "lora",
    label: "Lora",
    family: "Lora",
    weight: 400,
    letterSpacing: "0.01em",
    textTransform: "none",
    lineHeight: 1.4,
    mood: "Warm · Trustworthy",
    googleUrl: "https://fonts.googleapis.com/css2?family=Lora:wght@400;600&display=swap",
  },
  {
    id: "inter",
    label: "Inter",
    family: "Inter",
    weight: 600,
    letterSpacing: "-0.01em",
    textTransform: "none",
    lineHeight: 1.2,
    mood: "Professional · Clean",
    googleUrl: "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap",
  },
  {
    id: "dm-sans",
    label: "DM Sans",
    family: "DM Sans",
    weight: 700,
    letterSpacing: "-0.02em",
    textTransform: "none",
    lineHeight: 1.1,
    mood: "Playful · Modern",
    googleUrl: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@700&display=swap",
  },
  {
    id: "outfit",
    label: "Outfit",
    family: "Outfit",
    weight: 700,
    letterSpacing: "-0.01em",
    textTransform: "none",
    lineHeight: 1.15,
    mood: "Fresh · Contemporary",
    googleUrl: "https://fonts.googleapis.com/css2?family=Outfit:wght@700&display=swap",
  },
  {
    id: "syne",
    label: "Syne",
    family: "Syne",
    weight: 800,
    letterSpacing: "-0.02em",
    textTransform: "none",
    lineHeight: 1.05,
    mood: "Creative · Avant-garde",
    googleUrl: "https://fonts.googleapis.com/css2?family=Syne:wght@800&display=swap",
  },
  {
    id: "space-grotesk",
    label: "Space Grotesk",
    family: "Space Grotesk",
    weight: 700,
    letterSpacing: "-0.02em",
    textTransform: "none",
    lineHeight: 1.1,
    mood: "Tech · Distinctive",
    googleUrl: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700&display=swap",
  },
  {
    id: "fraunces",
    label: "Fraunces",
    family: "Fraunces",
    weight: 700,
    letterSpacing: "0.01em",
    textTransform: "none",
    lineHeight: 1.15,
    mood: "Artisan · Character",
    googleUrl: "https://fonts.googleapis.com/css2?family=Fraunces:wght@700&display=swap",
  },
];

export function getFontById(id: string): FontOption | undefined {
  return FONT_CATALOGUE.find((f) => f.id === id);
}

/** Tone / goal → suggested catalogue font for social creatives (UAT: font recommendation). */
export function recommendFontId(tone?: string | null, goal?: string | null): string {
  const t = (tone ?? "professional").toLowerCase();
  const g = (goal ?? "").toLowerCase();

  if (g === "offer" || g === "cta" || t === "urgent") return "oswald";
  if (t === "bold") return "bebas";
  if (t === "premium") return "cormorant";
  if (t === "warm") return "lora";
  if (t === "playful") return "dm-sans";
  if (g === "awareness" || g === "launch") return "outfit";
  if (t === "professional") return "inter";
  return "outfit";
}

export function getRecommendedFont(tone?: string | null, goal?: string | null): FontOption {
  const id = recommendFontId(tone, goal);
  return getFontById(id) ?? FONT_CATALOGUE[0];
}

export function loadGoogleFont(url: string): void {
  if (typeof document === "undefined") return;
  if (document.querySelector(`link[href="${url}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = url;
  document.head.appendChild(link);
}
