/**
 * Split brief "must include" into scene subjects (for the image model)
 * vs copy/facts (for text overlay after generation — never baked into pixels).
 */

export type SplitMustInclude = {
  /** Visual subjects / setting cues for the image model */
  sceneSubjects: string[];
  /** Fee, location labels, audience lines — belong in overlay/copy, not pixels */
  copyFacts: string[];
};

const COPY_FACT_RE =
  /\b(fee|price|cost|inr|rs\.?|₹|rupees?|offer|discount|trial|monthly|subscription|promo|coupon|code)\b|\bfor\s+women\s+only\b|\bwomen\s+only\b|\bladies\s+only\b|\bmens?\s+only\b|\bmust\s+include\b/i;

const LOCATION_LABEL_RE =
  /\b(location|address|area|near|jp\s*nagar|indiranagar|koramangala|whitefield|hsr|jayanagar)\b/i;

const SCENE_SUBJECT_RE =
  /\b(tutor|teacher|instructor|yoga|pose|stretch|shadow|studio|woman|women|man|person|people|hands?|baby|infant|ingredient|herb|product|face|mat|floor|window|light)\b/i;

function splitRawItems(raw: string): string[] {
  return raw
    .split(/[\n;|]+|(?:,\s*(?=[A-Z]))/)
    .flatMap((chunk) => chunk.split(/\s{2,}/))
    .map((s) => s.replace(/^[-•*\d.)\s]+/, "").trim())
    .filter((s) => s.length >= 2);
}

/** Soft split on commas when items look list-like. */
function expandCommaList(items: string[]): string[] {
  const out: string[] = [];
  for (const item of items) {
    if (item.includes(",") && item.length > 40) {
      const parts = item
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p.length >= 2);
      if (parts.length >= 2) {
        out.push(...parts);
        continue;
      }
    }
    out.push(item);
  }
  return out;
}

function isCopyFact(item: string): boolean {
  const t = item.trim();
  if (!t) return false;
  if (COPY_FACT_RE.test(t)) return true;
  // Pure price / number lines: "INR 600", "₹600", "600/-"
  if (/^(fee\s*)?(inr|rs\.?|₹)?\s*\d[\d,]*(?:\.\d+)?\s*\/?-?$/i.test(t)) return true;
  // "Location: JP Nagar" style labels without a visual verb
  if (LOCATION_LABEL_RE.test(t) && !SCENE_SUBJECT_RE.test(t)) return true;
  if (/^location\b/i.test(t)) return true;
  return false;
}

function isSceneSubject(item: string): boolean {
  const t = item.trim();
  if (!t) return false;
  if (isCopyFact(t) && !SCENE_SUBJECT_RE.test(t)) return false;
  // "Yoga studio tutor doing yoga" → scene
  if (SCENE_SUBJECT_RE.test(t)) return true;
  // Default unknown short phrases to scene (safer for ingredients / props)
  if (!COPY_FACT_RE.test(t) && !LOCATION_LABEL_RE.test(t)) return true;
  return false;
}

/**
 * Convert a location/copy-ish line into a setting cue when useful for the scene.
 * e.g. "Yoga studio Location JP nagar" → "yoga studio set in JP Nagar"
 */
const PLACE_STOPWORDS = new Set([
  "yoga",
  "studio",
  "location",
  "tutor",
  "teacher",
  "instructor",
  "women",
  "woman",
  "only",
  "fee",
  "for",
  "doing",
  "class",
  "trial",
  "monthly",
]);

function locationAsSettingCue(item: string): string | null {
  const t = item.trim();
  if (!LOCATION_LABEL_RE.test(t)) return null;
  const knownPlace = t.match(
    /\b(jp\s*nagar|indiranagar|koramangala|whitefield|hsr(?:\s*layout)?|jayanagar)\b/i
  )?.[0];
  const genericPlace = !knownPlace
    ? t.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g)?.find((candidate) => {
        const words = candidate.toLowerCase().split(/\s+/);
        return words.every((w) => !PLACE_STOPWORDS.has(w));
      })
    : null;
  const place = knownPlace ?? genericPlace ?? null;
  if (/yoga\s*studio/i.test(t) && place) {
    return `yoga studio interior set in ${place}`;
  }
  if (place) return `setting in ${place}`;
  if (/yoga\s*studio/i.test(t)) return "yoga studio interior";
  return null;
}

export function splitMustInclude(raw?: string | null): SplitMustInclude {
  const required = raw?.trim();
  if (!required) return { sceneSubjects: [], copyFacts: [] };

  const items = expandCommaList(splitRawItems(required));
  const sceneSubjects: string[] = [];
  const copyFacts: string[] = [];
  const seenScene = new Set<string>();
  const seenCopy = new Set<string>();

  for (const item of items) {
    const settingCue = locationAsSettingCue(item);
    if (settingCue && !seenScene.has(settingCue.toLowerCase())) {
      seenScene.add(settingCue.toLowerCase());
      sceneSubjects.push(settingCue);
    }

    if (isCopyFact(item)) {
      const key = item.toLowerCase();
      if (!seenCopy.has(key)) {
        seenCopy.add(key);
        copyFacts.push(item);
      }
      // Also keep visual half when mixed ("Yoga studio Location JP nagar")
      if (SCENE_SUBJECT_RE.test(item) && !settingCue) {
        const visualOnly = item
          .replace(/\blocation\b[:\s]*/gi, "")
          .replace(/\b(fee|price|inr|rs\.?|₹)\b[^,]*/gi, "")
          .replace(/\bfor\s+women\s+only\b/gi, "")
          .trim();
        if (visualOnly.length >= 3 && isSceneSubject(visualOnly)) {
          const sk = visualOnly.toLowerCase();
          if (!seenScene.has(sk)) {
            seenScene.add(sk);
            sceneSubjects.push(visualOnly);
          }
        }
      }
      continue;
    }

    if (isSceneSubject(item)) {
      const key = item.toLowerCase();
      if (!seenScene.has(key)) {
        seenScene.add(key);
        sceneSubjects.push(item);
      }
    }
  }

  // Whole-string fallback: if nothing classified, treat non-copy whole as scene
  if (sceneSubjects.length === 0 && copyFacts.length === 0) {
    if (isCopyFact(required)) copyFacts.push(required);
    else sceneSubjects.push(required);
  }

  return { sceneSubjects, copyFacts };
}

/** Prompt fragment for image models — visual subjects only, never as written words. */
export function sceneMustIncludeClause(raw?: string | null): string | null {
  const { sceneSubjects } = splitMustInclude(raw);
  if (sceneSubjects.length === 0) return null;
  return (
    `HIGHEST PRIORITY — depict these as SCENE CONTENT (people, objects, setting), ` +
    `never as written words, captions, posters, or signage: ${sceneSubjects.join("; ")}.`
  );
}

/** Facts for post-gen text overlay (fee, audience, location labels). */
export function copyFactsOverlayText(raw?: string | null): string | null {
  const { copyFacts } = splitMustInclude(raw);
  if (copyFacts.length === 0) return null;
  return copyFacts.join(" · ");
}

/** Scene-only string for vision validation (skip fee/location text checks). */
export function sceneMustIncludeForCheck(raw?: string | null): string | null {
  const { sceneSubjects } = splitMustInclude(raw);
  if (sceneSubjects.length === 0) return null;
  return sceneSubjects.join("; ");
}
