import type { SMCreativeFormat } from "@/types/sm";

export interface CreativeFormatOption {
  id: SMCreativeFormat;
  label: string;
  description: string;
  icon: string;
  available: boolean;
  comingSoonLabel?: string;
}

export const CREATIVE_FORMATS: CreativeFormatOption[] = [
  {
    id: "social_media",
    label: "Social Media Creatives",
    description: "Instagram, LinkedIn, Facebook, X — platform-native posts with copy.",
    icon: "📱",
    available: true,
  },
  {
    id: "print_ad",
    label: "Print Ad",
    description: "Newspaper, magazine, or poster. Craft-first. Built to last on paper.",
    icon: "🗞️",
    available: true,
  },
  {
    id: "outdoor",
    label: "Outdoor Creatives",
    description: "Billboards, transit, OOH. One idea. Read in 3 seconds at 60km/h.",
    icon: "🪧",
    available: true,
  },
  {
    id: "tv_script",
    label: "TV Script",
    description: "30 or 60 second scripts with scene direction, dialogue, and SFX notes.",
    icon: "🎬",
    available: true,
  },
  {
    id: "social_video",
    label: "Social Media Videos",
    description: "Reels, Shorts, TikTok. Motion-first creative.",
    icon: "🎥",
    available: false,
    comingSoonLabel: "Coming soon",
  },
  {
    id: "pitch_deck",
    label: "Pitch Presentation",
    description: "Investor and client presentations powered by SignalOps.",
    icon: "📊",
    available: false,
    comingSoonLabel: "Coming soon",
  },
];

export function getFormatLabel(id: SMCreativeFormat | undefined): string {
  return CREATIVE_FORMATS.find((f) => f.id === (id ?? "social_media"))?.label ?? "Creative Engine";
}
