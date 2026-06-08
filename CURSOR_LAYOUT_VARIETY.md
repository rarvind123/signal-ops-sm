# SM — Layout Templates + Composition Rules + Meta Ad Reference
## Cursor Brief

Three fixes to eliminate template repetition and ground creatives in real market context.

---

## FIX 1 — 5 LAYOUT TEMPLATES

SignalOps picks a layout template that determines: where the image sits, where the text sits, whether a brand color band is used, and where the logo goes. No more "white band below image" every time.

### 1A — Add layout_template to SignalOps output

**File:** `src/types/sm.ts`

```typescript
export type SMLayoutTemplate =
  | 'full_bleed_gradient'    // Image fills full frame, text overlaid with gradient
  | 'brand_band_bottom'      // Image top 65%, brand color band bottom 35%
  | 'brand_band_left'        // Image right 60%, brand color column left 40%
  | 'type_forward'           // Large type top 50%, image bottom 50%
  | 'full_bleed_top_text';   // Image full frame, text top-anchored (reversed gradient)

export interface SMSignalOpsOutput {
  // ... existing fields ...
  layout_template: SMLayoutTemplate;  // ← ADD
  layout_rationale: string;           // ← ADD: why this layout for this creative
}
```

### 1B — SignalOps selects the layout

**File:** `src/lib/sm/signalops-engine.ts`

Add to the user prompt JSON schema:

```
"layout_template": "full_bleed_gradient | brand_band_bottom | brand_band_left | type_forward | full_bleed_top_text",
"layout_rationale": "Why this layout fits this brief and brand"
```

Add to system prompt under a new **PILLAR 6 — LAYOUT SELECTION** section:

```
PILLAR 6 — LAYOUT SELECTION

Every creative has a compositional structure. You must choose one — and vary it across creatives for the same brand.

LAYOUT OPTIONS:

FULL BLEED GRADIENT — Image fills the entire frame. Text overlaid in the lower third with a gradient. Logo top-right. Best for: concept-first, effects-visible, emotional scenes. Most versatile.

BRAND BAND BOTTOM — Image fills top 65% of frame. Brand's primary color as a solid band in the bottom 35%. White text in the band. Logo in the band. Best for: product-adjacent content, campaigns with strong color identity, warm/premium brands.

BRAND BAND LEFT — Image fills the right 60% of frame. Brand's primary color as a vertical column on the left 40%. Text in the left column, stacked vertically. Logo at bottom-left. Best for: documentary, professional, LinkedIn-first content.

TYPE FORWARD — Large headline dominates the top 50% of the frame (over a clean/minimal background). Small supporting image in the bottom 50%. Best for: text-heavy concept, bold/urgent brands, when the headline IS the idea.

FULL BLEED TOP TEXT — Image fills the entire frame. Text anchored at the top with a reversed gradient (dark from top, fades down). Logo bottom-right. Best for: when the image's lower half is the strongest visual element, outdoor-inspired.

SELECTION RULES:
1. Never select the same layout twice in a row for the same client
2. brand_band_bottom should use the brand's actual primary color — not white
3. brand_band_left is the most "magazine" and differentiating — use it more than expected
4. type_forward should only be chosen when the headline is 7 words or fewer and very strong
5. Check what layouts were recently used for this client and pick an underused one
```

### 1C — AssetCard renders the correct layout

**File:** `src/components/sm/AssetCard.tsx`

The overlay config must read `layout_template` from the asset's signalops output. Since we don't currently pass this to AssetCard, add it to `SMGeneratedAsset`:

```typescript
// In types/sm.ts:
export interface SMGeneratedAsset {
  // ... existing ...
  layout_template?: SMLayoutTemplate;  // ← ADD: stored from signalops at generation time
}
```

Store `layout_template` on the asset when generating:
```typescript
// In generate route, when creating the asset:
await createGeneratedAsset({
  ...assetData,
  layout_template: signalops.layout_template,
});
```

Add `layout_template` column to DB:
```sql
ALTER TABLE sm_generated_assets ADD COLUMN IF NOT EXISTS layout_template TEXT;
```

Update `getOverlayConfig` in `AssetCard.tsx` to use `layout_template`:

