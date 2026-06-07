import type { SMVisualApproachMode } from "@/types/sm";

export const APPROACH_LABELS: Record<
  SMVisualApproachMode,
  { label: string; description: string }
> = {
  concept_first: { label: "Concept First", description: "No product. Pure idea." },
  product_transformed: {
    label: "Product Transformed",
    description: "Product reimagined.",
  },
  product_hero: { label: "Product Hero", description: "Product as subject." },
  effects_visible: { label: "Effects Visible", description: "Show the impact." },
  visual_tension: { label: "Visual Tension", description: "Contradiction as idea." },
};
