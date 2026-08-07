import type { SMClient, SMSignalOpsOutput } from "@/types/sm";
import {
  mustIncludeRequestsHands,
  rewriteFluxSceneForSafety,
} from "@/lib/sm/flux-safety-rewrite";
import { sceneMustIncludeClause } from "@/lib/sm/must-include";
import { layoutRequiresHeadline } from "@/lib/sm/layout-utils";

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

export type BuildFluxPromptOptions = {
  /** When true, lock lighting/palette/mood to the attached reference images. */
  hasReferenceImages?: boolean;
  /** User-uploaded reference — match composition and metaphor first */
  hasUserReference?: boolean;
  /** Agency style brief from visual research / vision pass */
  styleBrief?: string | null;
};

function mergeConceptCore(
  sceneDescription: string | undefined,
  visualDirection: string | undefined
): string {
  const scene = sceneDescription?.trim() ?? "";
  const direction = visualDirection?.trim() ?? "";
  if (scene && direction) {
    // Prefer scene for the shot; keep direction so approved strategy (lighting, shadow twist) isn't dropped.
    if (scene.toLowerCase().includes(direction.slice(0, 40).toLowerCase())) {
      return scene;
    }
    return `${scene} Lighting, mood, and visual metaphor must follow: ${direction}`;
  }
  return scene || direction;
}

export function buildFluxPrompt(
  signalops: SMSignalOpsOutput,
  _client: SMClient,
  mustInclude?: string | null,
  options?: BuildFluxPromptOptions
): string {
  const { visual_approach: approach, color_recommendation, be_trigger } = signalops;

  const rawCore = options?.hasUserReference
    ? "Follow the user-uploaded reference image for subject, pose, composition, lighting, and shadow treatment. Strategy text below is secondary — do not contradict the reference pixels."
    : mergeConceptCore(approach.scene_description, signalops.visual_direction);

  const { text: conceptCore } = rewriteFluxSceneForSafety(
    rawCore,
    approach.impossible_element,
    mustInclude
  );

  const copyDep = approach.copy_dependency ?? 3;
  const layoutNeedsHeadline = layoutRequiresHeadline(signalops.layout_template);

  const compositionGuide =
    layoutNeedsHeadline
      ? "Upper half open, clean, high contrast for headline typography. Subject and visual proof occupy lower half."
      : copyDep <= 2
        ? "Subject fills 80% of frame. No space reserved for text — the image needs none."
        : copyDep <= 3
          ? "Subject fills upper 65% of frame. Lower 30% naturally dark or blurred — space for minimal text."
          : "Subject in upper-left two-thirds. Right side or bottom third open with soft background — space for headline.";

  const productNote =
    approach.product_placement === "corner_stamp"
      ? "No product packaging in frame. Real brand asset is overlaid after generation."
      : "No product packaging in frame. No product of any kind in the scene.";

  const handsAllowed = mustIncludeRequestsHands(mustInclude);
  const clicheBan = handsAllowed
    ? "No stock photo clichés: no smiling people looking at camera, no white seamless background."
    : "No stock photo clichés: no hands holding product, no smiling people looking at camera, no white seamless background.";

  const mandatoryLead = sceneMustIncludeClause(mustInclude);

  const triggerLine = be_trigger?.application?.trim()
    ? `Psychological strategy (express visually, not as text): ${be_trigger.application.trim()}`
    : be_trigger?.primary?.trim()
      ? `Psychological strategy (express visually, not as text): ${be_trigger.primary.trim()}`
      : null;

  const referenceStyle = options?.hasUserReference
    ? "The attached image IS the user's reference. Reproduce its exact composition, pose, wardrobe, lighting, and visual metaphor. Do not invent a different scene or stock yoga look."
    : options?.hasReferenceImages
      ? "Match the attached reference image(s) for lighting quality, color grade, lens feel, wardrobe realism, and overall photographic mood. Preserve naturalistic shadows and light — no neon glow silhouettes, no CGI overlays, no corporate stock look. Do not copy or reproduce any text from the reference."
      : null;

  const researchStyle = options?.styleBrief?.trim()
    ? `AGENCY STYLE BRIEF (lock to this craft level): ${options.styleBrief.trim()}`
    : null;

  // Avoid fighting a specific strategy lighting direction with generic "studio light".
  const lightingLine = options?.hasReferenceImages || researchStyle
    ? "Photorealistic. Naturalistic light consistent with the style brief and references."
    : "Photorealistic editorial photography. Natural window light preferred over flat studio kits. Shot on medium format film.";

  return [
    mandatoryLead,
    researchStyle,
    referenceStyle,
    approach.impossible_element && !options?.hasUserReference
      ? `Impossible element (must be visible): ${approach.impossible_element}.`
      : options?.hasUserReference && approach.impossible_element
        ? `Reference metaphor (preserve from upload): ${approach.impossible_element}.`
        : null,
    triggerLine,
    conceptCore,
    compositionGuide,
    productNote,
    FLUX_PRODUCT_EXCLUSIONS,
    lightingLine,
    "No text on any surface. No numbers. No words. No dates. No signage with readable text. No fee, price, or location lettering.",
    clicheBan,
    color_recommendation ? `Colour palette: ${color_recommendation}.` : null,
  ]
    .filter(Boolean)
    .join(" ");
}
