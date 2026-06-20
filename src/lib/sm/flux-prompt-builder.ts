import type { SMClient, SMSignalOpsOutput } from "@/types/sm";
import { rewriteFluxSceneForSafety } from "@/lib/sm/flux-safety-rewrite";

/** Permanent FLUX exclusions — FLUX must never render brand products (hallucinated packaging). */
export const FLUX_PRODUCT_EXCLUSIONS = [
  "no product packaging",
  "no product tubes",
  "no product tins",
  "no product bottles",
  "no product containers",
  "no brand packaging",
  "no labeled products",
  "no product shots",
  "no merchandise",
].join(", ");

export function buildFluxPrompt(
  signalops: SMSignalOpsOutput,
  client: SMClient
): string {
  const { visual_approach: approach, color_recommendation } = signalops;

  const rawCore = approach.scene_description?.trim()
    ? approach.scene_description.trim()
    : signalops.visual_direction;

  const { text: conceptCore } = rewriteFluxSceneForSafety(
    rawCore,
    approach.impossible_element
  );

  const copyDep = approach.copy_dependency ?? 3;

  const compositionGuide =
    copyDep <= 2
      ? "Subject fills 80% of frame. No space reserved for text — the image needs none."
      : copyDep <= 3
        ? "Subject fills upper 65% of frame. Lower 30% naturally dark or blurred — space for minimal text."
        : "Subject in upper-left two-thirds. Right side or bottom third open with soft background — space for headline.";

  const productNote =
    approach.product_placement === "corner_stamp"
      ? "No product packaging in frame. Real brand asset is overlaid after generation."
      : "No product packaging in frame. No product of any kind in the scene.";

  return [
    approach.impossible_element
      ? `Impossible element (must be visible): ${approach.impossible_element}.`
      : null,
    conceptCore,
    compositionGuide,
    productNote,
    FLUX_PRODUCT_EXCLUSIONS,
    "Commercial photography. 50mm lens equivalent. Natural or single-source studio light.",
    "No text on any surface. No numbers. No words. No dates. No signage with readable text.",
    "No stock photo clichés: no hands holding product, no smiling people looking at camera, no white seamless background.",
    "Photorealistic. Shot on medium format film.",
    color_recommendation ? `Colour palette: ${color_recommendation}.` : null,
  ]
    .filter(Boolean)
    .join(" ");
}
