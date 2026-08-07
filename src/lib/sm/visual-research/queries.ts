import type { SMClient, SMCreativeRequest, SMSignalOpsOutput } from "@/types/sm";
import type { StylePack } from "./style-packs";

export type ResearchQueryPhase = "category_ads" | "visual_refs";

export type ResearchQuery = {
  term: string;
  phase: ResearchQueryPhase;
};

const STOP = new Set(
  [
    "a",
    "an",
    "the",
    "and",
    "or",
    "for",
    "with",
    "that",
    "this",
    "which",
    "would",
    "could",
    "should",
    "when",
    "they",
    "them",
    "their",
    "join",
    "want",
    "create",
    "social",
    "media",
    "post",
    "instagram",
    "promote",
    "launch",
    "advertise",
    "campaign",
    "take",
    "image",
    "inspiration",
    "must",
    "include",
    "exclude",
    "only",
    "from",
    "into",
    "about",
    "after",
    "before",
    "monthly",
    "fee",
    "inr",
    "rs",
    "subtracted",
    "coming",
    "back",
  ].map((w) => w.toLowerCase())
);

/** Known category noun phrases — prefer these over raw sentence slices. */
const CATEGORY_PHRASES: RegExp[] = [
  /\byoga\s+(?:studio\s+)?(?:trial\s+)?(?:class|classes|session|sessions)?\b/i,
  /\b(?:beauty|skincare|serum|cosmetic)\b/i,
  /\b(?:coffee|cafe|restaurant|food|beverage)\b/i,
  /\b(?:fitness|gym|workout|training)\b/i,
  /\b(?:fashion|apparel|boutique|saree)\b/i,
  /\b(?:bank(?:ing)?|finance|insurance|fintech|invest(?:ment)?)\b/i,
  /\b(?:tech|saas|app|software|startup)\b/i,
  /\b(?:event|workshop|festival|exhibition)\b/i,
  /\b(?:wellness|meditation|pilates|ayurveda)\b/i,
];

/** Pull a short category phrase from the user brief (not the whole paragraph). */
export function extractCategoryHint(
  brief: string,
  pack: StylePack,
  client?: SMClient
): string {
  const text = brief.replace(/\s+/g, " ").trim();
  if (!text) return pack.label;

  for (const re of CATEGORY_PHRASES) {
    const hit = text.match(re)?.[0]?.replace(/\s+/g, " ").trim();
    if (hit && hit.length >= 3) {
      // Normalize "yoga class" / "yoga studio trial class" → compact label
      return hit.toLowerCase().replace(/\s+/g, " ");
    }
  }

  // After promote/launch verbs, keep only content words (max 4).
  const promote =
    text.match(
      /\b(?:promote|launch|advertise|campaign\s+for|ads?\s+for)\s+([^.!?\n]{3,80})/i
    )?.[1] ?? text.slice(0, 80);

  const words = promote
    .replace(/[^\w\s&/-]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 1 && !STOP.has(w.toLowerCase()) && !/^\d+$/.test(w))
    .slice(0, 4);

  if (words.length >= 1) return words.join(" ").toLowerCase();

  const uspBits = (client?.usp ?? "")
    .split(/[,|/]/)
    .map((s) => s.trim())
    .find((s) => s.length > 2 && s.length < 40);

  return (uspBits || pack.label).toLowerCase();
}

/**
 * Build ordered Pinterest queries:
 * 1) Best creative ads in the user's category
 * 2) Broader visual / photographic references
 */
/** Compress a strategy phrase into a short search-safe fragment. */
function strategyFragment(text: string | undefined | null, maxWords = 6): string {
  if (!text?.trim()) return "";
  return text
    .replace(/[^\w\s&/-]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 2 && !STOP.has(w.toLowerCase()) && !/^\d+$/.test(w))
    .slice(0, maxWords)
    .join(" ")
    .toLowerCase();
}

export function buildResearchQueries(input: {
  client: SMClient;
  request: SMCreativeRequest;
  pack: StylePack;
  signalops?: SMSignalOpsOutput | null;
}): ResearchQuery[] {
  const { client, request, pack, signalops } = input;
  const category = extractCategoryHint(request.brief_text, pack, client);
  const goal = request.goal?.replace(/_/g, " ") ?? "";
  const theme = signalops?.theme?.trim() ?? "";
  const visualDirection = strategyFragment(signalops?.visual_direction, 7);
  const bePrimary = strategyFragment(signalops?.be_trigger?.primary, 5);
  const beApplication = strategyFragment(signalops?.be_trigger?.application, 6);
  const scene = strategyFragment(
    signalops?.visual_approach?.scene_description,
    7
  );
  const impossible = strategyFragment(
    signalops?.visual_approach?.impossible_element,
    5
  );
  const india = "India";

  const adQueries: string[] = [
    `best ${category} advertising campaign ${india}`,
    `${category} brand Instagram ad creative award winning`,
    `Cannes Lions ${category} print ad campaign`,
    `${category} social media ad creative agency ${india}`,
    goal ? `${category} ${goal} marketing campaign visual ad` : "",
    theme ? `${theme} advertising creative campaign` : "",
    // Strategy-led queries — run after SignalOps so research matches the approved idea.
    visualDirection
      ? `${category} ${visualDirection} advertising creative campaign`
      : "",
    bePrimary ? `${category} ${bePrimary} brand campaign visual ad` : "",
    beApplication
      ? `${beApplication} advertising photography campaign ${india}`
      : "",
    ...pack.adCreativeQueries,
  ]
    .map((q) => q.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const visualQueries: string[] = [
    ...pack.visualReferenceQueries,
    `${category} editorial photography film look no text`,
    `${category} lifestyle photography natural light ${india}`,
    scene ? `${scene} editorial photography cinematic lighting no text` : "",
    impossible
      ? `${impossible} conceptual photography surreal visual metaphor`
      : "",
    visualDirection
      ? `${visualDirection} photography reference moodboard no text`
      : "",
  ]
    .map((q) => q.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const dedupe = (items: string[], phase: ResearchQueryPhase): ResearchQuery[] => {
    const seen = new Set<string>();
    const out: ResearchQuery[] = [];
    for (const term of items) {
      const key = term.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ term: term.slice(0, 120), phase });
    }
    return out;
  };

  // Ads first (up to 4), then visual refs (up to 3).
  return [
    ...dedupe(adQueries, "category_ads").slice(0, 4),
    ...dedupe(visualQueries, "visual_refs").slice(0, 3),
  ];
}
