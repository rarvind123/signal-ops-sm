import { completeText } from "@/lib/ai";
import { cleanJsonResponse } from "@/lib/json-sanitize";
import type { SMClient, SMCreativeRequest, SMSignalOpsOutput } from "@/types/sm";

type SignalOpsPayload = Omit<SMSignalOpsOutput, "id" | "request_id" | "created_at">;

const LIONS_SCORE_THRESHOLD = 6.0;
const MAX_LIONS_RETRIES = 2;

type RawSignalOpsPayload = Partial<SignalOpsPayload> & {
  headlines?: Array<{ text?: string; rationale?: string; be_trigger?: string }>;
};

export async function runSignalOpsEngine(
  client: SMClient,
  request: SMCreativeRequest
): Promise<SignalOpsPayload> {
  let lastOutput: SignalOpsPayload | null = null;

  for (let attempt = 0; attempt <= MAX_LIONS_RETRIES; attempt += 1) {
    const parsed = await callSignalOpsModel(client, request, attempt);
    lastOutput = normalizeSignalOpsOutput(parsed);

    if (lastOutput.lions_score.overall >= LIONS_SCORE_THRESHOLD) {
      return lastOutput;
    }

    console.warn(
      `[SignalOps] Score ${lastOutput.lions_score.overall} below threshold — retrying (${attempt + 1}/${MAX_LIONS_RETRIES})`
    );
  }

  if (!lastOutput) {
    throw new Error("SignalOps engine returned no output");
  }

  return lastOutput;
}

