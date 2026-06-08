import { completeJson } from "@/lib/ai";
import { getAdSize } from "@/lib/sm/ad-sizes";
import { buildFluxPrompt } from "@/lib/sm/flux-prompt-builder";
import { getBrandAccentColor } from "@/lib/sm/typography";
import type {
  SMClient,
  SMAssetType,
  SMCreativeFormat,
  SMCreativeRequest,
  SMGoal,
  SMLayoutTemplate,
  SMPlatform,
  SMSignalOpsOutput,
  SMVisualApproachMode,
} from "@/types/sm";

const PORTRAIT_COMPOSITION_RULE =
  "vertical portrait composition 4:5 aspect ratio, subject positioned center-frame filling majority of vertical space, natural breathing room in upper and lower thirds";

function layoutCompositionNote(layout?: SMLayoutTemplate): string {
  switch (layout) {
    case "brand_band_bottom":
      return "vertical portrait, subject fills top 65% of frame, bottom 35% is deliberately clean and simple — minimal visual detail in the lower section";
    case "brand_band_left":
      return "subject positioned in the right 60% of frame, left 40% should have soft background with minimal detail — space for text column";
    case "type_forward":
      return "minimal scene, clean background, subject small or partial in lower half — upper half is open, clean, high contrast";
    case "full_bleed_top_text":
      return "vertical portrait, strongest visual element in the lower 60% of frame, upper 40% is relatively open sky or background — text will sit at top";
    default:
      return "vertical portrait, subject anchored in the middle-to-upper frame, clear negative space in the lower third for text overlay";
  }
}

export const PLATFORM_SPECS: Record<
  SMPlatform,
  Record<SMAssetType, { w: number; h: number } | null>
> = {
  instagram: {
    post: { w: 1080, h: 1080 },
    story: { w: 1080, h: 1920 },
    reel_cover: { w: 1080, h: 1920 },
    banner: null,
  },
  linkedin: {
    post: { w: 1200, h: 627 },
    story: null,
    reel_cover: null,
    banner: { w: 1584, h: 396 },
  },
  facebook: {
    post: { w: 1200, h: 630 },
    story: { w: 1080, h: 1920 },
    reel_cover: null,
    banner: { w: 820, h: 312 },
  },
  twitter: {
    post: { w: 1600, h: 900 },
    story: null,
    reel_cover: null,
    banner: { w: 1500, h: 500 },
  },
  youtube: {
    post: null,
    story: null,
    reel_cover: { w: 1280, h: 720 },
    banner: { w: 2560, h: 1440 },
  },
};

const VISUAL_APPROACH_INSTRUCTIONS: Record<string, string> = {
  concept_first: [
    "absolutely no product visible in the image",
    "no product packaging or containers",
    "the brand is communicated entirely through the scene and metaphor",
    "the image should make sense as a standalone scene",
    "no brand marks or logos rendered in the image",
  ].join(", "),

  product_transformed: [
    "the product appears but in a conceptual, impossible, or unexpected way",
    "the product is reimagined as something else or placed in an impossible context",
    "high-end surrealist commercial photography",
    "the transformation should feel both surprising and inevitable",
  ].join(", "),

  product_hero: [
    "the product is the primary subject of the image",
    "dramatic product photography, the environment serves the product",
    "high-end commercial photography quality",
    "the product occupies at least 40% of the frame",
    "beautiful lighting that makes the product look premium",
  ].join(", "),

  effects_visible: [
    "absolutely no product visible",
    "show the human emotional or physical effect of using the brand",
    "the scene shows a person or environment transformed by the brand's benefit",
    "authentic, unposed, emotionally true",
    "the viewer should feel the benefit before they understand the brand",
  ].join(", "),

  visual_tension: [
    "create a visual that combines two contradictory or incompatible elements",
    "the impossibility or contradiction should be immediately visible",
    "no product unless it is part of the tension",
    "clean, minimal composition — the tension is the entire point",
    "the image should stop a viewer and demand a second look",
  ].join(", "),
};

const UNIVERSAL_EXCLUSIONS = [
  "absolutely no text of any kind",
  "no numbers",
  "no digits",
  "no dates or years",
  "no words written on any surface",
  "no chalkboard writing",
  "no signs with text",
  "no labels with text",
  "no watermarks",
  "no logos in the generated image",
  "no brand marks",
].join(", ");

export function buildBriefImagePrompt(
  sceneDescription: string,
  visualApproachMode: SMVisualApproachMode = "concept_first",
  platform: SMPlatform = "instagram"
): string {
  const modeInstructions =
    VISUAL_APPROACH_INSTRUCTIONS[visualApproachMode] ??
    VISUAL_APPROACH_INSTRUCTIONS.concept_first;

  const compositionNote =
    platform === "linkedin"
      ? "wide landscape composition, professional setting"
      : "bold central subject, clear negative space at bottom third";

  const parts = [
    sceneDescription,
    PORTRAIT_COMPOSITION_RULE,
    compositionNote,
    modeInstructions,
    "ultra high quality commercial photography",
    "sharp focus",
    "professional studio or location lighting",
    "8k resolution",
    "premium advertising aesthetic",
    UNIVERSAL_EXCLUSIONS,
  ]
    .filter(Boolean)
    .join(", ");

  return parts.replace(/\s+/g, " ").trim().slice(0, 3800);
}

const PHOTO_STYLE_MAP: Record<string, string> = {
  lifestyle:
    "lifestyle photography with real people in natural settings, candid and authentic",
  product:
    "clean product photography, controlled lighting, professional studio quality",
  minimal: "minimal composition, generous white space, restrained and deliberate",
  documentary: "documentary-style photography, raw and real, no posing",
  illustrated: "graphic illustration style, not photorealistic",
  premium: "high-end luxury photography, impeccable lighting, aspirational",
};

