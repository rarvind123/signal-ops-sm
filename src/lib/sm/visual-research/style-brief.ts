import "server-only";

import { callAIVision, hasAnthropicApiKey } from "@/lib/ai";

/**
 * Vision pass: distill lighting / grade / composition from reference images.
 * Soft-fails to the curated pack brief when vision is unavailable.
 */
export async function extractStyleBriefFromImages(
  imageUrls: string[],
  packBrief: string
): Promise<string> {
  const urls = imageUrls.filter((u) => /^https?:\/\//i.test(u)).slice(0, 4);
  if (urls.length === 0 || !hasAnthropicApiKey()) return packBrief;

  try {
    const brief = await callAIVision({
      maxTokens: 280,
      temperature: 0.3,
      userContent: [
        {
          type: "text",
          text:
            "You are an award-winning art director. Some references may be category advertising creatives; " +
            "others are photographic mood refs. Write a tight STYLE BRIEF (max 90 words) covering: " +
            "what makes the strongest ads feel premium (visual idea / tension), lighting quality, color grade, " +
            "lens/depth feel, composition language, wardrobe/set realism, and mood. " +
            "Steal craft level only — never copy layouts, logos, headlines, CTAs, or readable text. " +
            "Forbid neon glow, CGI silhouettes, corporate stock poses, and on-image text in the new image. " +
            "Return plain text only — no bullets, no markdown.\n\n" +
            `Category / pack hints to respect: ${packBrief}`,
        },
        ...urls.map((url) => ({
          type: "image" as const,
          source: { type: "url" as const, url },
        })),
      ],
    });

    if (!brief) return packBrief;
    return brief.replace(/\s+/g, " ").slice(0, 700);
  } catch (error) {
    console.warn("[visual-research/style-brief] soft-fail:", error);
    return packBrief;
  }
}
