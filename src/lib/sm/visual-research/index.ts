import "server-only";

import type { SMClient, SMCreativeRequest, SMSignalOpsOutput } from "@/types/sm";
import { searchArenaQueries } from "./arena";
import { isBingConfigured, searchBingQueries } from "./bing";
import { isDribbbleConfigured, searchDribbbleQueries } from "./dribbble";
import { mirrorRemoteImageToStorage } from "./mirror";
import { searchOpenverseQueries } from "./openverse";
import {
  getPinterestDiagnostics,
  isPinterestConfigured,
  searchPinterestPhased,
} from "./pinterest";
import {
  loadVisualResearchCache,
  saveVisualResearchCache,
  strategyFingerprint,
  toVisualResearchCache,
} from "./cache";
import { buildResearchQueries, extractCategoryHint } from "./queries";
import { extractStyleBriefFromImages } from "./style-brief";
import {
  buildResearchHaystack,
  selectStylePack,
  type StylePack,
} from "./style-packs";
import { isUnsplashConfigured, searchUnsplashQueries } from "./unsplash";
import { mergeReferenceUrls, uploadFingerprint } from "./merge-refs";

export { strategyFingerprint } from "./cache";
export {
  mergeReferenceUrls,
  refsForFalEdit,
  hasUserReferences,
  uploadFingerprint,
} from "./merge-refs";

export type ResearchImageSource =
  | "user"
  | "pinterest_ad"
  | "pinterest_visual"
  | "bing"
  | "dribbble"
  | "unsplash"
  | "arena"
  | "openverse"
  | "style_pack";

export type ResearchImageRef = {
  url: string;
  source: ResearchImageSource;
  query?: string;
};

export type VisualResearchResult = {
  referenceImageUrls: string[];
  references: ResearchImageRef[];
  styleBrief: string;
  pack: StylePack;
  categoryHint: string;
  pinterestEnabled: boolean;
  pinterestHitCount: number;
  pinterestAdCount: number;
  pinterestVisualCount: number;
  pinterestStatus: number | null;
  pinterestError: string | null;
  bingCount: number;
  unsplashCount: number;
  arenaCount: number;
  dribbbleCount: number;
  openverseCount: number;
  queries: string[];
};

const MAX_FAL_REFS = 4;
const MAX_AD_REFS = 2;
const MAX_VISUAL_REFS = 2;
const MAX_PACK_FALLBACK = 2;

/** Merge priority — lower index = higher priority when filling fal slots. */
const SOURCE_PRIORITY: ResearchImageSource[] = [
  "user",
  "pinterest_ad",
  "pinterest_visual",
  "bing",
  "dribbble",
  "unsplash",
  "arena",
  "openverse",
  "style_pack",
];

type Candidate = {
  remoteUrl: string;
  source: ResearchImageSource;
  query?: string;
};

function researchEnabled(): boolean {
  const flag = process.env.VISUAL_RESEARCH_ENABLED?.trim().toLowerCase();
  if (flag === "0" || flag === "false" || flag === "off") return false;
  return true;
}

function uniqueUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of urls) {
    const url = raw?.trim();
    if (!url || !/^https?:\/\//i.test(url) || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

function sourceRank(source: ResearchImageSource): number {
  const idx = SOURCE_PRIORITY.indexOf(source);
  return idx >= 0 ? idx : 99;
}

function emptyCounts() {
  return {
    pinterestHitCount: 0,
    pinterestAdCount: 0,
    pinterestVisualCount: 0,
    pinterestStatus: null as number | null,
    pinterestError: null as string | null,
    bingCount: 0,
    unsplashCount: 0,
    arenaCount: 0,
    dribbbleCount: 0,
    openverseCount: 0,
  };
}

/**
 * Pick winners by source priority, then mirror only those URLs.
 * Avoids uploading dozens of candidates to Supabase per generate.
 */
async function selectAndMirror(
  clientId: string,
  userRefs: ResearchImageRef[],
  candidates: Candidate[],
  packFallbackUrls: string[],
  needSlots: number
): Promise<ResearchImageRef[]> {
  const slotsLeft = Math.max(0, needSlots - userRefs.length);
  const sorted = [...candidates].sort(
    (a, b) => sourceRank(a.source) - sourceRank(b.source)
  );

  const chosen: Candidate[] = [];
  const seen = new Set(userRefs.map((r) => r.url));
  for (const c of sorted) {
    if (chosen.length >= slotsLeft) break;
    if (!c.remoteUrl || seen.has(c.remoteUrl)) continue;
    seen.add(c.remoteUrl);
    chosen.push(c);
  }

  // Pack fallbacks only if still thin.
  if (chosen.length + userRefs.length < 2) {
    for (const url of packFallbackUrls) {
      if (chosen.length + userRefs.length >= Math.min(needSlots, 2 + userRefs.length))
        break;
      if (seen.has(url)) continue;
      seen.add(url);
      chosen.push({ remoteUrl: url, source: "style_pack" });
    }
  }

  const mirrored: ResearchImageRef[] = [...userRefs];
  for (const c of chosen) {
    if (c.source === "style_pack" || c.source === "user") {
      mirrored.push({ url: c.remoteUrl, source: c.source, query: c.query });
      continue;
    }
    const hosted = await mirrorRemoteImageToStorage(clientId, c.remoteUrl);
    mirrored.push({
      url: hosted ?? c.remoteUrl,
      source: c.source,
      query: c.query,
    });
  }
  return mirrored;
}

/**
 * Text-only pack brief for SignalOps (no network). Always safe / fast.
 */
export function getStylePackForBrief(
  client: SMClient,
  request: SMCreativeRequest,
  signalops?: Pick<SMSignalOpsOutput, "theme" | "visual_direction"> | null
): { pack: StylePack; styleBrief: string; categoryHint: string } {
  const haystack = buildResearchHaystack([
    request.brief_text,
    request.must_include,
    request.goal,
    client.usp,
    client.tagline,
    signalops?.theme,
    signalops?.visual_direction,
  ]);
  const pack = selectStylePack(haystack);
  const categoryHint = extractCategoryHint(request.brief_text, pack, client);
  return { pack, styleBrief: pack.styleBrief, categoryHint };
}

/**
 * Prefer cached research from the post-strategy step.
 * Re-runs when cache is missing, strategy fingerprint changed, or forceRefresh.
 */
export async function resolveVisualResearch(input: {
  client: SMClient;
  request: SMCreativeRequest;
  signalops: SMSignalOpsOutput;
  forceRefresh?: boolean;
}): Promise<VisualResearchResult & { fromCache: boolean }> {
  const { client, request, signalops, forceRefresh } = input;
  const fingerprint = strategyFingerprint(signalops);
  const uploadFp = uploadFingerprint(request.uploaded_image_urls);

  if (!forceRefresh) {
    const cached = await loadVisualResearchCache(request.id);
    if (
      cached &&
      cached.strategyFingerprint === fingerprint &&
      (cached.uploadFingerprint ?? "") === uploadFp &&
      (cached.referenceImageUrls.length > 0 || cached.styleBrief.trim())
    ) {
      const packInfo = getStylePackForBrief(client, request, signalops);
      const referenceImageUrls = mergeReferenceUrls(
        request.uploaded_image_urls,
        cached.referenceImageUrls
      );
      console.info(
        `[visual-research] cache-hit request=${request.id} refs=${referenceImageUrls.length} user=${request.uploaded_image_urls?.length ?? 0}`
      );
      return {
        referenceImageUrls,
        references: (cached.references ?? []) as ResearchImageRef[],
        styleBrief: cached.styleBrief,
        pack: packInfo.pack,
        categoryHint: cached.categoryHint || packInfo.categoryHint,
        pinterestEnabled: isPinterestConfigured(),
        ...emptyCounts(),
        pinterestHitCount: cached.pinterestHitCount ?? 0,
        bingCount: cached.bingCount ?? 0,
        unsplashCount: cached.unsplashCount ?? 0,
        dribbbleCount: cached.dribbbleCount ?? 0,
        arenaCount: cached.arenaCount ?? 0,
        openverseCount: cached.openverseCount ?? 0,
        queries: cached.queries ?? [],
        fromCache: true,
      };
    }
  }

  const result = await runVisualResearch({ client, request, signalops });
  await saveVisualResearchCache(
    toVisualResearchCache(
      request.id,
      signalops.id,
      fingerprint,
      result,
      uploadFp
    )
  );
  return { ...result, fromCache: false };
}

/**
 * Internal visual research — run after strategy, before image prompts.
 *
 * Priority: user → Pinterest → Bing → Dribbble → Unsplash → Are.na → Openverse → pack
 * Sources run in parallel; only winners are mirrored to Supabase.
 */
export async function runVisualResearch(input: {
  client: SMClient;
  request: SMCreativeRequest;
  signalops?: SMSignalOpsOutput | null;
}): Promise<VisualResearchResult> {
  const { client, request, signalops } = input;
  const userUrls = uniqueUrls(request.uploaded_image_urls ?? []);
  const hasUserUploads = userUrls.length > 0;

  const haystack = buildResearchHaystack([
    request.brief_text,
    request.must_include,
    request.goal,
    client.usp,
    client.tagline,
    client.name,
    signalops?.theme,
    signalops?.visual_direction,
    signalops?.visual_approach?.scene_description,
    signalops?.visual_approach?.impossible_element,
    signalops?.be_trigger?.primary,
    signalops?.be_trigger?.application,
    signalops?.insight_bridge?.creative_tension,
  ]);

  const pack = selectStylePack(haystack);
  const categoryHint = extractCategoryHint(request.brief_text, pack, client);
  const researchQueries = buildResearchQueries({
    client,
    request,
    pack,
    signalops,
  });
  const queries = researchQueries.map((q) => q.term);

  const userRefs: ResearchImageRef[] = userUrls.map((url) => ({
    url,
    source: "user" as const,
  }));

  if (!researchEnabled()) {
    return {
      referenceImageUrls: userUrls.slice(0, MAX_FAL_REFS),
      references: userRefs,
      styleBrief: pack.styleBrief,
      pack,
      categoryHint,
      pinterestEnabled: isPinterestConfigured(),
      ...emptyCounts(),
      pinterestError: "visual research disabled",
      queries,
    };
  }

  // User upload = composition anchor. Do not fetch stock yoga poses that override it.
  if (hasUserUploads) {
    const packBriefWithCategory =
      `Category focus: ${categoryHint}. ${pack.styleBrief} ` +
      `USER REFERENCE LOCKED — match the uploaded image composition, pose, lighting, and shadow treatment exactly.`;
    const styleBrief = await extractStyleBriefFromImages(
      userUrls.slice(0, 2),
      packBriefWithCategory
    );
    console.info(
      `[visual-research] user-ref-only request=${request.id} refs=${userUrls.length} (skipped external research)`
    );
    return {
      referenceImageUrls: userUrls.slice(0, MAX_FAL_REFS),
      references: userRefs,
      styleBrief,
      pack,
      categoryHint,
      pinterestEnabled: isPinterestConfigured(),
      ...emptyCounts(),
      pinterestError: null,
      queries: ["user-upload-primary"],
    };
  }

  const adQueryTerms = researchQueries
    .filter((q) => q.phase === "category_ads")
    .map((q) => q.term)
    .slice(0, 4);
  const visualQueryTerms = researchQueries
    .filter((q) => q.phase === "visual_refs")
    .map((q) => q.term)
    .slice(0, 3);

  // ── Parallel source fan-out (soft-fail each) ─────────────────────────────
  const pinterestPromise = (async () => {
    if (!isPinterestConfigured()) return [] as Candidate[];
    const adQuota = userUrls.length >= 2 ? 1 : MAX_AD_REFS;
    const visualQuota = userUrls.length >= 2 ? 1 : MAX_VISUAL_REFS;
    const pins = await searchPinterestPhased(researchQueries, {
      categoryAds: adQuota,
      visualRefs: visualQuota,
    });
    return pins.map((pin) => ({
      remoteUrl: pin.url,
      source:
        pin.phase === "category_ads"
          ? ("pinterest_ad" as const)
          : ("pinterest_visual" as const),
      query: pin.query,
    }));
  })();

  // Openverse: always on but smaller quota when paid sources are configured.
  const openverseQuota =
    isBingConfigured() || isUnsplashConfigured() ? 2 : MAX_AD_REFS + MAX_VISUAL_REFS;

  const settled = await Promise.allSettled([
    pinterestPromise,
    searchBingQueries(adQueryTerms, 4),
    searchUnsplashQueries(visualQueryTerms, 3),
    searchArenaQueries(
      [...adQueryTerms.slice(0, 2), ...visualQueryTerms.slice(0, 1)],
      3
    ),
    searchDribbbleQueries(adQueryTerms.slice(0, 2), 3),
    searchOpenverseQueries(
      [...adQueryTerms.slice(0, 2), ...visualQueryTerms.slice(0, 2)],
      openverseQuota
    ),
  ]);

  const pick = <T,>(i: number): T[] =>
    settled[i]?.status === "fulfilled"
      ? ((settled[i] as PromiseFulfilledResult<T[]>).value ?? [])
      : [];

  const pinterestCandidates = pick<Candidate>(0);
  const bingHits = pick<{ url: string; query: string }>(1);
  const unsplashHits = pick<{ url: string; query: string }>(2);
  const arenaHits = pick<{ url: string; query: string }>(3);
  const dribbbleHits = pick<{ url: string; query: string }>(4);
  const openverseHits = pick<{ url: string; query: string }>(5);

  const candidates: Candidate[] = [
    ...pinterestCandidates,
    ...bingHits.map((h) => ({
      remoteUrl: h.url,
      source: "bing" as const,
      query: h.query,
    })),
    ...dribbbleHits.map((h) => ({
      remoteUrl: h.url,
      source: "dribbble" as const,
      query: h.query,
    })),
    ...unsplashHits.map((h) => ({
      remoteUrl: h.url,
      source: "unsplash" as const,
      query: h.query,
    })),
    ...arenaHits.map((h) => ({
      remoteUrl: h.url,
      source: "arena" as const,
      query: h.query,
    })),
    ...openverseHits.map((h) => ({
      remoteUrl: h.url,
      source: "openverse" as const,
      query: h.query,
    })),
  ];

  const pinterestDiag = getPinterestDiagnostics();
  const pinterestAdCount = pinterestCandidates.filter(
    (c) => c.source === "pinterest_ad"
  ).length;
  const pinterestVisualCount = pinterestCandidates.filter(
    (c) => c.source === "pinterest_visual"
  ).length;

  // Skip stock yoga-pose fallbacks when external research is thin — they lock every brief to the same woman+pose.
  const packFallbackSlice: string[] = [];

  const mergedRefs = await selectAndMirror(
    client.id,
    userRefs,
    candidates,
    packFallbackSlice,
    MAX_FAL_REFS
  );

  const referenceImageUrls = uniqueUrls(mergedRefs.map((r) => r.url)).slice(
    0,
    MAX_FAL_REFS
  );
  const references = mergedRefs.filter((r) =>
    referenceImageUrls.includes(r.url)
  );

  const countBy = (source: ResearchImageSource) =>
    references.filter((r) => r.source === source).length;

  const bingCount = countBy("bing");
  const unsplashCount = countBy("unsplash");
  const arenaCount = countBy("arena");
  const dribbbleCount = countBy("dribbble");
  const openverseCount = countBy("openverse");
  const packFallbackCount = countBy("style_pack");

  const visionPreferred = uniqueUrls([
    ...references
      .filter((r) =>
        ["pinterest_ad", "bing", "dribbble"].includes(r.source)
      )
      .map((r) => r.url),
    ...references.map((r) => r.url),
  ]).slice(0, 3);

  const visionSources =
    visionPreferred.length > 0
      ? visionPreferred
      : pack.fallbackImageUrls.slice(0, 2);

  const packBriefWithCategory =
    `Category focus: ${categoryHint}. ${pack.styleBrief} ` +
    `Study best-in-category ad craft (light, composition, tension) — do not copy layouts, logos, or on-image copy.`;

  const styleBrief = await extractStyleBriefFromImages(
    visionSources,
    packBriefWithCategory
  );

  const pinterestHitCount = pinterestAdCount + pinterestVisualCount;

  console.info(
    `[visual-research] category="${categoryHint}" pack=${pack.id} ` +
      `user=${userUrls.length} pinterest=${pinterestHitCount} ` +
      `bing=${bingCount} dribbble=${dribbbleCount} unsplash=${unsplashCount} ` +
      `arena=${arenaCount} openverse=${openverseCount} pack=${packFallbackCount} ` +
      `fal_refs=${referenceImageUrls.length} ` +
      `candidates=${candidates.length} ` +
      `pinterest_status=${pinterestDiag.lastStatus} err=${pinterestDiag.lastError ?? "none"}`
  );

  return {
    referenceImageUrls: mergeReferenceUrls(
      request.uploaded_image_urls,
      referenceImageUrls
    ),
    references,
    styleBrief,
    pack,
    categoryHint,
    pinterestEnabled: isPinterestConfigured(),
    pinterestHitCount,
    pinterestAdCount,
    pinterestVisualCount,
    pinterestStatus: pinterestDiag.lastStatus,
    pinterestError: pinterestDiag.lastError,
    bingCount,
    unsplashCount,
    arenaCount,
    dribbbleCount,
    openverseCount,
    queries,
  };
}
