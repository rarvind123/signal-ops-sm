import { extractBalancedSegment, parseLlmJson } from "@/lib/json-sanitize";
import type {
  SMCampaignStrategy,
  SMContentFormat,
  SMContentPillar,
  SMStoryArcPhase,
} from "@/types/sm";

export type RawCampaignStrategy = Partial<
  Omit<SMCampaignStrategy, "id" | "campaign_id" | "created_at">
> & {
  story_arc?: Partial<SMStoryArcPhase>[];
  content_pillars?: Partial<SMContentPillar>[];
};

export function contentMixTotal(
  mix: Partial<Record<SMContentFormat, number>> | undefined
): number {
  return Object.values(mix ?? {}).reduce((sum, count) => sum + (count ?? 0), 0);
}

export function isStrategyCorrupted(parsed: RawCampaignStrategy): boolean {
  const arc = parsed.story_arc ?? [];
  const mixTotal = contentMixTotal(parsed.content_mix);
  const hasTheme = Boolean(parsed.narrative_theme?.trim());

  if (hasTheme && mixTotal === 0 && arc.length > 0) return true;
  if (arc.length === 1 && (arc[0]?.description?.length ?? 0) > 1500) return true;

  return arc.some(
    (phase) =>
      phase.description?.includes('"phase"') ||
      phase.description?.includes('"content_pillars"') ||
      phase.description?.includes('"content_mix"') ||
      phase.description?.includes('"strategic_notes"')
  );
}

function parseEmbeddedJsonSegment<T>(
  blob: string,
  key: string,
  openCh: "{" | "[",
  closeCh: "}" | "]"
): T | null {
  const keyIdx = blob.indexOf(`"${key}"`);
  if (keyIdx === -1) return null;
  const start = blob.indexOf(openCh, keyIdx);
  if (start === -1) return null;
  const segment = extractBalancedSegment(blob, start, openCh, closeCh);
  if (!segment) return null;
  try {
    return JSON.parse(segment) as T;
  } catch {
    return null;
  }
}

function parseEmbeddedString(blob: string, key: string): string | null {
  const keyIdx = blob.indexOf(`"${key}"`);
  if (keyIdx === -1) return null;
  const colonIdx = blob.indexOf(":", keyIdx);
  if (colonIdx === -1) return null;
  const quoteStart = blob.indexOf('"', colonIdx + 1);
  if (quoteStart === -1) return null;
  const segment = extractBalancedSegment(blob, quoteStart, '"', '"');
  if (!segment) return null;
  try {
    return JSON.parse(segment) as string;
  } catch {
    return null;
  }
}

export function salvageCorruptedRawStrategy(
  parsed: RawCampaignStrategy
): RawCampaignStrategy {
  if (!isStrategyCorrupted(parsed)) return parsed;

  const arc = parsed.story_arc;
  if (!Array.isArray(arc) || arc.length !== 1) return parsed;

  const first = arc[0];
  const blob = (first?.description ?? "").replace(/\\"/g, '"').replace(/\\n/g, "\n");
  const toneIdx = blob.search(/"emotional_tone"\s*:/);
  if (toneIdx === -1) return parsed;

  const cleanDescription = blob.slice(0, toneIdx).replace(/,\s*$/, "").trim();
  const between = blob.slice(toneIdx);
  const arcCloseIdx = between.indexOf('],\n  "content_pillars"');
  if (arcCloseIdx === -1) return parsed;

  try {
    const arcJson = `[{"phase":${JSON.stringify(first?.phase ?? "")},"week_range":${JSON.stringify(first?.week_range ?? "")},"description":${JSON.stringify(cleanDescription)},${between.slice(0, arcCloseIdx + 1)}`;
    const story_arc = JSON.parse(arcJson) as RawCampaignStrategy["story_arc"];
    const content_pillars =
      parseEmbeddedJsonSegment<RawCampaignStrategy["content_pillars"]>(
        blob,
        "content_pillars",
        "[",
        "]"
      ) ?? [];
    const content_mix =
      parseEmbeddedJsonSegment<RawCampaignStrategy["content_mix"]>(
        blob,
        "content_mix",
        "{",
        "}"
      ) ?? {};
    const strategic_notes = parseEmbeddedString(blob, "strategic_notes") ?? parsed.strategic_notes;
    const platform_notes =
      parseEmbeddedJsonSegment<Record<string, string>>(blob, "platform_notes", "{", "}") ??
      parsed.platform_notes;

    return {
      ...parsed,
      story_arc,
      content_pillars,
      content_mix,
      strategic_notes: strategic_notes ?? "",
      platform_notes: platform_notes ?? {},
    };
  } catch {
    return parsed;
  }
}

export function normalizeCampaignStrategyOutput(
  parsed: RawCampaignStrategy
): Omit<SMCampaignStrategy, "id" | "campaign_id" | "created_at"> {
  const repaired = salvageCorruptedRawStrategy(parsed);

  return {
    narrative_theme: repaired.narrative_theme?.trim() ?? "",
    campaign_tagline: repaired.campaign_tagline?.trim() ?? "",
    story_arc: Array.isArray(repaired.story_arc)
      ? repaired.story_arc.map((phase) => ({
          phase: phase.phase?.trim() ?? "",
          week_range: phase.week_range?.trim() ?? "",
          description: phase.description?.trim() ?? "",
          emotional_tone: phase.emotional_tone?.trim() ?? "",
        }))
      : [],
    content_pillars: Array.isArray(repaired.content_pillars)
      ? repaired.content_pillars.map((pillar) => ({
          name: pillar.name?.trim() ?? "",
          description: pillar.description?.trim() ?? "",
          percentage: Number(pillar.percentage ?? 0),
          post_types: Array.isArray(pillar.post_types)
            ? (pillar.post_types as SMContentFormat[])
            : [],
        }))
      : [],
    content_mix: (repaired.content_mix as Partial<Record<SMContentFormat, number>>) ?? {},
    strategic_notes: repaired.strategic_notes?.trim() ?? "",
    platform_notes: repaired.platform_notes ?? {},
  };
}
