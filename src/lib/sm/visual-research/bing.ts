import "server-only";

const BING_ENDPOINT = "https://api.bing.microsoft.com/v7.0/images/search";
const TIMEOUT_MS = 10_000;

export type BingImageRef = {
  url: string;
  query: string;
  title?: string;
  thumbnailUrl?: string;
};

export function isBingConfigured(): boolean {
  return Boolean(process.env.BING_SEARCH_API_KEY?.trim());
}

export async function searchBingImages(
  term: string,
  limit = 3
): Promise<BingImageRef[]> {
  if (!isBingConfigured() || !term.trim()) return [];
  try {
    const params = new URLSearchParams({
      q: term.trim().slice(0, 200),
      count: String(Math.min(Math.max(limit, 1), 10)),
      safeSearch: "Moderate",
      imageType: "Photo",
      // No forced square — Instagram creatives are often 4:5 / portrait.
    });
    const res = await fetch(`${BING_ENDPOINT}?${params}`, {
      headers: {
        "Ocp-Apim-Subscription-Key": process.env.BING_SEARCH_API_KEY!.trim(),
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) {
      console.warn(`[visual-research/bing] HTTP ${res.status} for "${term}"`);
      return [];
    }
    const json = (await res.json()) as {
      value?: Array<{
        contentUrl?: string;
        thumbnailUrl?: string;
        name?: string;
      }>;
    };
    const out: BingImageRef[] = [];
    const seen = new Set<string>();
    for (const item of json.value ?? []) {
      const url = item.contentUrl;
      if (!url || !/^https?:\/\//i.test(url) || seen.has(url)) continue;
      seen.add(url);
      out.push({
        url,
        query: term,
        title: item.name,
        thumbnailUrl: item.thumbnailUrl,
      });
      if (out.length >= limit) break;
    }
    console.info(`[visual-research/bing] "${term}" → ${out.length} image(s)`);
    return out;
  } catch (err) {
    console.warn("[visual-research/bing] soft-fail:", err);
    return [];
  }
}

export async function searchBingQueries(
  queries: string[],
  maxImages = 4
): Promise<BingImageRef[]> {
  if (!isBingConfigured() || queries.length === 0) return [];
  const out: BingImageRef[] = [];
  const seen = new Set<string>();
  const results = await Promise.allSettled(
    queries.slice(0, 4).map((q) => searchBingImages(q, 2))
  );
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const hit of r.value) {
      if (seen.has(hit.url) || out.length >= maxImages) continue;
      seen.add(hit.url);
      out.push(hit);
    }
  }
  return out;
}
