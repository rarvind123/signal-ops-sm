import "server-only";

const ARENA_ENDPOINT = "https://api.are.na/v2";
const TIMEOUT_MS = 12_000;

export type ArenaImageRef = {
  url: string;
  query: string;
  channelTitle?: string;
  blockTitle?: string;
};

function arenaHeaders(): Record<string, string> {
  const h: Record<string, string> = { Accept: "application/json" };
  const token = process.env.ARENA_ACCESS_TOKEN?.trim();
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function searchArenaChannels(
  term: string
): Promise<Array<{ slug: string; title: string }>> {
  try {
    const params = new URLSearchParams({
      q: term.trim().slice(0, 100),
      per: "5",
    });
    const res = await fetch(`${ARENA_ENDPOINT}/search/channels?${params}`, {
      headers: arenaHeaders(),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      channels?: Array<{ slug?: string; title?: string }>;
    };
    return (json.channels ?? [])
      .filter((c) => c.slug && c.title)
      .map((c) => ({ slug: c.slug!, title: c.title! }))
      .slice(0, 3);
  } catch {
    return [];
  }
}

async function fetchArenaChannelImages(
  slug: string,
  channelTitle: string,
  query: string,
  limit = 3
): Promise<ArenaImageRef[]> {
  try {
    const params = new URLSearchParams({ per: "20" });
    const res = await fetch(
      `${ARENA_ENDPOINT}/channels/${encodeURIComponent(slug)}/contents?${params}`,
      {
        headers: arenaHeaders(),
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: "no-store",
      }
    );
    if (!res.ok) return [];
    const json = (await res.json()) as {
      contents?: Array<{
        class?: string;
        image?: { original?: { url?: string }; display?: { url?: string } };
        title?: string;
      }>;
    };
    const out: ArenaImageRef[] = [];
    for (const block of json.contents ?? []) {
      if (block.class !== "Image") continue;
      const url = block.image?.original?.url || block.image?.display?.url;
      if (!url || !/^https?:\/\//i.test(url)) continue;
      out.push({
        url,
        query,
        channelTitle,
        blockTitle: block.title ?? undefined,
      });
      if (out.length >= limit) break;
    }
    return out;
  } catch {
    return [];
  }
}

/** Concise Are.na search terms work better than long ad queries. */
export function shortenForArena(term: string): string {
  return term
    .replace(/\b(best|award winning|cannes lions|instagram|social media|campaign|advertising|creative|agency|india)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 4)
    .join(" ");
}

export async function searchArenaImages(
  term: string,
  limit = 3
): Promise<ArenaImageRef[]> {
  const q = shortenForArena(term) || term.trim();
  if (!q) return [];
  const channels = await searchArenaChannels(q);
  if (!channels.length) return [];

  const allRefs: ArenaImageRef[] = [];
  const seen = new Set<string>();
  const channelResults = await Promise.allSettled(
    channels.map((ch) => fetchArenaChannelImages(ch.slug, ch.title, q, 2))
  );
  for (const r of channelResults) {
    if (r.status !== "fulfilled") continue;
    for (const ref of r.value) {
      if (seen.has(ref.url) || allRefs.length >= limit) continue;
      seen.add(ref.url);
      allRefs.push(ref);
    }
  }
  console.info(`[visual-research/arena] "${q}" → ${allRefs.length} image(s)`);
  return allRefs;
}

export async function searchArenaQueries(
  queries: string[],
  maxImages = 3
): Promise<ArenaImageRef[]> {
  const out: ArenaImageRef[] = [];
  const seen = new Set<string>();
  for (const q of queries.slice(0, 3)) {
    if (out.length >= maxImages) break;
    const hits = await searchArenaImages(q, 2);
    for (const hit of hits) {
      if (seen.has(hit.url) || out.length >= maxImages) continue;
      seen.add(hit.url);
      out.push(hit);
    }
  }
  return out;
}
