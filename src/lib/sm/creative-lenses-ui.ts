import { SIGNALOPS_TM } from "@/lib/sm/ui";
import type { SMCreativeLens } from "@/types/sm";

export interface CreativeLensOption {
  id: SMCreativeLens;
  name: string;
  tagline: string;
  description: string;
}

export const CREATIVE_LENSES: CreativeLensOption[] = [
  {
    id: "signalops",
    name: SIGNALOPS_TM,
    tagline: "Default creative intelligence",
    description:
      "Balanced strategic direction — insight, emotion, and platform-native execution.",
  },
  {
    id: "human_truth",
    name: "The Big Idea",
    tagline: "Benefit-led. Research-driven. Built to last.",
    description:
      "Finds the single human truth that connects the brand's benefit to a universal desire. Ideas that could run for decades.",
  },
  {
    id: "brave_take",
    name: "The Brave Take",
    tagline: "Find the uncomfortable truth.",
    description:
      "Counter-cultural, identity-first. The work that's afraid of nothing — and makes brands stand for something real.",
  },
  {
    id: "category_breaker",
    name: "Category Breaker",
    tagline: "Work that scares you.",
    description:
      "The most provocative angle possible. Finds what makes the category boring — then breaks every convention in it.",
  },
  {
    id: "cultural_insider",
    name: "Cultural Insider",
    tagline: "The truth only an Indian can find.",
    description:
      "Deeply vernacular, locally rooted. Finds the Indian insight that only works because it's specifically, authentically Indian.",
  },
  {
    id: "behaviour_change",
    name: "The Science Lens",
    tagline: "Change what people do, not what they think.",
    description:
      "Rooted in behavioural science. Identifies the specific behaviour to change, then selects the psychological trigger that achieves it.",
  },
  {
    id: "craft_first",
    name: "Craft First",
    tagline: "The execution is the idea.",
    description:
      "Obsessive about craft. Every word, every visual choice, every structural decision is load-bearing. Simplicity achieved through precision, not laziness.",
  },
];
