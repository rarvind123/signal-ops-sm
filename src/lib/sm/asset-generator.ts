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
  _platform: SMPlatform,
  _assetType: SMAssetType,
  _headline: string
): string {
  return `professional marketing photograph, ${signalops.visual_direction}, ${signalops.color_recommendation}, brand tone ${client.tone ?? "professional"}, clean composition with negative space in lower third for text overlay, high-end advertising aesthetic, no visible text or watermarks, photorealistic commercial photography style, ${signalops.theme}, ultra high quality, sharp focus, 8k, studio lighting`
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 3800);
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
