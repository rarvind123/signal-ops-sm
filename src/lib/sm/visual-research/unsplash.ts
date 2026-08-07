import "server-only";

const UNSPLASH_ENDPOINT = "https://api.unsplash.com/search/photos";
const TIMEOUT_MS = 10_000;

export type UnsplashImageRef = {
  url: string;
  query: string;
  title?: string;
  author?: string;
};

export function isUnsplashConfigured(): boolean {
  return Boolean(process.env.UNSPLASH_ACCESS_KEY?.trim());
}

export async function searchUnsplashImages(
  term: string,
  limit = 3
): Promise<UnsplashImageRef[]> {
  if (!isUnsplashConfigured() || !term.trim()) return [];
  try {
    const params = new URLSearchParams({
      query: term.trim().slice(0, 200),
      per_page: String(Math.min(Math.max(limit, 1), 10)),
      // Prefer portrait/squarish for social, but don't force square only.
      orientation: "portrait",
      content_filter: "high",
    });
    const res = await fetch(`${UNSPLASH_ENDPOINT}?${params}`, {
      headers: {
        Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY!.trim()}`,
        Accept: "application/json",
        "Accept-Version": "v1",
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) {
      console.warn(`[visual-research/unsplash] HTTP ${res.status} for "${term}"`);
      return [];
    }
    const json = (await res.json()) as {
      results?: Array<{
        urls?: { regular?: string; full?: string; small?: string };
        alt_description?: string;
        user?: { name?: string };
      }>;
    };
    const out: UnsplashImageRef[] = [];
    const seen = new Set<string>();
    for (const item of json.results ?? []) {
      const url = item.urls?.regular || item.urls?.full || item.urls?.small;
      if (!url || !/^https?:\/\//i.test(url) || seen.has(url)) continue;
      seen.add(url);
      out.push({
        url,
        query: term,
        title: item.alt_description ?? undefined,
        author: item.user?.name ?? undefined,
      });
      if (out.length >= limit) break;
    }
    console.info(`[visual-research/unsplash] "${term}" → ${out.length} image(s)`);
    return out;
  } catch (err) {
    console.warn("[visual-research/unsplash] soft-fail:", err);
    return [];
  }
}

export async function searchUnsplashQueries(
  queries: string[],
  maxImages = 3
): Promise<UnsplashImageRef[]> {
  if (!isUnsplashConfigured() || queries.length === 0) return [];
  const out: UnsplashImageRef[] = [];
  const seen = new Set<string>();
  // Sequential — free tier is 50 req/hour.
  for (const q of queries.slice(0, 3)) {
    if (out.length >= maxImages) break;
    const need = maxImages - out.length;
    const hits = await searchUnsplashImages(q, Math.min(need + 1, 4));
    for (const hit of hits) {
      if (seen.has(hit.url) || out.length >= maxImages) continue;
      seen.add(hit.url);
      out.push(hit);
    }
  }
  return out;
}
