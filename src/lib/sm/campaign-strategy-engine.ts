import { completeJson } from "@/lib/ai";
import type {
  SMCampaign,
  SMCampaignObjective,
  SMCampaignStrategy,
  SMClient,
  SMContentFormat,
} from "@/types/sm";

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

  return completeJson<Omit<SMCampaignStrategy, "id" | "campaign_id" | "created_at">>(
    systemPrompt,
    userPrompt,
    "claude-sonnet-4-6",
    { maxTokens: 4000, temperature: 0.7 }
  );
}
