import { callAIVision, hasAnthropicApiKey } from "@/lib/ai";

export interface MandatoryElementsCheckResult {
  pass: boolean;
  missing: string[];
  notes: string;
}

/**
 * Vision check: does the generated image visibly include mandatory brief elements?
 * Uses Anthropic multimodal chat. Soft-fails (pass=true) if vision is unavailable.
 */
export async function checkMandatoryElementsInImage(
  imageUrl: string,
  mustInclude: string
): Promise<MandatoryElementsCheckResult> {
  const required = mustInclude.trim();
  if (!required || !imageUrl.trim()) {
    return { pass: true, missing: [], notes: "No mandatory elements to verify." };
  }

  if (!hasAnthropicApiKey()) {
    return { pass: true, missing: [], notes: "Vision check skipped — no API key." };
  }

  try {
    const raw = await callAIVision({
      system:
        "You validate advertising creatives. Return ONLY JSON: " +
        '{"pass":boolean,"missing":string[],"notes":string}. ' +
        "pass=true only if EVERY mandatory SCENE element is visually present and recognizable. " +
        "Ignore whether fee, price, location labels, or 'women only' appear as written text — those are overlay copy, not scene requirements. " +
        "For 'baby hands' / infant hands: adult-looking hands fail. " +
        "For ingredients/herbs: they must be clearly identifiable, not just generic greenery mood. " +
        "For a yoga tutor: a person clearly practicing yoga in a studio-like space is enough.",
      maxTokens: 400,
      temperature: 0.1,
      userContent: [
        {
          type: "text",
          text:
            `Mandatory SCENE elements that MUST appear (as people/objects/setting, NOT as written words):\n${required}\n\n` +
            `Check visual presence only. Do not fail for missing on-image typography.`,
        },
        {
          type: "image",
          source: { type: "url", url: imageUrl },
        },
      ],
    });

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { pass: true, missing: [], notes: "Vision check unparseable — allowing." };
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      pass?: boolean;
      missing?: string[];
      notes?: string;
    };

    return {
      pass: Boolean(parsed.pass),
      missing: Array.isArray(parsed.missing) ? parsed.missing.map(String) : [],
      notes: typeof parsed.notes === "string" ? parsed.notes : "",
    };
  } catch (error) {
    console.warn("[mandatory-elements-check] soft-fail:", error);
    return { pass: true, missing: [], notes: "Vision check error — allowing." };
  }
}

/** Build a reinforcement prompt fragment from failed mandatory checks. */
export function mandatoryRetrySuffix(mustInclude: string, missing: string[]): string {
  const focus = missing.length > 0 ? missing.join(", ") : mustInclude;
  return (
    `REGENERATION REQUIREMENT — previous image failed validation. ` +
    `These SCENE elements were missing or inaccurate and MUST be unmistakable primary subjects: ${focus}. ` +
    `Depict them visually only — never as written words, captions, posters, or price tags.`
  );
}
