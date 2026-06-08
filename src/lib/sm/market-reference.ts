export interface MetaAdSnapshot {
  images?: Array<{ original_image_url?: string }>;
  body?: { text?: string };
  title?: string;
}

export interface MetaMarketAd {
  id: string;
  page_name: string;
  snapshot?: MetaAdSnapshot;
}

export function getCategoryBrands(brandName: string): string[] {
  const bn = brandName.toLowerCase();
  if (bn.includes("himalaya") || bn.includes("baby") || bn.includes("mama")) {
    return ["Mamaearth baby", "WOW Baby", "Johnsons baby India"];
  }
  if (bn.includes("fevicol") || bn.includes("adhesive") || bn.includes("pidilite")) {
    return ["Pidilite", "Araldite India"];
  }
  if (bn.includes("rcb") || bn.includes("cricket") || bn.includes("ipl")) {
    return ["Dream11", "IPL India"];
  }
  return [];
}

export function buildMarketContextSummary(
  ads: MetaMarketAd[],
  source: "meta" | "ai" = "meta"
): string {
  const prefix =
    source === "ai"
      ? "MARKET CONTEXT (AI-generated competitive landscape, India):\n"
      : "MARKET CONTEXT (Meta Ad Library, India):\n";

  const lines = ads
    .slice(0, 8)
    .map((ad) => {
      const copy =
        ad.snapshot?.body?.text?.trim() ||
        ad.snapshot?.title?.trim() ||
        "(visual-only ad)";
      return `${ad.page_name}: ${copy.slice(0, 150)}`;
    })
    .join("\n");

  return prefix + lines;
}

export async function generateAiMarketContext(
  brand: string,
  category: string
): Promise<MetaMarketAd[]> {
  const prompt = `You are a senior advertising strategist with deep knowledge of Indian advertising.

Brand: ${brand}
Category: ${category}
Market: India

List the 5-6 most active competitor brands currently advertising in this category in India.
For each brand, describe one recent typical ad they run — the headline/copy approach, the emotional angle, and what makes it distinctive (or clichéd).

Respond ONLY with a JSON array. No explanation. No markdown fences. Example format:
[
  {
    "id": "ai_1",
    "page_name": "Mamaearth",
    "snapshot": {
      "title": "Natural se better kuch nahi",
      "body": { "text": "Gentle on baby skin. No harmful chemicals. Trusted by 1 crore moms. #MamaearthBaby — Lifestyle shot of mother applying lotion, warm light, emotional music. Heavy on 'natural ingredients' messaging." }
    }
  }
]

Return exactly this structure for each brand. page_name = brand name. snapshot.title = their typical headline. snapshot.body.text = describe their ad approach and copy style in 1-2 sentences.`;

  try {
    const { callAI } = await import("@/lib/ai");
    const raw = await callAI({
      system:
        "You are an advertising intelligence analyst. Return only valid JSON arrays.",
      user: prompt,
      maxTokens: 1200,
      temperature: 0.4,
    });

    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const parsed = JSON.parse(cleaned) as MetaMarketAd[];
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, 6);
  } catch {
    return [];
  }
}

export const LAYOUT_TEMPLATE_LABELS: Record<string, string> = {
  full_bleed_gradient: "Full bleed + gradient",
  brand_band_bottom: "Brand band bottom",
  brand_band_left: "Magazine split left",
  type_forward: "Type forward",
  full_bleed_top_text: "Full bleed top text",
};