async function callSignalOpsModel(
  client: SMClient,
  request: SMCreativeRequest,
  attempt: number
): Promise<RawSignalOpsPayload> {
  const brandContext = buildBrandContext(client);
  const briefContext = buildBriefContext(request);
  const beMenu = buildBEMenu(request.goal);
  const retryNote =
    attempt > 0
      ? `\n\nRETRY ${attempt}: Your previous direction scored below ${LIONS_SCORE_THRESHOLD}/10 on Lions quality. Rewrite with a sharper insight bridge, a braver headline option, and more specific visual direction.`
      : "";

  const systemPrompt = `You are SignalOps — the creative intelligence engine of a world-class brand agency.
You operate with the rigour of a Cannes Lions jury combined with the instinct of a senior creative director.

Your philosophy has four pillars (sourced from Cannes Lions):

PILLAR 1 — THE INSIGHT BRIDGE
Before writing any creative direction, you must articulate:
- The HUMAN TRUTH: a universal feeling, fear, desire or tension that the target audience experiences. Not about the brand. About being human.
- The BRAND TRUTH: what is uniquely and credibly true about this specific brand that connects to that human truth.
- The CREATIVE TENSION: the friction or gap between the human truth and the brand truth. This tension IS the idea. Great campaigns live in this gap.

Example:
Brief: "Promote our free yoga class this Saturday."
Human truth: Working professionals feel time is being stolen from them — weekends disappear before they start.
Brand truth: This class costs nothing and lasts only 60 minutes.
Creative tension: In a world that takes your time, here is something that gives it back.
→ That tension drives every creative decision downstream.

PILLAR 2 — BEHAVIOURAL ECONOMICS TRIGGER
Every brief has a dominant psychological lever. You must identify and name it explicitly.
Your toolkit (from Cannes Lions / Rory Sutherland, Ogilvy):
- nudge: Gentle direction that preserves choice. "Put the fruit at eye level." Use for behaviour change, awareness.
- loss_aversion: Losses loom larger than gains. What does the audience lose by NOT acting? Use for offers, CTAs, urgency.
- scarcity_urgency: Limited availability triggers immediate action. Use for offers, events, launches.
- social_proof: Peer behaviour reduces risk. Use for testimonials, trust-building, brand awareness.
- anchoring: Perception of value is relative. Use for pricing, premium positioning.
- endowment_effect: People overvalue what they own or identify with. Use for loyalty, community, identity brands.
- status_quo_bias: Remind people what they already love to prevent switching. Use for retention campaigns.
- framing: The same thing described differently drives different responses. Use for repositioning, reframing offers.
- identity_resonance: People buy to express who they are (Dr Marcus Collins, Cannes Lions 2023). Use for cultural/community brands.

Pick ONE primary trigger. Then explain exactly how to apply it in copy and visual direction.

PILLAR 3 — CULTURAL RESONANCE LEVEL
Before generating the direction, determine which level of cultural resonance this brief is asking for.
The 4 pillars (sourced from The Marketing Arm, as presented at Cannes Lions):
- recognition: The audience sees themselves reflected in the brand's world. Required baseline for any campaign.
- alliance: The brand's values are meaningful and aligned with the audience's own values. Used for brand building.
- engagement: The audience interacts with, shares, or participates in the brand's story. Used for social/viral goals.
- advocacy: The audience actively amplifies the brand. Used for community campaigns and loyalty.

State which pillar this brief is targeting. Also flag any cultural sensitivity considerations — especially if the brief touches religion, ethnicity, gender, class, disability, or local custom. A missed sensitivity kills the campaign.

PILLAR 4 — LIONS QUALITY SELF-SCORE
After generating your direction, you will score it on four dimensions used by Cannes Lions juries:
- Distinct (1–10): Is the idea original? Does it break category conventions? A score of 8+ means a brand might reject it for being too bold.
- Truthful (1–10): Is it anchored in a genuine human or brand truth? Generic ideas score below 5.
- Brave (1–10): Does it take a creative risk? Could a conservative client refuse it? Bravery requires tension.
- Crafted (1–10): Is the execution concept tight, specific, and visually clear? Vague direction scores below 5.
Be honest. If your overall score is below 6, rewrite the direction before returning it.

OUTPUT RULES:
- Every word should be specific and actionable, not generic. "Warm sunrise tones" beats "make it feel warm".
- Headlines must read like real ads that could run tomorrow — not placeholders.
- The insight bridge is the most important output. If it is weak, everything else fails.
- Return ONLY valid JSON. No markdown. No preamble.`;

  const userPrompt = `
BRAND DNA:
${brandContext}

TODAY'S BRIEF:
${briefContext}

BEHAVIOURAL ECONOMICS MENU (pre-matched to brief goal "${request.goal ?? "awareness"}"):
${beMenu}

Generate a complete SignalOps creative direction in this exact JSON structure:

{
  "theme": "One sentence — the campaign concept or emotional hook that drives all creative decisions",

  "insight_bridge": {
    "human_truth": "The universal human feeling, fear, or desire this brief taps into — written from the audience's perspective, not the brand's",
    "brand_truth": "What is credibly and uniquely true about ${client.name} that connects to this human truth",
    "creative_tension": "The gap between the two — the friction that becomes the idea. This should feel like a small revelation."
  },

  "be_trigger": {
    "primary": "one of: nudge | loss_aversion | scarcity_urgency | social_proof | anchoring | endowment_effect | status_quo_bias | framing | identity_resonance",
    "label": "Human-readable name of the trigger",
    "rationale": "Why this specific trigger fits this brief and this audience",
    "application": "Exactly how to apply it — what word, image, or structural choice activates the trigger"
  },

  "cultural_resonance": {
    "target_pillar": "recognition | alliance | engagement | advocacy",
    "rationale": "Why this pillar is the right ambition for this brief",
    "sensitivity_flags": ["Any cultural, religious, social, or regional sensitivity that must be considered — empty array if none"]
  },

  "visual_direction": "3–5 sentences. Specific composition, mood, lighting, colour approach, and use of any uploaded images. No vague adjectives — name actual colours, actual framing choices, actual visual metaphors.",

  "headlines": [
    {
      "text": "Headline option 1 — must read like a real published ad",
      "rationale": "Why this works for this brand, this audience, this moment",
      "be_trigger": "Which BE trigger this headline specifically activates"
    },
    {
      "text": "Headline option 2",
      "rationale": "...",
      "be_trigger": "..."
    },
    {
      "text": "Headline option 3 — make this the brave option: the one that might scare a cautious client but would win an award",
      "rationale": "...",
      "be_trigger": "..."
    }
  ],

  "color_recommendation": "Specific palette tied to brand colours and the emotional mood. Name actual hex codes or colour descriptions, not just 'warm tones'.",

  "creative_notes": "2–3 strategic notes. Include: one thing NOT to do (the tempting generic version of this idea), one cultural or audience nuance to respect, one craft principle that would elevate this specific execution.",

  "platform_adaptations": {
    "instagram": "How this concept adapts to Instagram's visual-first, aspiration-driven feed",
    "linkedin": "How this concept adapts to LinkedIn's professional context — same idea, different framing",
    "facebook": "How this concept adapts for Facebook's community-oriented, mixed-age audience"
  },

  "lions_score": {
    "distinct": 7,
    "truthful": 8,
    "brave": 6,
    "crafted": 8,
    "overall": 7.3,
    "improvement_note": "The single most specific change that would push this toward a 9+. Be concrete."
  }
}

IMPORTANT: If your lions_score.overall is below 6.0, do NOT return that output. Rewrite the creative direction until it scores 6.5 or higher. A score below 6 means the insight is too generic or the idea is not distinct enough.

Return ONLY valid JSON.${retryNote}`;

  const response = await completeText(systemPrompt, userPrompt, "claude-sonnet-4-6", {
    maxTokens: 8192,
    temperature: 0.7,
  });

  console.log("[SignalOps] Raw AI response length:", response.length);
  console.log("[SignalOps] Raw AI response (first 500 chars):", response.slice(0, 500));
  console.log("[SignalOps] Raw AI response (last 200 chars):", response.slice(-200));

  return parseSignalOpsResponse(response);
}

const SIGNALOPS_WRAPPER_KEYS = [
  "output",
  "data",
  "result",
  "creative_direction",
  "signalops",
  "response",
] as const;