function typographyZoneForFormat(creativeFormat?: SMCreativeFormat): string {
  if (!creativeFormat || creativeFormat === "social_media") {
    return "clear negative space in the lower third for headline overlay";
  }
  if (creativeFormat === "print_ad") {
    return "clean white band at the bottom 20% of the image — completely clear, no visual elements — reserved for headline typography";
  }
  if (creativeFormat === "outdoor") {
    return "massive clear zone on one side (left or right) — at minimum 40% of the frame must be clean solid colour for OOH headline placement";
  }
  return "clear space for headline overlay";
}

function colorContextForClient(client: SMClient, signalops: SMSignalOpsOutput): string {
  const p = client.color_palette ?? {};
  const accent = getBrandAccentColor(client);
  if (p.primary || accent) {
    const colors = [p.primary, p.secondary, p.accent ?? accent].filter(Boolean);
    return `dominant colour palette: ${colors.join(", ")}`;
  }
  if (client.brand_colors?.length) {
    return `colour palette: ${client.brand_colors.map((c) => c.hex).join(", ")}`;
  }
  return signalops.color_recommendation;
}

function adSizeCompositionNote(
  request?: Pick<SMCreativeRequest, "ad_size_id" | "creative_format">
): string | null {
  if (!request?.ad_size_id || !request.creative_format) return null;
  const size = getAdSize(request.creative_format, request.ad_size_id);
  return size ? size.composition_note : null;
}

function visualConstraintsForRequest(
  request?: Pick<SMCreativeRequest, "must_include" | "must_exclude">
): string {
  const excludeRule = request?.must_exclude
    ? [request.must_exclude, "no hands (unless explicitly required above)"].join(", ")
    : "no hands (unless explicitly required by the brief)";

  return [
    request?.must_include ? `MUST INCLUDE: ${request.must_include}` : null,
    excludeRule,
  ]
    .filter(Boolean)
    .join(", ");
}

export function buildImageGenerationPrompt(
  client: SMClient,
  signalops: SMSignalOpsOutput,
  platform: SMPlatform,
  assetType: SMAssetType,
  _headline: string,
  creativeFormat?: SMCreativeFormat,
  request?: Pick<
    SMCreativeRequest,
    "must_include" | "must_exclude" | "ad_size_id" | "creative_format"
  >
): string {
  const approach = signalops.visual_approach;
  const modeInstructions =
    VISUAL_APPROACH_INSTRUCTIONS[approach?.mode ?? "concept_first"];

  const photoStyle = client.photo_style
    ? PHOTO_STYLE_MAP[client.photo_style]
    : "professional commercial photography";

  const isVertical =
    assetType === "story" ||
    assetType === "reel_cover" ||
    (platform === "instagram" && assetType === "post");

  const copyDep = approach?.copy_dependency ?? 3;
  const compositionNote = isVertical
    ? copyDep <= 2
      ? "vertical portrait, subject fills entire frame, no reserved text zones"
      : layoutCompositionNote(signalops.layout_template)
    : platform === "linkedin"
      ? "wide landscape composition, professional setting"
      : "bold central subject, clear negative space at bottom third";

  const portraitRule = isVertical ? PORTRAIT_COMPOSITION_RULE : null;

  const fluxCore = buildFluxPrompt(signalops, client);

  const parts = [
    fluxCore,
    portraitRule,
    colorContextForClient(client, signalops),
    photoStyle,
    typographyZoneForFormat(creativeFormat),
    adSizeCompositionNote(request),
    compositionNote,
    modeInstructions,
    visualConstraintsForRequest(request),
    "ultra high quality",
    "sharp focus",
    "8k resolution",
    UNIVERSAL_EXCLUSIONS,
    approach?.product_placement === "none" ? "no product packaging" : null,
    approach?.product_placement === "none" ? "no tins or bottles" : null,
  ]
    .filter(Boolean)
    .join(", ");

  return parts.replace(/\s+/g, " ").trim().slice(0, 3800);
}

export async function generateCopyForPlatform(
  client: SMClient,
  signalops: SMSignalOpsOutput,
  platform: SMPlatform,
  goal: string,
  headline: string
): Promise<{ caption: string; cta: string }> {
  const systemPrompt = `You are a social media copywriter. Return ONLY valid JSON with keys "caption" and "cta". No markdown.`;
  const userPrompt = `You are a social media copywriter for ${client.name}.
Tone: ${client.tone ?? "professional"}
Platform: ${platform}
Goal: ${goal}
Campaign theme: ${signalops.theme}
Headline: "${headline}"

Write:
1. A caption for this ${platform} post (platform-appropriate length, no hashtags yet)
2. A CTA button text (max 4 words)

Return JSON: { "caption": "...", "cta": "..." }`;

  const parsed = await completeJson<{ caption?: string; cta?: string }>(
    systemPrompt,
    userPrompt,
    "claude-sonnet-4-6",
    { maxTokens: 1024, temperature: 0.75 }
  );

  return {
    caption: parsed.caption?.trim() || `[Copy for ${platform} — goal: ${goal}]`,
    cta: parsed.cta?.trim() || "Learn More",
  };
}

export function isValidPlatformAssetCombo(
  platform: SMPlatform,
  assetType: SMAssetType
): boolean {
  return PLATFORM_SPECS[platform]?.[assetType] != null;
}

export function defaultGoalLabel(goal?: SMGoal): string {
  return goal ?? "awareness";
}
