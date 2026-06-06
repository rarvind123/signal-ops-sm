import { completeJson } from "@/lib/ai";
import type {
  SMClient,
  SMAssetType,
  SMGoal,
  SMPlatform,
  SMSignalOpsOutput,
} from "@/types/sm";

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

export function buildImageGenerationPrompt(
  client: SMClient,
  signalops: SMSignalOpsOutput,
  platform: SMPlatform,
  assetType: SMAssetType,
  _headline: string
): string {
  const tension = signalops.insight_bridge?.creative_tension?.trim();
  const visualDir = signalops.visual_direction?.trim();
  const colorRec = signalops.color_recommendation?.trim();
  const theme = signalops.theme?.trim();
  const tone = client.tone ?? "professional";

  const compositionNote =
    assetType === "story" || assetType === "reel_cover"
      ? "vertical portrait composition, subject centered with breathing room top and bottom"
      : platform === "linkedin"
        ? "wide landscape composition, professional setting, corporate aesthetic"
        : "square composition, bold central subject, clean negative space at bottom third for text";

  const categoryContext = client.usp?.trim() || client.tagline?.trim() || tone;

  const mainPrompt = [
    tension ? `Concept: ${tension}` : theme,
    visualDir,
    `Color palette: ${colorRec || "neutral professional tones"}`,
    `Brand tone: ${tone}`,
    categoryContext ? `Category context: ${categoryContext}` : null,
    compositionNote,
    "ultra high quality commercial photography",
    "sharp focus, professional studio lighting",
    "clean background, premium advertising aesthetic",
    "8k resolution",
    "no people unless central to the concept",
  ]
    .filter(Boolean)
    .join(", ");

  const exclusions = [
    "no product packaging",
    "no product tins",
    "no bottles",
    "no containers",
    "no pack shots",
    "no product labels",
    "no text in image",
    "no logos",
    "no watermarks",
    "no brand marks",
  ].join(", ");

  return `${mainPrompt}, ${exclusions}`.replace(/\s+/g, " ").trim().slice(0, 3800);
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
