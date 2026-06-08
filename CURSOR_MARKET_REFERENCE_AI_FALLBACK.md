# SM — Market Reference: AI Fallback (No Token Required)
## Cursor Brief

The Meta Ad Library integration requires `META_ACCESS_TOKEN` which isn't set. Currently the route returns `{ ads: [] }` silently — meaning SignalOps gets zero competitive context.

This brief adds an **AI-generated competitive landscape** as a fallback. The OpenRouter/Claude model already used by SignalOps has strong knowledge of Indian advertising — top brands, their ad approaches, typical copy, and category conventions. We use it to generate structured market context that feeds into SignalOps exactly the same way real Meta ads do.

When `META_ACCESS_TOKEN` is present → use it (existing behaviour, unchanged).
When absent → call the AI fallback → return structured `MetaMarketAd`-compatible data.

---

## PHASE 1 — AI FALLBACK IN MARKET-REFERENCE LIBRARY

**File:** `src/lib/sm/market-reference.ts`

Add this function at the bottom of the file:

```typescript
import { callAI } from "@/lib/ai";

export async function generateAiMarketContext(
  brand: string,
  category: string
): Promise<MetaMarketAd[]> {
  const prompt = `You are a senior advertising strategist with deep knowledge of Indian advertising.

Brand: ${brand}
Category: ${category}
Market: India

List the 5-6 most active competitor brands currently advertising in this category in India.
For each brand, describe one recent typical ad they run — the headline/copy approach, the emotional angle, and what makes it distinctive (or clichéd).

Respond ONLY with a JSON array. No explanation. No markdown fences. Example format:
[
  {
    "id": "ai_1",
    "page_name": "Mamaearth",
    "snapshot": {
      "title": "Natural se better kuch nahi",
      "body": { "text": "Gentle on baby skin. No harmful chemicals. Trusted by 1 crore moms. #MamaearthBaby — Lifestyle shot of mother applying lotion, warm light, emotional music. Heavy on 'natural ingredients' messaging." }
    }
  }
]

Return exactly this structure for each brand. page_name = brand name. snapshot.title = their typical headline. snapshot.body.text = describe their ad approach and copy style in 1-2 sentences.`;

  try {
    const raw = await callAI({
      system:
        "You are an advertising intelligence analyst. Return only valid JSON arrays.",
      user: prompt,
      maxTokens: 1200,
      temperature: 0.4,
    });

    // Strip markdown fences if present
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const parsed = JSON.parse(cleaned) as MetaMarketAd[];
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, 6);
  } catch {
    return [];
  }
}
```

---

## PHASE 2 — USE AI FALLBACK IN ROUTE

**File:** `src/app/api/sm/market-reference/route.ts`

Replace the early return when token is missing:

```typescript
// BEFORE:
if (!token) {
  return { ads: [] as MetaMarketAd[] };
}

// AFTER:
if (!token) {
  const { generateAiMarketContext } = await import("@/lib/sm/market-reference");
  const aiAds = await generateAiMarketContext(brand, category);
  return { ads: aiAds, source: "ai" };
}
```

Also add `source` to the response when using real Meta data:

```typescript
// At the end, change:
return { ads: deduped.slice(0, 8) };

// To:
return { ads: deduped.slice(0, 8), source: "meta" };
```

---

## PHASE 3 — SOURCE BADGE IN BRIEF FORM UI

**File:** `src/components/sm/CreativeBriefForm.tsx` (or wherever market reference results are displayed)

Find where market reference ads are rendered. Add a small source badge:

```tsx
{marketData?.source === "ai" && (
  <p className="text-xs text-zinc-600 mb-2 flex items-center gap-1">
    <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500/60" />
    AI-generated market context (connect Meta Ad Library for live data)
  </p>
)}
{marketData?.source === "meta" && (
  <p className="text-xs text-zinc-600 mb-2 flex items-center gap-1">
    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500/60" />
    Live Meta Ad Library
  </p>
)}
```

---

## PHASE 4 — UPDATE MARKET CONTEXT SUMMARY

**File:** `src/lib/sm/market-reference.ts`

The existing `buildMarketContextSummary` function already works for both real and AI ads since the shape is the same. No changes needed there.

However, prepend a note when AI-sourced so SignalOps knows:

```typescript
export function buildMarketContextSummary(
  ads: MetaMarketAd[],
  source: "meta" | "ai" = "meta"
): string {
  const prefix =
    source === "ai"
      ? "MARKET CONTEXT (AI-generated competitive landscape, India):\n"
      : "MARKET CONTEXT (Meta Ad Library, India):\n";

  const lines = ads
    .slice(0, 8)
    .map((ad) => {
      const copy =
        ad.snapshot?.body?.text?.trim() ||
        ad.snapshot?.title?.trim() ||
        "(visual-only ad)";
      return `${ad.page_name}: ${copy.slice(0, 150)}`;
    })
    .join("\n");

  return prefix + lines;
}
```

Update any callers of `buildMarketContextSummary` to pass the `source` param.

---

## WHAT THIS PRODUCES

**Before (no token):**
```
market_context: ""   ← SignalOps gets nothing
```

**After (no token, AI fallback):**
```
market_context:
"MARKET CONTEXT (AI-generated competitive landscape, India):
Mamaearth: Heavy 'natural ingredients' + 'toxin-free' messaging. Emotional mother-child imagery. 'Natural se better kuch nahi' positioning.
WOW Baby: Premium natural positioning, pastel aesthetics, ingredient callouts (Shea butter, Aloe vera). Doctor-recommended claims.
Johnsons Baby: Trust and legacy play. '100 years of gentle care'. Soft lighting, gentle touch, universal mother-baby bond.
Himalaya Baby: Ayurvedic heritage + modern safety. Herb imagery. 'Gentle as nature' copy. Strong pharmacy/doctor endorsement.
Sebamed Baby: Clinical positioning, pH 5.5 callout, dermatologist recommended. Minimal, clean visual style.
Chicco Baby: Premium import positioning. European heritage. 'Born in Italy, trusted worldwide'."
```

SignalOps uses this to ensure creative ideas don't repeat what competitors are doing — and to find the whitespace.

---

## COMMIT

```
feat(market-reference): add AI-generated competitive landscape fallback
feat(market-reference): no META_ACCESS_TOKEN required for market context
feat(market-reference/ui): add source badge (AI vs live Meta data)
feat(market-reference): pass source param to buildMarketContextSummary
```
