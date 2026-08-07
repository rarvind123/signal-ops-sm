import "server-only";

export type OpenverseImageRef = {
  url: string;
  query: string;
  title?: string;
};

/**
 * Openverse (Creative Commons) image search — used when Pinterest pin_search
 * beta is blocked. Free, no API key required.
 * https://api.openverse.org/
 */
export async function searchOpenverseImages(
  term: string,
  limit = 3
): Promise<OpenverseImageRef[]> {
  if (!term.trim()) return [];

  try {
    const params = new URLSearchParams({
      q: term.trim().slice(0, 120),
      page_size: String(Math.min(Math.max(limit, 1), 8)),
      mature: "false",
    });

    const res = await fetch(`https://api.openverse.org/v1/images/?${params}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": "InventiousVisualResearch/1.0 (https://inventious.co)",
      },
      signal: AbortSignal.timeout(12_000),
      cache: "no-store",
    });

    if (!res.ok) {
      console.warn(
        `[visual-research/openverse] HTTP ${res.status} for "${term}"`
      );
      return [];
    }

    const json = (await res.json()) as {
      results?: Array<{
        url?: string;
        thumbnail?: string;
        title?: string;
      }>;
    };

    const out: OpenverseImageRef[] = [];
    const seen = new Set<string>();
    for (const item of json.results ?? []) {
      const url = item.url || item.thumbnail;
      if (!url || !/^https?:\/\//i.test(url) || seen.has(url)) continue;
      seen.add(url);
      out.push({ url, query: term, title: item.title });
      if (out.length >= limit) break;
    }

    console.info(
      `[visual-research/openverse] "${term}" → ${out.length} image(s)`
    );
    return out;
  } catch (error) {
    console.warn("[visual-research/openverse] soft-fail:", error);
    return [];
  }
}

export async function searchOpenverseQueries(
  queries: string[],
  maxImages = 4
): Promise<OpenverseImageRef[]> {
  const out: OpenverseImageRef[] = [];
  const seen = new Set<string>();
  for (const query of queries) {
    if (out.length >= maxImages) break;
    const need = maxImages - out.length;
    const hits = await searchOpenverseImages(query, Math.min(need + 1, 5));
    for (const hit of hits) {
      if (seen.has(hit.url)) continue;
      seen.add(hit.url);
      out.push(hit);
      if (out.length >= maxImages) break;
    }
  }
  return out;
}
