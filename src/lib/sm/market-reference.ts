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

export function buildMarketContextSummary(ads: MetaMarketAd[]): string {
  return ads
    .slice(0, 8)
    .map((ad) => {
      const copy =
        ad.snapshot?.body?.text?.trim() ||
        ad.snapshot?.title?.trim() ||
        "(visual-only ad)";
      return `${ad.page_name}: ${copy.slice(0, 150)}`;
    })
    .join("\n");
}

export const LAYOUT_TEMPLATE_LABELS: Record<string, string> = {
  full_bleed_gradient: "Full bleed + gradient",
  brand_band_bottom: "Brand band bottom",
  brand_band_left: "Magazine split left",
  type_forward: "Type forward",
  full_bleed_top_text: "Full bleed top text",
};
