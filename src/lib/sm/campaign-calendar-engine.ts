import { completeJson } from "@/lib/ai";
import type {
  SMCampaign,
  SMCampaignStrategy,
  SMClient,
  SMContentFormat,
} from "@/types/sm";

export type CalendarItemRaw = {
  post_number: number;
  week_number: number;
  format: SMContentFormat;
  pillar: string;
  story_phase: string;
  strategic_purpose: string;
  suggested_day: string;
};

const CALENDAR_WRAPPER_KEYS = [
  "calendar_items",
  "items",
  "posts",
  "calendar",
  "data_list",
  "data",
] as const;

function unwrapCalendarItems(raw: unknown): CalendarItemRaw[] {
  if (Array.isArray(raw)) return raw as CalendarItemRaw[];
  if (!raw || typeof raw !== "object") return [];

  const obj = raw as Record<string, unknown>;
  for (const key of CALENDAR_WRAPPER_KEYS) {
    const value = obj[key];
    if (Array.isArray(value) && value.length > 0) {
      return value as CalendarItemRaw[];
    }
  }

  if (typeof obj.post_number === "number") {
    return [obj as CalendarItemRaw];
  }

  return [];
}

export async function generateCampaignCalendar(
  client: SMClient,
  campaign: SMCampaign,
  strategy: SMCampaignStrategy
): Promise<CalendarItemRaw[]> {
  const totalPosts = Object.values(strategy.content_mix).reduce(
    (a, b) => a + (b ?? 0),
    0
  );
  const weeks = Math.ceil(campaign.duration_days / 7);

  const systemPrompt = `You are SignalOps Campaign Calendar Planner.
Your job is to sequence ${totalPosts} posts across ${weeks} weeks for a campaign, ensuring:
1. Each post serves the strategic arc — awareness builds, tension rises, conversion closes
2. Format variety per week — no week should have only statics or only reels
3. Pillar coverage is distributed throughout the campaign, not clustered
4. High-effort formats (reels, carousels) are interspersed with easier content (statics, memes)
5. Offer and conversion content peaks in the final third of the campaign
6. Platform-first days: Reels on Tuesdays/Thursdays (highest reach), Carousels on Wednesdays, Statics on Mondays/Fridays`;

  const userPrompt = `
BRAND: ${client.name}
CAMPAIGN: ${campaign.name} (${campaign.objective}, ${campaign.duration_days} days)
NARRATIVE: ${strategy.narrative_theme}

STORY ARC:
${strategy.story_arc.map((p) => `${p.phase} (${p.week_range}): ${p.description}`).join("\n")}

CONTENT PILLARS:
${strategy.content_pillars.map((p) => `- ${p.name}: ${p.description}`).join("\n")}

CONTENT MIX TO USE:
${JSON.stringify(strategy.content_mix, null, 2)}

Generate exactly ${totalPosts} calendar items that collectively use the content mix above (total must match exactly).

Return as a JSON object with a "calendar_items" array:
{
  "calendar_items": [
    {
      "post_number": 1,
      "week_number": 1,
      "format": "reel",
      "pillar": "Problem Awareness",
      "story_phase": "Awareness",
      "strategic_purpose": "Open the campaign by making the audience feel the problem we solve — before any product mention",
      "suggested_day": "Tuesday"
    }
  ]
}

Return ONLY valid JSON. No markdown.`;

  const MAX_ATTEMPTS = 3;
  let lastCount = 0;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const retryNote =
      attempt > 0
        ? `\n\nRETRY ${attempt}: Your previous response had ${lastCount} items but exactly ${totalPosts} are required. Return a complete "calendar_items" array with post_number 1 through ${totalPosts}. Do not truncate.`
        : "";

    const result = await completeJson<Record<string, unknown>>(
      systemPrompt,
      userPrompt + retryNote,
      "claude-sonnet-4-6",
      { maxTokens: 12000, temperature: 0.6 }
    );

    const items = unwrapCalendarItems(result);
    lastCount = items.length;

    if (items.length === totalPosts) {
      return items;
    }
  }

  throw new Error(
    `Calendar planner returned ${lastCount} of ${totalPosts} required posts — please retry. If this persists, check OPENROUTER_API_KEY.`
  );
}

export function deriveSuggestedDate(
  campaignStart: string,
  weekNumber: number,
  suggestedDay: string
): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayIndex = days.findIndex((d) => d.toLowerCase() === suggestedDay.toLowerCase());
  const start = new Date(campaignStart);
  const date = new Date(start);
  date.setDate(date.getDate() + (weekNumber - 1) * 7 + (dayIndex >= 0 ? dayIndex : 0));
  return date.toISOString().slice(0, 10);
}
