import { smRouteHandler } from "@/lib/sm/api-auth";
import { isBingConfigured, searchBingImages } from "@/lib/sm/visual-research/bing";
import { isDribbbleConfigured } from "@/lib/sm/visual-research/dribbble";
import { mirrorRemoteImageToStorage } from "@/lib/sm/visual-research/mirror";
import { searchOpenverseImages } from "@/lib/sm/visual-research/openverse";
import {
  getPinterestDiagnostics,
  isPinterestConfigured,
  searchPinterestPins,
} from "@/lib/sm/visual-research/pinterest";
import { isUnsplashConfigured, searchUnsplashImages } from "@/lib/sm/visual-research/unsplash";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Diagnose multi-source visual research.
 * GET /api/sm/visual-research/health?q=yoga
 */
export async function GET(req: Request) {
  return smRouteHandler(req, async () => {
    const term =
      new URL(req.url).searchParams.get("q")?.trim() ||
      "best yoga class advertising campaign India";

    const pinterestConfigured = isPinterestConfigured();
    const pins = pinterestConfigured
      ? await searchPinterestPins(term, 2)
      : [];
    const diag = getPinterestDiagnostics();
    const betaBlocked = diag.lastStatus === 403 || diag.lastStatus === 401;
    const featureBlocked =
      typeof diag.lastError === "string" && diag.lastError.includes("pin_search");

    const [bingSample, unsplashSample, openverseSample] = await Promise.all([
      isBingConfigured() ? searchBingImages(term, 1) : Promise.resolve([]),
      isUnsplashConfigured()
        ? searchUnsplashImages("yoga studio natural light", 1)
        : Promise.resolve([]),
      searchOpenverseImages(term, 1),
    ]);

    let mirroredUrl: string | null = null;
    const firstRemote =
      pins[0]?.url || bingSample[0]?.url || unsplashSample[0]?.url || openverseSample[0]?.url;
    if (firstRemote) {
      mirroredUrl = await mirrorRemoteImageToStorage("health-check", firstRemote);
    }

    const anyLive =
      pins.length > 0 ||
      bingSample.length > 0 ||
      unsplashSample.length > 0 ||
      openverseSample.length > 0;

    return {
      ok: anyLive,
      term,
      sources: {
        pinterest: {
          configured: pinterestConfigured,
          status: diag.lastStatus,
          pinCount: pins.length,
          featureBlocked,
          betaBlocked,
          error: diag.lastError,
        },
        bing: {
          configured: isBingConfigured(),
          sampleCount: bingSample.length,
        },
        unsplash: {
          configured: isUnsplashConfigured(),
          sampleCount: unsplashSample.length,
        },
        arena: { configured: true, note: "public API; optional ARENA_ACCESS_TOKEN" },
        dribbble: { configured: isDribbbleConfigured() },
        openverse: {
          configured: true,
          sampleCount: openverseSample.length,
        },
      },
      mirroredUrl,
      message: anyLive
        ? "At least one visual research source returned images."
        : featureBlocked
          ? "Pinterest pin_search is blocked. Add BING_SEARCH_API_KEY and/or UNSPLASH_ACCESS_KEY for stronger coverage while waiting on Pinterest beta."
          : "No sources returned images. Check API keys or try another q= term.",
      nextStepPinterest:
        "https://developers.pinterest.com/apps/1597507/ → Standard upgrade + pin_search beta",
    };
  });
}
