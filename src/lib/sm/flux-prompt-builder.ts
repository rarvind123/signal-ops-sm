import type { SMClient, SMSignalOpsOutput } from "@/types/sm";

export function buildFluxPrompt(
  signalops: SMSignalOpsOutput,
  client: SMClient
): string {
  const { visual_approach: approach, color_recommendation } = signalops;

  const conceptCore = approach.scene_description?.trim()
    ? approach.scene_description.trim()
    : signalops.visual_direction;

  const copyDep = approach.copy_dependency ?? 3;

  const compositionGuide =
    copyDep <= 2
      ? "Subject fills 80% of frame. No space reserved for text — the image needs none."
      : copyDep <= 3
        ? "Subject fills upper 65% of frame. Lower 30% naturally dark or blurred — space for minimal text."
        : "Subject in upper-left two-thirds. Right side or bottom third open with soft background — space for headline.";

  const productNote =
    approach.product_placement === "in_scene"
      ? `${client.name} product appears naturally in the scene as described above.`
      : "No product packaging in frame.";

  return [
    approach.impossible_element
      ? `Impossible element (must be visible): ${approach.impossible_element}.`
      : null,
    conceptCore,
    compositionGuide,
    productNote,
    "Commercial photography. 50mm lens equivalent. Natural or single-source studio light.",
    "No text on any surface. No numbers. No words. No dates. No signage with readable text.",
    "No stock photo clichés: no hands holding product, no smiling people looking at camera, no white seamless background.",
    "Photorealistic. Shot on medium format film.",
    color_recommendation ? `Colour palette: ${color_recommendation}.` : null,
  ]
    .filter(Boolean)
    .join(" ");
}
