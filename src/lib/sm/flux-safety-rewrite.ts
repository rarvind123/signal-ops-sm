const BABY_TERMS =
  /\b(newborn|new-born|infants?|bab(?:y|ies)|neonate|neonatal)\b/i;
const SKIN_HEAVY_TERMS =
  /\b(fists?|hands?|handprint|finger(?:s|tips)?|palms?|skin|close[- ]?up|extreme\s+close|macro(?:\s+shot)?)\b/i;
const HAND_TERMS = /\b(fists?|hands?|handprint|finger(?:s|tips)?|palms?)\b/i;
const ELDER_TERMS =
  /\b(grandmother|grandma|nan(?:ny)?|elderly|old\s+lad(?:y|ies)|aged|weathered)\b/i;

const NON_SKIN_SUBJECT_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bherb[a-z-]*\s+(?:green\s+)?lines?\b/i, label: "herb-green botanical lines" },
  { pattern: /\bbotanical\s+(?:texture|detail|pattern)\b/i, label: "botanical texture" },
  { pattern: /\bplant\s+(?:texture|detail|pattern|life)\b/i, label: "plant texture" },
  { pattern: /\bnatural\s+(?:texture|pattern|element|detail)\b/i, label: "natural texture" },
  { pattern: /\b(?:leaf|leaves)\s+(?:pattern|texture|detail)\b/i, label: "leaf texture" },
  { pattern: /\b(?:flower|petals?|blossom)\b/i, label: "flower detail" },
  { pattern: /\b(?:fabric|textile|cloth|linen)\b/i, label: "fabric texture" },
  { pattern: /\b(?:wood|wooden|stone|pebble|moss|grass|seedling|stem|vine)\b/i, label: "natural material texture" },
  { pattern: /\b(?:object|texture|pattern|residue|impossible\s+element)\b/i, label: "environmental texture" },
];

export function isBabySkinHeavyPrompt(text: string): boolean {
  const normalized = text.trim();
  if (!normalized) return false;
  return BABY_TERMS.test(normalized) && SKIN_HEAVY_TERMS.test(normalized);
}

export function mustIncludeRequestsHands(mustInclude?: string | null): boolean {
  if (!mustInclude?.trim()) return false;
  return HAND_TERMS.test(mustInclude);
}

export function mustIncludeRequestsInfantSubject(mustInclude?: string | null): boolean {
  if (!mustInclude?.trim()) return false;
  return BABY_TERMS.test(mustInclude) && HAND_TERMS.test(mustInclude);
}

export function softenCloseUpLanguage(text: string): string {
  return text
    .replace(/\bextreme\s+close[- ]?up\b/gi, "close-up")
    .replace(/\bextreme\s+macro\b/gi, "close-up")
    .replace(/\bmacro\s+shot\b/gi, "close-up shot");
}

function findNonSkinSubject(text: string): string | null {
  for (const { pattern, label } of NON_SKIN_SUBJECT_PATTERNS) {
    const match = text.match(pattern);
    if (match) return match[0].trim();
  }
  return null;
}

