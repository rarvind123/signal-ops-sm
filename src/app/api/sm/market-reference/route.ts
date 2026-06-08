import { NextResponse } from "next/server";
import {
  getCategoryBrands,
  type MetaMarketAd,
} from "@/lib/sm/market-reference";
import { smRouteHandler } from "@/lib/sm/api-auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  return smRouteHandler(req, async () => {
    const url = new URL(req.url);
    const brand = url.searchParams.get("brand") ?? "";
    const category = url.searchParams.get("category") ?? "";
    const token = process.env.META_ACCESS_TOKEN ?? "";

    if (!token) {
      return { ads: [] as MetaMarketAd[] };
    }

    const searchTerms = [brand, category, ...getCategoryBrands(brand)]
      .map((term) => term.trim())
      .filter(Boolean);
    const uniqueTerms = [...new Set(searchTerms)].slice(0, 3);

    const allAds: MetaMarketAd[] = [];

    for (const term of uniqueTerms) {
      try {
        const params = new URLSearchParams({
          search_terms: term,
          ad_reached_countries: "IN",
          ad_type: "ALL",
          fields: "id,page_name,snapshot",
          limit: "4",
          access_token: token,
        });

        const metaRes = await fetch(
          `https://graph.facebook.com/v21.0/ads_archive?${params}`,
          { next: { revalidate: 3600 } }
        );

        if (metaRes.ok) {
          const data = (await metaRes.json()) as { data?: MetaMarketAd[] };
          allAds.push(...(data.data ?? []));
        }
      } catch {
        // silently fail per term
      }
    }

    const seen = new Set<string>();
    const deduped = allAds.filter((ad) => {
      if (seen.has(ad.id)) return false;
      seen.add(ad.id);
      return true;
    });

    return { ads: deduped.slice(0, 8) };
  });
}
