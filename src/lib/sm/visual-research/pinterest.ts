import "server-only";

export type PinterestPinRef = {
  url: string;
  pinId?: string;
  query: string;
};

export type PinterestSearchDiagnostics = {
  configured: boolean;
  lastStatus: number | null;
  lastError: string | null;
  lastTerm: string | null;
  pinCount: number;
};

let lastDiagnostics: PinterestSearchDiagnostics = {
  configured: false,
  lastStatus: null,
  lastError: null,
  lastTerm: null,
  pinCount: 0,
};

export function getPinterestDiagnostics(): PinterestSearchDiagnostics {
  return {
    ...lastDiagnostics,
    configured: isPinterestConfigured(),
  };
}

export function isPinterestConfigured(): boolean {
  return Boolean(process.env.PINTEREST_ACCESS_TOKEN?.trim());
}

function getPinterestToken(): string | null {
  return process.env.PINTEREST_ACCESS_TOKEN?.trim() || null;
}

function countryCodes(): string[] {
  const primary = (process.env.PINTEREST_COUNTRY_CODE?.trim() || "IN").toUpperCase();
  const codes = [primary];
  if (primary !== "US") codes.push("US");
  return codes;
}

/** Walk pin JSON for the largest usable image URL (pinimg / https). */
function extractImageUrl(item: unknown): string | null {
  const candidates: Array<{ url: string; score: number }> = [];

  const visit = (node: unknown, depth: number) => {
    if (depth > 8 || node == null) return;
    if (typeof node === "string") {
      if (/^https?:\/\//i.test(node) && /(?:pinimg\.com|\.jpg|\.jpeg|\.png|\.webp)/i.test(node)) {
        let score = 1;
        if (/pinimg\.com/i.test(node)) score += 5;
        if (/originals|orig|1200x|736x/i.test(node)) score += 4;
        if (/\/\d+x\d+\//i.test(node)) {
          const m = node.match(/\/(\d+)x(\d+)\//);
          if (m) score += Math.min(Number(m[1]) / 100, 20);
        }
        candidates.push({ url: node.split("?")[0], score });
      }
      return;
    }
    if (Array.isArray(node)) {
      for (const child of node) visit(child, depth + 1);
      return;
    }
    if (typeof node === "object") {
      const obj = node as Record<string, unknown>;
      // Prefer known keys first
      for (const key of ["url", "image_url", "image_large_url", "image_medium_url"]) {
        if (typeof obj[key] === "string") visit(obj[key], depth + 1);
      }
      for (const value of Object.values(obj)) visit(value, depth + 1);
    }
  };

  visit(item, 0);
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0].url;
}

