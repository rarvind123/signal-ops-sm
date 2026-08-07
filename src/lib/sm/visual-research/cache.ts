import "server-only";

import { supabase } from "@/lib/supabase";

const BUCKET = "sm-assets";

type CachedRef = {
  url: string;
  source: string;
  query?: string;
};

/** Serializable cache written after strategy, read before image prompts. */
export type VisualResearchCache = {
  requestId: string;
  signalopsId: string;
  strategyFingerprint: string;
  referenceImageUrls: string[];
  references: CachedRef[];
  styleBrief: string;
  categoryHint: string;
  packId: string;
  queries: string[];
  pinterestHitCount: number;
  bingCount: number;
  unsplashCount: number;
  dribbbleCount: number;
  arenaCount: number;
  openverseCount: number;
  createdAt: string;
  uploadFingerprint?: string;
};

/** Minimal result shape needed to persist — avoids circular import with index.ts */
export type CacheableResearchResult = {
  referenceImageUrls: string[];
  references: CachedRef[];
  styleBrief: string;
  categoryHint: string;
  pack: { id: string };
  queries: string[];
  pinterestHitCount: number;
  bingCount: number;
  unsplashCount: number;
  dribbbleCount: number;
  arenaCount: number;
  openverseCount: number;
};

function cachePath(requestId: string): string {
  const safe = requestId.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `research-cache/${safe}.json`;
}

export function strategyFingerprint(signalops: {
  id?: string;
  theme?: string;
  visual_direction?: string;
  be_trigger?: { primary?: string; application?: string } | null;
  visual_approach?: {
    mode?: string;
    scene_description?: string;
    impossible_element?: string;
  } | null;
}): string {
  return [
    signalops.id ?? "",
    signalops.theme ?? "",
    signalops.visual_direction ?? "",
    signalops.be_trigger?.primary ?? "",
    signalops.be_trigger?.application ?? "",
    signalops.visual_approach?.mode ?? "",
    signalops.visual_approach?.scene_description ?? "",
    signalops.visual_approach?.impossible_element ?? "",
  ]
    .join("|")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 800);
}

export function toVisualResearchCache(
  requestId: string,
  signalopsId: string,
  fingerprint: string,
  result: CacheableResearchResult,
  uploadFp = ""
): VisualResearchCache {
  return {
    requestId,
    signalopsId,
    strategyFingerprint: fingerprint,
    uploadFingerprint: uploadFp,
    referenceImageUrls: result.referenceImageUrls,
    references: result.references,
    styleBrief: result.styleBrief,
    categoryHint: result.categoryHint,
    packId: result.pack.id,
    queries: result.queries,
    pinterestHitCount: result.pinterestHitCount,
    bingCount: result.bingCount,
    unsplashCount: result.unsplashCount,
    dribbbleCount: result.dribbbleCount,
    arenaCount: result.arenaCount,
    openverseCount: result.openverseCount,
    createdAt: new Date().toISOString(),
  };
}

export async function saveVisualResearchCache(
  cache: VisualResearchCache
): Promise<void> {
  try {
    const path = cachePath(cache.requestId);
    const body = Buffer.from(JSON.stringify(cache), "utf8");
    const { error } = await supabase.storage.from(BUCKET).upload(path, body, {
      contentType: "application/json",
      upsert: true,
    });
    if (error) {
      console.warn(`[visual-research/cache] save failed: ${error.message}`);
    }
  } catch (error) {
    console.warn("[visual-research/cache] save soft-fail:", error);
  }
}

export async function loadVisualResearchCache(
  requestId: string
): Promise<VisualResearchCache | null> {
  try {
    const path = cachePath(requestId);
    const { data, error } = await supabase.storage.from(BUCKET).download(path);
    if (error || !data) return null;
    const text = await data.text();
    const parsed = JSON.parse(text) as VisualResearchCache;
    if (
      !parsed ||
      !Array.isArray(parsed.referenceImageUrls) ||
      typeof parsed.styleBrief !== "string"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
