import "server-only";

const DRIBBBLE_ENDPOINT = "https://api.dribbble.com/v2";
const TIMEOUT_MS = 10_000;

export type DribbbleImageRef = {
  url: string;
  query: string;
  title?: string;
  htmlUrl?: string;
};

export function isDribbbleConfigured(): boolean {
  return Boolean(process.env.DRIBBBLE_ACCESS_TOKEN?.trim());
}

/** Dribbble search wants short design terms, not long ad copy queries. */
export function shortenForDribbble(term: string): string {
  return term
    .replace(/\b(best|award winning|cannes lions|instagram|social media|print ad|agency|india)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 3)
    .join(" ");
}

export async function searchDribbbleShots(
  term: string,
  limit = 3
): Promise<DribbbleImageRef[]> {
  if (!isDribbbleConfigured() || !term.trim()) return [];
  const q = shortenForDribbble(term) || term.trim().slice(0, 40);
  try {
    const params = new URLSearchParams({
      q,
      per_page: String(Math.min(Math.max(limit, 1), 12)),
    });
    const res = await fetch(`${DRIBBBLE_ENDPOINT}/shots?${params}`, {
      headers: {
        Authorization: `Bearer ${process.env.DRIBBBLE_ACCESS_TOKEN!.trim()}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) {
      console.warn(`[visual-research/dribbble] HTTP ${res.status} for "${q}"`);
      return [];
    }
    const json = (await res.json()) as Array<{
      title?: string;
      html_url?: string;
      images?: { hidpi?: string; normal?: string; teaser?: string };
    }>;
    const out: DribbbleImageRef[] = [];
    const seen = new Set<string>();
    for (const shot of Array.isArray(json) ? json : []) {
      const url =
        shot.images?.hidpi || shot.images?.normal || shot.images?.teaser;
      if (!url || !/^https?:\/\//i.test(url) || seen.has(url)) continue;
      seen.add(url);
      out.push({
        url,
        query: q,
        title: shot.title,
        htmlUrl: shot.html_url,
      });
      if (out.length >= limit) break;
    }
    console.info(`[visual-research/dribbble] "${q}" → ${out.length} shot(s)`);
    return out;
  } catch (err) {
    console.warn("[visual-research/dribbble] soft-fail:", err);
    return [];
  }
}

export async function searchDribbbleQueries(
  queries: string[],
  maxImages = 3
): Promise<DribbbleImageRef[]> {
  if (!isDribbbleConfigured() || queries.length === 0) return [];
  const out: DribbbleImageRef[] = [];
  const seen = new Set<string>();
  const results = await Promise.allSettled(
    queries.slice(0, 2).map((q) => searchDribbbleShots(q, 2))
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
