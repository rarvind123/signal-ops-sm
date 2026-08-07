import "server-only";

const MAX_REFS = 4;
/** fal edit works best with 1–2 focused reference images */
const MAX_USER_REFS = 2;

function dedupeUrls(urls: string[]): string[] {
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

/** User uploads always win the first fal reference slots. */
export function mergeReferenceUrls(
  userUrls: string[] | undefined | null,
  researchUrls: string[] | undefined | null
): string[] {
  return dedupeUrls([...(userUrls ?? []), ...(researchUrls ?? [])]).slice(
    0,
    MAX_REFS
  );
}

/**
 * fal edit refs — when the user uploaded a reference, use ONLY those pixels.
 * Mixing stock yoga research refs dilutes / overrides the user's image.
 */
export function refsForFalEdit(
  userUrls: string[] | undefined | null,
  researchUrls: string[] | undefined | null
): { urls: string[]; userOnly: boolean } {
  const user = dedupeUrls(userUrls ?? []);
  if (user.length > 0) {
    return { urls: user.slice(0, MAX_USER_REFS), userOnly: true };
  }
  return {
    urls: dedupeUrls(researchUrls ?? []).slice(0, MAX_REFS),
    userOnly: false,
  };
}

export function hasUserReferences(
  userUrls: string[] | undefined | null,
  mergedUrls: string[]
): boolean {
  const user = new Set(dedupeUrls(userUrls ?? []));
  return mergedUrls.some((url) => user.has(url));
}

export function uploadFingerprint(urls: string[] | undefined | null): string {
  return dedupeUrls(urls ?? [])
    .map((u) => u.replace(/\?.*$/, ""))
    .sort()
    .join("|")
    .slice(0, 400);
}