function demoteBodyPartLanguage(text: string): string {
  return text
    .replace(
      /\b(?:mother'?s?|maternal|parent'?s?)\s+(?:and\s+)?(?:newborn'?s?|infant'?s?|baby'?s?)\s+(?:palms?|hands?|fists?|fingers?)\s+pressed\s+together\b/gi,
      "soft peripheral suggestion of maternal-newborn connection in background blur"
    )
    .replace(
      /\b(?:newborn'?s?|infant'?s?|baby'?s?)\s+(?:and\s+)?(?:mother'?s?|maternal)\s+(?:palms?|hands?|fists?|fingers?)\b/gi,
      "soft peripheral maternal-newborn presence in background"
    )
    .replace(
      /\b(?:palms?|hands?|fists?|fingers?)\s+(?:of\s+)?(?:a\s+)?(?:mother|newborn|infant|baby)[^.]*\b/gi,
      "peripheral background suggestion only"
    )
    .replace(/\b(?:extreme\s+)?close[- ]?up\s+(?:macro\s+)?(?:shot\s+)?of\s+(?:a\s+)?(?:mother'?s?|newborn'?s?|infant'?s?|baby'?s?)\s+(?:and\s+)?(?:newborn'?s?|mother'?s?|infant'?s?|baby'?s?)?\s*(?:palms?|hands?|fists?|fingers?|skin)\b/gi,
      "close-up with environmental or botanical foreground subject"
    )
    .replace(/\bprimary\s+subject:\s*(?:palms?|hands?|fists?|fingers?|skin)\b/gi,
      "primary subject: environmental texture"
    );
}

function stripLeadingBodyCentricOpener(text: string): string {
  return text
    .replace(
      /^(?:close[- ]?up|macro|extreme)[^.]*\b(?:palms?|hands?|fists?|fingers?|skin|newborn|infant|baby)\b[^.]*\.\s*/i,
      ""
    )
    .trim();
}

/** Safer framing when the user explicitly required infant/hands in must_include. */
export function rewriteExplicitInfantHandsScene(
  sceneDescription: string,
  mustInclude: string,
  impossibleElement?: string | null
): string {
  const softened = softenCloseUpLanguage(sceneDescription);
  const elder = ELDER_TERMS.test(mustInclude) || ELDER_TERMS.test(softened);
  const subject = elder
    ? "an elderly grandmother's weathered hand gently near a realistic infant's small chubby hand — clear age contrast, both hands clearly present"
    : "a realistic infant hand with accurate baby proportions (chubby short fingers, soft rounded knuckles, small palm) — unmistakably a baby, not an adult hand";

  const parts = [
    `Mid-shot to three-quarter close-up (not extreme macro). PRIMARY SUBJECT: ${subject}.`,
    softened ? `Scene context: ${softened}` : null,
    impossibleElement?.trim()
      ? `Impossible element must remain visible: ${impossibleElement.trim()}.`
      : null,
    `Mandatory brief elements that MUST remain visible and accurate: ${mustInclude.trim()}.`,
    "Soft diffused natural light. Tasteful commercial framing. No extreme skin-pore macro. No adult hands substituted for the infant hand.",
  ].filter(Boolean);

  return parts.join(" ");
}

export function rewriteBabySkinHeavyScene(
  sceneDescription: string,
  impossibleElement?: string | null
): string {
  const softened = softenCloseUpLanguage(sceneDescription);
  const demoted = demoteBodyPartLanguage(softened);
  const remainder = stripLeadingBodyCentricOpener(demoted);

  const nonSkinSubject = findNonSkinSubject(softened) ?? findNonSkinSubject(impossibleElement ?? "");
  const primary =
    impossibleElement?.trim() ||
    nonSkinSubject ||
    "natural botanical or environmental texture";

  const parts = [
    `Close-up. PRIMARY SUBJECT: ${primary} — sharp foreground focus, dominant in frame.`,
    remainder ? `Scene context: ${remainder}` : null,
    "Infant or maternal presence is peripheral background only, softly out of focus — not the main subject.",
    "No detailed skin texture. No hands, fists, or fingers as the primary focus.",
  ].filter(Boolean);

  return parts.join(" ");
}

export function rewriteFluxSceneForSafety(
  sceneDescription: string,
  impossibleElement?: string | null,
  mustInclude?: string | null
): { text: string; rewritten: boolean } {
  const trimmed = sceneDescription.trim();
  if (!trimmed) {
    return { text: trimmed, rewritten: false };
  }

  // User explicitly required infant/hands — keep the subject, use safer framing.
  if (mustIncludeRequestsInfantSubject(mustInclude)) {
    return {
      text: rewriteExplicitInfantHandsScene(trimmed, mustInclude!, impossibleElement),
      rewritten: true,
    };
  }

  const combined = `${trimmed} ${mustInclude ?? ""}`;
  if (!isBabySkinHeavyPrompt(combined) && !isBabySkinHeavyPrompt(trimmed)) {
    return { text: softenCloseUpLanguage(trimmed), rewritten: false };
  }

  // Auto-generated baby/hand language without explicit must_include — demote for safety.
  return {
    text: rewriteBabySkinHeavyScene(trimmed, impossibleElement),
    rewritten: true,
  };
}