async function searchPartnerPinsOnce(
  term: string,
  country: string,
  limit: number,
  token: string
): Promise<{ status: number; pins: PinterestPinRef[]; errorBody: string }> {
  const params = new URLSearchParams({
    term: term.trim().slice(0, 120),
    country_code: country,
    limit: String(Math.min(Math.max(limit, 1), 10)),
  });
  const locale = process.env.PINTEREST_LOCALE?.trim();
  if (locale) params.set("locale", locale);

  const res = await fetch(
    `https://api.pinterest.com/v5/search/partner/pins?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(12_000),
      cache: "no-store",
    }
  );

  const errorBody = res.ok ? "" : (await res.text().catch(() => "")).slice(0, 300);
  if (!res.ok) {
    return { status: res.status, pins: [], errorBody };
  }

  const json = (await res.json()) as { items?: unknown[]; data?: unknown[] };
  const items = Array.isArray(json.items)
    ? json.items
    : Array.isArray(json.data)
      ? json.data
      : [];

  const pins: PinterestPinRef[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const url = extractImageUrl(item);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    const pinId =
      item && typeof item === "object" && "id" in item
        ? String((item as { id: unknown }).id)
        : undefined;
    pins.push({ url, pinId, query: term });
    if (pins.length >= limit) break;
  }

  return { status: res.status, pins, errorBody: "" };
}

/**
 * Search Pinterest partner pins (beta). Soft-fails when token missing,
 * endpoint unavailable, or response unexpected. Retries US if IN fails.
 */
export async function searchPinterestPins(
  term: string,
  limit = 4
): Promise<PinterestPinRef[]> {
  const token = getPinterestToken();
  if (!token || !term.trim()) {
    lastDiagnostics = {
      configured: Boolean(token),
      lastStatus: null,
      lastError: token ? null : "PINTEREST_ACCESS_TOKEN missing",
      lastTerm: term || null,
      pinCount: 0,
    };
    return [];
  }

  let lastStatus: number | null = null;
  let lastError: string | null = null;

  try {
    for (const country of countryCodes()) {
      const result = await searchPartnerPinsOnce(term, country, limit, token);
      lastStatus = result.status;
      if (result.pins.length > 0) {
        lastDiagnostics = {
          configured: true,
          lastStatus: result.status,
          lastError: null,
          lastTerm: term,
          pinCount: result.pins.length,
        };
        console.info(
          `[visual-research/pinterest] "${term}" (${country}) → ${result.pins.length} pin image(s)`
        );
        return result.pins;
      }
      if (!result.status || result.status >= 400) {
        lastError = result.errorBody || `HTTP ${result.status}`;
        console.warn(
          `[visual-research/pinterest] "${term}" (${country}) failed HTTP ${result.status}: ${lastError}`
        );
        // Auth / beta access — don't keep hammering other countries with same token issue
        if (result.status === 401 || result.status === 403) break;
      } else {
        console.info(
          `[visual-research/pinterest] "${term}" (${country}) → 0 pins (empty page)`
        );
      }
    }
  } catch (error) {
    lastError = error instanceof Error ? error.message : String(error);
    console.warn("[visual-research/pinterest] soft-fail:", error);
  }

  lastDiagnostics = {
    configured: true,
    lastStatus,
    lastError,
    lastTerm: term,
    pinCount: 0,
  };
  return [];
}

export type PhasedPinterestQuery = {
  term: string;
  phase: "category_ads" | "visual_refs";
};

export type PhasedPinterestPinRef = PinterestPinRef & {
  phase: "category_ads" | "visual_refs";
};

/**
 * Run queries in order. Prefer filling the category-ads quota first,
 * then visual-reference quota. Soft-fails per query.
 */
export async function searchPinterestPhased(
  queries: PhasedPinterestQuery[],
  quotas: { categoryAds: number; visualRefs: number } = {
    categoryAds: 2,
    visualRefs: 2,
  }
): Promise<PhasedPinterestPinRef[]> {
  if (!isPinterestConfigured() || queries.length === 0) return [];

  const out: PhasedPinterestPinRef[] = [];
  const seen = new Set<string>();
  let ads = 0;
  let visuals = 0;

  for (const query of queries) {
    const quota =
      query.phase === "category_ads" ? quotas.categoryAds : quotas.visualRefs;
    const have = query.phase === "category_ads" ? ads : visuals;
    if (have >= quota) continue;

    const need = quota - have;
    const pins = await searchPinterestPins(query.term, Math.min(need + 2, 6));
    for (const pin of pins) {
      if (seen.has(pin.url)) continue;
      seen.add(pin.url);
      out.push({ ...pin, phase: query.phase });
      if (query.phase === "category_ads") ads += 1;
      else visuals += 1;
      if ((query.phase === "category_ads" ? ads : visuals) >= quota) break;
    }

    // If auth failed, stop the whole phased search
    const diag = getPinterestDiagnostics();
    if (diag.lastStatus === 401 || diag.lastStatus === 403) break;
  }

  console.info(
    `[visual-research/pinterest] phased result ads=${ads} visual_refs=${visuals} lastStatus=${lastDiagnostics.lastStatus} err=${lastDiagnostics.lastError ?? "none"}`
  );
  return out;
}

/** Run several queries and de-dupe until we have enough pins. */
export async function searchPinterestQueries(
  queries: string[],
  maxPins = 4
): Promise<PinterestPinRef[]> {
  if (!isPinterestConfigured() || queries.length === 0) return [];

  const out: PinterestPinRef[] = [];
  const seen = new Set<string>();

  for (const query of queries) {
    if (out.length >= maxPins) break;
    const need = maxPins - out.length;
    const pins = await searchPinterestPins(query, Math.min(need + 1, 5));
    for (const pin of pins) {
      if (seen.has(pin.url)) continue;
      seen.add(pin.url);
      out.push(pin);
      if (out.length >= maxPins) break;
    }
  }

  return out;
}