```tsx
function getOverlayConfig(
  layoutTemplate: SMLayoutTemplate | undefined,
  brandColor: string | null,
  creativeFormat?: SMCreativeFormat
) {
  const color = brandColor ?? '#1a1a1a';
  const isLight = isColorReadableOnDark(color) === false; // light brand color
  const textColor = isLight ? '#000000' : '#ffffff';

  switch (layoutTemplate) {
    case 'brand_band_bottom':
      return {
        // No gradient — solid brand color band
        gradientStyle: 'none',
        containerPosition: 'absolute bottom-0 left-0 right-0',
        bandStyle: { background: color, height: '35%' },
        textPosition: 'flex flex-col justify-center px-5 h-full',
        textColor,
        logoPosition: 'bottom-right',
        logoInBand: true,
      };

    case 'brand_band_left':
      return {
        gradientStyle: 'none',
        containerPosition: 'absolute top-0 left-0 bottom-0 w-2/5',
        bandStyle: { background: color },
        textPosition: 'flex flex-col justify-end p-4 h-full',
        textColor,
        logoPosition: 'bottom-left',
        logoInBand: true,
      };

    case 'type_forward':
      return {
        // Text at top over semi-transparent dark overlay
        gradientStyle: 'linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.4) 45%, transparent 100%)',
        containerPosition: 'absolute top-0 left-0 right-0',
        textPosition: 'px-5 pt-5',
        textColor: '#ffffff',
        logoPosition: 'top-right',
        logoInBand: false,
      };

    case 'full_bleed_top_text':
      return {
        gradientStyle: 'linear-gradient(to bottom, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.35) 40%, transparent 100%)',
        containerPosition: 'absolute top-0 left-0 right-0',
        textPosition: 'px-5 pt-5',
        textColor: '#ffffff',
        logoPosition: 'bottom-right',
        logoInBand: false,
      };

    default: // full_bleed_gradient
      return {
        gradientStyle: 'linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.4) 45%, transparent 100%)',
        containerPosition: 'absolute bottom-0 left-0 right-0',
        textPosition: 'px-5 pb-5 pt-10',
        textColor: '#ffffff',
        logoPosition: 'top-right',
        logoInBand: false,
      };
  }
}
```

Apply in `AssetCard`:
```tsx
const config = getOverlayConfig(
  localAsset.layout_template,
  getBrandAccentColor(client),
  creativeFormat
);
```

Also pass `layout_template` to the FLUX prompt so the image is generated with the right composition:

**File:** `src/lib/sm/asset-generator.ts`

```typescript
const layoutCompositionNote = (() => {
  switch (signalops.layout_template) {
    case 'brand_band_bottom':
      return 'vertical portrait, subject fills top 65% of frame, bottom 35% is deliberately clean and simple — minimal visual detail in the lower section';
    case 'brand_band_left':
      return 'subject positioned in the right 60% of frame, left 40% should have soft background with minimal detail — space for text column';
    case 'type_forward':
      return 'minimal scene, clean background, subject small or partial in lower half — upper half is open, clean, high contrast';
    case 'full_bleed_top_text':
      return 'vertical portrait, strongest visual element in the lower 60% of frame, upper 40% is relatively open sky or background — text will sit at top';
    default: // full_bleed_gradient
      return 'vertical portrait, subject anchored in the middle-to-upper frame, clear negative space in the lower third for text overlay';
  }
})();
```

---

## FIX 2 — META AD LIBRARY REFERENCE

Pull active ads from the same brand category before generating. The account manager sees what competitors are running — SignalOps uses this as "what's already in the market, differentiate from these."

### 2A — Ad reference search on the Brief step

**File:** `src/components/sm/CreativeBriefForm.tsx`

After the user enters the brief text, show a "See what's in market" section that fetches Meta Ad Library results:

```tsx
const [marketAds, setMarketAds] = useState<any[]>([]);
const [loadingMarket, setLoadingMarket] = useState(false);
const [marketSearched, setMarketSearched] = useState(false);

async function searchMarketAds() {
  if (!client.name || marketSearched) return;
  setLoadingMarket(true);
  try {
    const res = await fetch(`/api/sm/market-reference?brand=${encodeURIComponent(client.name)}&category=${encodeURIComponent(productService || client.usp || '')}`);
    const data = await res.json();
    setMarketAds(data.ads ?? []);
    setMarketSearched(true);
  } catch {
    // silently fail
  } finally {
    setLoadingMarket(false);
  }
}

// Trigger after user finishes typing brief
useEffect(() => {
  const timer = setTimeout(() => {
    if (brief.length > 20 && !marketSearched) searchMarketAds();
  }, 1500);
  return () => clearTimeout(timer);
}, [brief]);
```

Show market reference below the brief:
```tsx
{marketAds.length > 0 && (
  <div className="flex flex-col gap-2">
    <p className="text-xs text-zinc-500">
      What's currently running in this category — SignalOps will differentiate from these
    </p>
    <div className="flex gap-2 overflow-x-auto pb-1">
      {marketAds.slice(0, 6).map((ad, i) => (
        <div key={i} className="flex-shrink-0 w-20 rounded overflow-hidden bg-zinc-800 border border-zinc-700">
          {ad.snapshot?.images?.[0]?.original_image_url && (
            <img
              src={ad.snapshot.images[0].original_image_url}
              alt=""
              className="w-full h-20 object-cover"
            />
          )}
          <p className="text-xs text-zinc-500 px-1.5 py-1 truncate">{ad.page_name}</p>
        </div>
      ))}
    </div>
  </div>
)}
```

### 2B — Market reference API

**File:** `src/app/api/sm/market-reference/route.ts`