function parseSignalOpsResponse(response: string): RawSignalOpsPayload {
  let parsed: RawSignalOpsPayload;

  try {
    const cleaned = cleanJsonResponse(response)
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    let rawParsed = JSON.parse(cleaned) as Record<string, unknown>;

    if (rawParsed && typeof rawParsed === "object" && !rawParsed.theme) {
      for (const key of SIGNALOPS_WRAPPER_KEYS) {
        const wrapped = rawParsed[key];
        if (
          wrapped &&
          typeof wrapped === "object" &&
          wrapped !== null &&
          "theme" in wrapped
        ) {
          rawParsed = wrapped as Record<string, unknown>;
          console.log(`[SignalOps] Unwrapped from key: "${key}"`);
          break;
        }
      }
    }

    parsed = rawParsed as RawSignalOpsPayload;
  } catch (parseError) {
    const message = parseError instanceof Error ? parseError.message : "JSON parse failed";
    console.error("[SignalOps] JSON parse failed:", message);
    console.error("[SignalOps] Response that failed to parse:", response.slice(0, 1000));
    throw new Error(`SignalOps engine returned invalid JSON: ${message}`);
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error(
      `SignalOps engine returned null or non-object. Response: ${response.slice(0, 200)}`
    );
  }

  return parsed;
}

function normalizeSignalOpsOutput(parsed: RawSignalOpsPayload): SignalOpsPayload {
  const theme = parsed.theme?.trim() || "Creative direction pending";
  if (!parsed.theme?.trim()) {
    console.warn(
      "[SignalOps] theme field missing from AI response — output may be incomplete"
    );
  }

  const distinct = Number(parsed.lions_score?.distinct ?? 0);
  const truthful = Number(parsed.lions_score?.truthful ?? 0);
  const brave = Number(parsed.lions_score?.brave ?? 0);
  const crafted = Number(parsed.lions_score?.crafted ?? 0);
  const overall =
    typeof parsed.lions_score?.overall === "number"
      ? parsed.lions_score.overall
      : Number(((distinct + truthful + brave + crafted) / 4).toFixed(1));

  return {
    theme,
    insight_bridge: {
      human_truth: parsed.insight_bridge?.human_truth ?? "",
      brand_truth: parsed.insight_bridge?.brand_truth ?? "",
      creative_tension: parsed.insight_bridge?.creative_tension ?? "",
    },
    be_trigger: {
      primary: parsed.be_trigger?.primary ?? "",
      label: parsed.be_trigger?.label ?? "",
      rationale: parsed.be_trigger?.rationale ?? "",
      application: parsed.be_trigger?.application ?? "",
    },
    cultural_resonance: {
      target_pillar: parsed.cultural_resonance?.target_pillar ?? "recognition",
      rationale: parsed.cultural_resonance?.rationale ?? "",
      sensitivity_flags: Array.isArray(parsed.cultural_resonance?.sensitivity_flags)
        ? parsed.cultural_resonance.sensitivity_flags
        : [],
    },
    visual_direction: parsed.visual_direction ?? "",
    headlines: Array.isArray(parsed.headlines)
      ? parsed.headlines.map((h) => ({
          text: h.text ?? "",
          rationale: h.rationale ?? "",
          be_trigger: h.be_trigger ?? "",
        }))
      : [],
    color_recommendation: parsed.color_recommendation ?? "",
    creative_notes: parsed.creative_notes ?? "",
    platform_adaptations: parsed.platform_adaptations ?? {},
    lions_score: {
      distinct,
      truthful,
      brave,
      crafted,
      overall,
      improvement_note: parsed.lions_score?.improvement_note ?? "",
    },
  };
}

function buildBEMenu(goal?: string): string {
  const menus: Record<string, string[]> = {
    offer: ["loss_aversion", "scarcity_urgency", "anchoring", "framing"],
    launch: ["social_proof", "scarcity_urgency", "identity_resonance", "framing"],
    awareness: ["identity_resonance", "nudge", "social_proof", "endowment_effect"],
    event: ["scarcity_urgency", "loss_aversion", "social_proof", "nudge"],
    cta: ["loss_aversion", "scarcity_urgency", "framing", "nudge"],
    testimonial: ["social_proof", "endowment_effect", "identity_resonance", "framing"],
  };

  const relevant = menus[goal ?? "awareness"] ?? menus.awareness;
  return `Most relevant triggers for goal "${goal ?? "awareness"}": ${relevant.join(", ")}. Consider these first, but override if a different trigger is more fitting.`;
}

function buildBrandContext(client: SMClient): string {
  return `Brand: ${client.name}
Tagline: ${client.tagline ?? "N/A"}
USP: ${client.usp ?? "N/A"}
Tone: ${client.tone ?? "N/A"}
Target Audience: ${JSON.stringify(client.target_audience)}
Brand Colors: ${client.brand_colors.map((c) => `${c.label}: ${c.hex}`).join(", ") || "N/A"}`;
}

function buildBriefContext(request: SMCreativeRequest): string {
  return `Brief: ${request.brief_text}
Goal: ${request.goal ?? "general"}
Platforms: ${request.platforms.join(", ")}
Uploaded images: ${request.uploaded_image_urls.length > 0 ? request.uploaded_image_urls.join(", ") : "None"}`;
}
