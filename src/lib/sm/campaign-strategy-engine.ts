import { completeJson } from "@/lib/ai";
import {
  contentMixTotal,
  isStrategyCorrupted,
  normalizeCampaignStrategyOutput,
  salvageCorruptedRawStrategy,
  type RawCampaignStrategy,
} from "@/lib/sm/campaign-strategy-utils";
import type {
  SMCampaign,
  SMCampaignObjective,
  SMCampaignStrategy,
  SMClient,
  SMContentFormat,
} from "@/types/sm";

const STRATEGY_WRAPPER_KEYS = [
  "strategy",
  "campaign_strategy",
  "data",
  "output",
  "result",
] as const;

const MAX_STRATEGY_ATTEMPTS = 3;

const BASELINE_MIX: Record<SMCampaignObjective, Record<SMContentFormat, number>> = {
  awareness: { static: 4, carousel: 4, reel: 10, reel_comic: 2, meme: 3, testimonial: 1, offer: 0 },
  engagement: { static: 6, carousel: 6, reel: 8, reel_comic: 3, meme: 3, testimonial: 2, offer: 2 },
  conversion: { static: 10, carousel: 6, reel: 6, reel_comic: 1, meme: 1, testimonial: 4, offer: 6 },
  launch: { static: 6, carousel: 6, reel: 10, reel_comic: 2, meme: 2, testimonial: 1, offer: 3 },
  retention: { static: 8, carousel: 6, reel: 4, reel_comic: 2, meme: 2, testimonial: 6, offer: 2 },
  event: { static: 8, carousel: 4, reel: 8, reel_comic: 1, meme: 2, testimonial: 1, offer: 4 },
};

export async function runCampaignStrategyEngine(
  client: SMClient,
  campaign: SMCampaign
): Promise<Omit<SMCampaignStrategy, "id" | "campaign_id" | "created_at">> {
  const baseline = BASELINE_MIX[campaign.objective ?? "awareness"];
  const totalPosts = Math.ceil((campaign.duration_days / 7) * 5);

  const systemPrompt = `You are SignalOps Campaign Strategist — a senior social media strategist and creative director.
Your job is to create the strategic framework for a complete content campaign.

You think like a strategist first. Before any content exists, you determine:
- What campaign narrative will thread through every piece of content
- What content pillars will ensure strategic variety and coverage
- What mix of formats will achieve the campaign objective
- How the content should arc across weeks (awareness → consideration → conversion)

CAMPAIGN STRATEGY PRINCIPLES:
1. Every campaign needs a NARRATIVE THEME — a single creative idea that makes every piece of content feel like part of a larger story.
2. CONTENT PILLARS are strategic buckets, not just topic categories. Each pillar should serve a distinct role in moving the audience through the purchase journey.
3. The STORY ARC must have a dramatic structure: it builds, creates tension, and resolves in conversion.
4. The CONTENT MIX should be adjusted from the baseline based on: industry, audience behavior, platform, and where the audience currently is in their awareness of the brand.
5. Platform-specific notes must acknowledge how the same narrative translates differently across Instagram, LinkedIn, etc.

OUTPUT RULES:
- Be specific, not generic. "Summer Isn't Waiting" beats "Summer Sale Campaign"
- Each pillar must have a distinct strategic purpose, not just a topic label
- The story arc must feel like it has momentum — each phase should create appetite for the next
- In story_arc descriptions, never use double-quote characters inside text. Use single quotes for any quoted dialogue.
- Keep each story_arc description under 350 words.
- Return ONLY valid JSON.`;

  const userPrompt = `
BRAND:
Name: ${client.name}
USP: ${client.usp ?? "Not specified"}
Tone: ${client.tone ?? "Professional"}
Audience: ${JSON.stringify(client.target_audience)}

CAMPAIGN:
Name: ${campaign.name}
Objective: ${campaign.objective ?? "awareness"}
Duration: ${campaign.duration_days} days (${Math.ceil(campaign.duration_days / 7)} weeks)
Product/Service: ${campaign.product_service ?? "Not specified"}
Key Message: ${campaign.key_message ?? "Not specified"}
Offer: ${campaign.offer ?? "None"}
Platforms: ${campaign.platforms.join(", ")}
Additional Notes: ${campaign.additional_notes ?? "None"}

BASELINE CONTENT MIX (adjust as needed):
${JSON.stringify(baseline, null, 2)}

TOTAL POSTS TO PLAN: approximately ${totalPosts}

Generate a complete campaign strategy:

{
  "narrative_theme": "The campaign's central creative idea — a phrase or concept that threads through everything",
  "campaign_tagline": "A short, memorable line that could appear on every piece of content",
  "story_arc": [
    {
      "phase": "Phase name (e.g. Awareness)",
      "week_range": "e.g. Week 1",
      "description": "What this phase achieves strategically and what content does here",
      "emotional_tone": "What the audience should feel in this phase"
    }
  ],
  "content_pillars": [
    {
      "name": "Pillar name",
      "description": "What strategic role this pillar plays — not just a topic, but a purpose",
      "percentage": 20,
      "post_types": ["static", "carousel"]
    }
  ],
  "content_mix": {
    "static": 8,
    "carousel": 4,
    "reel": 6,
    "reel_comic": 2,
    "meme": 2,
    "testimonial": 2,
    "offer": 4
  },
  "strategic_notes": "2-3 key strategic decisions and the rationale behind them",
  "platform_notes": {
    "instagram": "How the campaign narrative specifically plays on Instagram",
    "linkedin": "How it translates to LinkedIn's context"
  }
}

Return ONLY valid JSON.`;

  for (let attempt = 0; attempt < MAX_STRATEGY_ATTEMPTS; attempt += 1) {
    const retryNote =
      attempt > 0
        ? `\n\nRETRY ${attempt}: Previous output was malformed or incomplete. Return clean JSON with 3–5 story_arc phases, 4–5 content_pillars, and a content_mix that totals approximately ${totalPosts} posts. No double quotes inside description strings.`
        : "";

    const raw = await completeJson<RawCampaignStrategy & Record<string, unknown>>(
      systemPrompt,
      userPrompt + retryNote,
      "claude-sonnet-4-6",
      { maxTokens: 6000, temperature: 0.7 }
    );

    const payload = salvageCorruptedRawStrategy(unwrapStrategyPayload(raw));
    const normalized = normalizeCampaignStrategyOutput(payload);

    if (
      normalized.narrative_theme.trim() &&
      !isStrategyCorrupted(payload) &&
      normalized.story_arc.length >= 2 &&
      contentMixTotal(normalized.content_mix) > 0
    ) {
      return normalized;
    }
  }

  throw new Error(
    "Strategy generation returned malformed data — please retry. If this persists, check OPENROUTER_API_KEY on Vercel."
  );
}

function unwrapStrategyPayload(raw: Record<string, unknown>): RawCampaignStrategy {
  if (typeof raw.narrative_theme === "string" && raw.narrative_theme.trim()) {
    return raw as RawCampaignStrategy;
  }

  for (const key of STRATEGY_WRAPPER_KEYS) {
    const wrapped = raw[key];
    if (wrapped && typeof wrapped === "object" && !Array.isArray(wrapped)) {
      const candidate = wrapped as RawCampaignStrategy;
      if (candidate.narrative_theme?.trim()) {
        return candidate;
      }
    }
  }

  return raw as RawCampaignStrategy;
}