```typescript
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const brand = url.searchParams.get('brand') ?? '';
  const category = url.searchParams.get('category') ?? '';

  // Search Meta Ad Library for this brand + related brands
  const searchTerms = [brand, ...getCategoryBrands(brand)].slice(0, 3);
  
  const allAds: any[] = [];

  for (const term of searchTerms) {
    try {
      const metaRes = await fetch(
        `https://graph.facebook.com/v21.0/ads_archive?` +
        `search_terms=${encodeURIComponent(term)}&` +
        `ad_reached_countries=IN&` +
        `ad_type=ALL&` +
        `fields=id,page_name,snapshot,spend&` +
        `limit=4&` +
        `access_token=${process.env.META_ACCESS_TOKEN ?? ''}`,
        { next: { revalidate: 3600 } }
      );
      if (metaRes.ok) {
        const data = await metaRes.json();
        allAds.push(...(data.data ?? []));
      }
    } catch {
      // silently fail per term
    }
  }

  return NextResponse.json({ ads: allAds.slice(0, 8) });
}

// Known competitor brands by category keywords
function getCategoryBrands(brandName: string): string[] {
  const bn = brandName.toLowerCase();
  if (bn.includes('himalaya') || bn.includes('baby') || bn.includes('mama')) {
    return ['Mamaearth baby', 'WOW Baby', 'Johnsons baby India'];
  }
  if (bn.includes('fevicol') || bn.includes('adhesive') || bn.includes('pidilite')) {
    return ['Pidilite', 'Araldite India'];
  }
  if (bn.includes('rcb') || bn.includes('cricket') || bn.includes('ipl')) {
    return ['Dream11', 'IPL India'];
  }
  return []; // Unknown brand — search only the brand itself
}
```

Add `META_ACCESS_TOKEN` to Vercel env vars — use your existing Meta MCP token. This is the same Facebook access token used for ad management.

### 2C — Pass market context to SignalOps

When market ads are found, include them as context in the SignalOps brief:

```typescript
// In buildBriefContext:
const marketContext = marketAdSummary
  ? `\nMARKET REFERENCE — What competitors are currently running in India (differentiate from these):\n${marketAdSummary}`
  : '';
```

Pass `marketAdSummary` from the creative request (add a field `market_context?: string` to `SMCreativeRequest` and store it when the brief is submitted with market ads available).

---

## FIX 3 — PORTRAIT COMPOSITION RULES IN SCENE DESCRIPTIONS

**File:** `src/lib/sm/signalops-engine.ts`

Add to the Visual Approach PILLAR 5 system prompt, after the MAXIMUM ECONOMY RULE:

```
PORTRAIT COMPOSITION RULES (applies to all social media creatives):

Instagram and social media posts are vertical (4:5 or 9:16 ratio). You are always generating for a vertical portrait frame.

VERTICAL COMPOSITION REQUIREMENTS — your scene_description must follow these:

1. SUBJECT PLACEMENT: The main subject must be positioned in the CENTER or LOWER-CENTER of the vertical frame. Never describe a subject "in the distance" or "small in the frame" — they will disappear in portrait crop.

2. UPPER THIRD: The upper third of the frame should be intentionally described. Options:
   - Open sky (warm, cool, dramatic — specific)
   - Architectural element (doorway top, ceiling, wall)
   - Natural canopy (branches, leaves, light through trees)
   - Clean gradient background
   Avoid: putting important visual elements in the upper third (they may be cropped)

3. LOWER THIRD: This is where text will sit. Always describe the lower portion of the scene as having natural breathing room — not the most detailed or busy part of the image.

4. DEPTH: Describe foreground-to-background depth. A subject in the mid-ground with a soft background creates better portrait compositions than a subject far in the background.

5. COMPOSITION WORDS TO USE: "fills the center of the frame", "positioned in the lower-center", "close portrait crop", "subject is primary focus from shoulder height", "vertical composition"

COMPOSITION TEST: Read your scene_description aloud. Could a photographer understand exactly where to stand, where to aim, and what the vertical crop would capture? If not, add positional specificity.
```

Also add to `buildImageGenerationPrompt` in `asset-generator.ts`:

```typescript
// After the scene description, add portrait composition rules:
const portraitRule = 'vertical portrait composition 4:5 aspect ratio, subject positioned center-frame filling majority of vertical space, natural breathing room in upper and lower thirds';
```

---

## DB MIGRATION

```sql
ALTER TABLE sm_generated_assets ADD COLUMN IF NOT EXISTS layout_template TEXT;
ALTER TABLE sm_signalops_outputs ADD COLUMN IF NOT EXISTS layout_template TEXT;
ALTER TABLE sm_signalops_outputs ADD COLUMN IF NOT EXISTS layout_rationale TEXT;
ALTER TABLE sm_creative_requests ADD COLUMN IF NOT EXISTS market_context TEXT;
```

---

## COMMIT SEQUENCE

```
feat(layout): add 5 layout templates — SignalOps selects, FLUX generates accordingly
feat(layout/db): add layout_template to generated assets and signalops outputs
feat(layout/ui): AssetCard renders brand_band_bottom, brand_band_left, type_forward, full_bleed_top_text
feat(layout): pass layout composition instructions into FLUX image prompt
feat(market): Meta Ad Library reference on brief step — shows competitor ads for context
feat(market/api): GET /api/sm/market-reference — fetches active ads from Meta Ad Library
feat(market): pass market context to SignalOps for differentiation
feat(composition): portrait composition rules in SignalOps scene description prompt
feat(composition): vertical composition guidelines in FLUX prompt builder
```
