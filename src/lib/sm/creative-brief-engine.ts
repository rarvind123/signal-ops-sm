import { completeJson } from "@/lib/ai";
import type {
  SMCampaign,
  SMCampaignCalendarItem,
  SMCampaignStrategy,
  SMCreativeBrief,
  SMClient,
} from "@/types/sm";

export async function generateCreativeBrief(
  client: SMClient,
  campaign: SMCampaign,
  strategy: SMCampaignStrategy,
  calendarItem: SMCampaignCalendarItem
): Promise<
  Omit<
    SMCreativeBrief,
    "id" | "calendar_item_id" | "campaign_id" | "created_at" | "status" | "generated_asset_id"
  >
> {
  const totalPosts = Object.values(strategy.content_mix).reduce(
    (a, b) => a + (b ?? 0),
    0
  );

  const systemPrompt = `You are SignalOps Creative Brief Writer.
Your job is to write a production-ready creative brief for a single piece of social media content.
The brief must:
1. Fit precisely within the campaign narrative and story arc
2. Serve the specific strategic purpose of this post in the sequence
3. Be specific enough that a designer and copywriter could execute it without asking questions
4. Include a FLUX-renderable scene description for the visual
5. Match the format requirements (carousel structure, static composition, etc.)`;

  const structureExample =
    calendarItem.format === "carousel"
      ? '{ "slide": 1, "label": "Hook", "content": "..." }'
      : '{ "element": "Visual", "content": "..." }, { "element": "Headline", "content": "..." }, { "element": "Caption", "content": "..." }';

  const userPrompt = `
BRAND: ${client.name}
Tone: ${client.tone ?? "professional"}
USP: ${client.usp ?? "not specified"}

CAMPAIGN: ${campaign.name}
Narrative: ${strategy.narrative_theme}
Offer: ${campaign.offer ?? "none"}

THIS POST:
Post #${calendarItem.post_number} of ${totalPosts}
Format: ${calendarItem.format}
Week: ${calendarItem.week_number}
Pillar: ${calendarItem.pillar}
Story Phase: ${calendarItem.story_phase}
Strategic Purpose: ${calendarItem.strategic_purpose}

Generate a complete creative brief:
{
  "post_number": ${calendarItem.post_number},
  "format": "${calendarItem.format}",
  "pillar": "${calendarItem.pillar}",
  "objective": "What this specific post must achieve — one clear sentence",
  "hook": "The opening line, visual hook, or scroll-stopper — must demand attention in 0.3 seconds",
  "structure": [
    ${structureExample}
  ],
  "creative_direction": "How this post should look and feel — specific visual style, mood, composition",
  "caption_direction": "The tone, length, and approach for the caption — not the caption itself",
  "cta": "The exact call to action",
  "hashtag_suggestions": ["relevant", "hashtags", "max10"],
  "visual_approach_mode": "concept_first | product_transformed | product_hero | effects_visible | visual_tension",
  "scene_description": "Exact FLUX-renderable description: subjects, positioning, lighting, background, mood — specific enough to brief a photographer. No abstract words."
}

Return ONLY valid JSON.`;

  return completeJson<
    Omit<
      SMCreativeBrief,
      "id" | "calendar_item_id" | "campaign_id" | "created_at" | "status" | "generated_asset_id"
    >
  >(systemPrompt, userPrompt, "claude-sonnet-4-6", { maxTokens: 2000, temperature: 0.7 });
}
