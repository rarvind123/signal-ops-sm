# SM — Print Ad & Outdoor Size Selection at Brief Stage
## Cursor Brief

When the user selects Print Ad or Outdoor as the creative format, show a size picker before they write the brief. The chosen size affects: FLUX aspect ratio, SignalOps composition instructions, and download resolution.

---

## PHASE 1 — SIZE DEFINITIONS

**File:** `src/lib/sm/ad-sizes.ts` (new file)

```typescript
export interface AdSize {
  id: string;
  label: string;
  dimensions: string;         // e.g. "210 × 297 mm"
  aspect_ratio: string;       // e.g. "3:4" — for FLUX
  composition_note: string;   // injected into FLUX prompt
  common_use: string;         // shown as helper text
}

export const PRINT_AD_SIZES: AdSize[] = [
  {
    id: 'a4_portrait',
    label: 'A4 Portrait',
    dimensions: '210 × 297 mm',
    aspect_ratio: '3:4',
    composition_note: 'A4 portrait orientation, full bleed, text-safe margins of at least 5mm on all sides',
    common_use: 'Magazine, newspaper inserts, flyers',
  },
  {
    id: 'a4_landscape',
    label: 'A4 Landscape',
    dimensions: '297 × 210 mm',
    aspect_ratio: '4:3',
    composition_note: 'A4 landscape orientation, horizontal composition, subject positioned for wide reading',
    common_use: 'Brochures, table cards',
  },
  {
    id: 'a3_portrait',
    label: 'A3 Portrait',
    dimensions: '297 × 420 mm',
    aspect_ratio: '3:4',
    composition_note: 'A3 portrait, large format — composition must work at poster scale, bold elements',
    common_use: 'Posters, in-store displays',
  },
  {
    id: 'half_page',
    label: 'Half Page',
    dimensions: '210 × 148 mm',
    aspect_ratio: '3:2',
    composition_note: 'Half-page horizontal, compact layout — headline must be immediately readable',
    common_use: 'Newspaper half-page ads',
  },
  {
    id: 'full_page_tabloid',
    label: 'Tabloid Full Page',
    dimensions: '280 × 400 mm',
    aspect_ratio: '7:10',
    composition_note: 'Tabloid full page, vertical — bold headline, single strong visual, clear hierarchy',
    common_use: 'Newspaper full page (Mumbai Mirror, Midday)',
  },
];

export const OUTDOOR_AD_SIZES: AdSize[] = [
  {
    id: 'billboard_standard',
    label: 'Billboard',
    dimensions: '14 × 48 ft',
    aspect_ratio: '16:9',
    composition_note: 'Standard billboard, extreme widescreen — 3-second read at 60km/h. Subject far left OR far right, headline OPPOSITE side. Maximum 7 words. No body copy.',
    common_use: 'Highway billboards, large outdoor hoardings',
  },
  {
    id: 'hoarding_large',
    label: 'Large Hoarding',
    dimensions: '20 × 10 ft',
    aspect_ratio: '2:1',
    composition_note: 'Large hoarding, wide horizontal — bold single image, minimal text, readable at distance. High contrast essential.',
    common_use: 'City hoardings, building wraps',
  },
  {
    id: 'bus_shelter',
    label: 'Bus Shelter',
    dimensions: '4 × 6 ft',
    aspect_ratio: '2:3',
    composition_note: 'Bus shelter, tall vertical panel — pedestrians view close up. Can carry more detail than a billboard. Portrait composition.',
    common_use: 'Bus stops, metro station panels',
  },
  {
    id: 'unipole',
    label: 'Unipole',
    dimensions: '20 × 30 ft',
    aspect_ratio: '2:3',
    composition_note: 'Tall unipole format — vertical billboard, single bold image, headline maximum 5 words, viewed from distance',
    common_use: 'Standalone pole structures on highways',
  },
  {
    id: 'mall_banner',
    label: 'Mall Banner',
    dimensions: '4 × 8 ft',
    aspect_ratio: '1:2',
    composition_note: 'Vertical mall banner, tall narrow format — top half image, bottom half brand+text. Shoppers view at close range.',
    common_use: 'Shopping mall corridors, retail displays',
  },
  {
    id: 'transit_bus_back',
    label: 'Bus Back',
    dimensions: '10 × 4.5 ft',
    aspect_ratio: '16:7',
    composition_note: 'Bus back, ultra-wide horizontal — seen by following vehicles. Single punchline + logo. No fine print.',
    common_use: 'Back of buses, auto-rickshaw panels',
  },
];

export function getAdSize(formatId: string, sizeId: string): AdSize | null {
  const sizes = formatId === 'print_ad' ? PRINT_AD_SIZES : OUTDOOR_AD_SIZES;
  return sizes.find(s => s.id === sizeId) ?? null;
}

export function getSizesForFormat(formatId: string): AdSize[] {
  if (formatId === 'print_ad') return PRINT_AD_SIZES;
  if (formatId === 'outdoor') return OUTDOOR_AD_SIZES;
  return [];
}
```

---

## PHASE 2 — ADD SIZE TO CREATIVE REQUEST TYPE

**File:** `src/types/sm.ts`

```typescript
export interface SMCreativeRequest {
  // ... existing fields ...
  ad_size_id?: string;    // ← ADD: e.g. 'a4_portrait', 'billboard_standard'
}
```

**DB migration:**
```sql
ALTER TABLE sm_creative_requests ADD COLUMN IF NOT EXISTS ad_size_id TEXT;
```

Update `mapCreativeRequest` in `store.ts`:
```typescript
ad_size_id: row.ad_size_id ? String(row.ad_size_id) : undefined,
```

---

## PHASE 3 — SIZE PICKER IN BRIEF FORM

**File:** `src/components/sm/CreativeBriefForm.tsx`

Import:
```typescript
import { getSizesForFormat, type AdSize } from '@/lib/sm/ad-sizes';
```

Add state:
```tsx
const [selectedSizeId, setSelectedSizeId] = useState<string>('');
```

Show size picker when format is `print_ad` or `outdoor`:

```tsx
{(creativeFormat === 'print_ad' || creativeFormat === 'outdoor') && (() => {
  const sizes = getSizesForFormat(creativeFormat);
  const label = creativeFormat === 'print_ad' ? 'Print size' : 'Format / size';
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm text-zinc-400 uppercase tracking-wider text-xs">{label}</label>
      <div className="grid grid-cols-2 gap-2">
        {sizes.map(size => (
          <button
            key={size.id}
            type="button"
            onClick={() => setSelectedSizeId(size.id)}
            className={`text-left px-3 py-2.5 rounded-lg border transition-all ${
              selectedSizeId === size.id
                ? 'border-violet-500 bg-violet-500/10'
                : 'border-zinc-700 hover:border-zinc-600'
            }`}
          >
            <p className={`text-xs font-medium ${selectedSizeId === size.id ? 'text-violet-300' : 'text-zinc-300'}`}>
              {size.label}
            </p>
            <p className="text-xs text-zinc-600 mt-0.5">{size.dimensions}</p>
            <p className="text-xs text-zinc-700 mt-0.5 truncate">{size.common_use}</p>
          </button>
        ))}
      </div>
      {selectedSizeId && (
        <p className="text-xs text-zinc-600">
          ↳ {sizes.find(s => s.id === selectedSizeId)?.common_use}
        </p>
      )}
    </div>
  );
})()}
```

Include in form submission:
```typescript
body: JSON.stringify({
  // ... existing fields ...
  ad_size_id: selectedSizeId || undefined,
}),
```

---

## PHASE 4 — USE SIZE IN SIGNALOPS + IMAGE GENERATION

### 4A — Inject size composition note into SignalOps

**File:** `src/lib/sm/signalops-engine.ts`

In `buildBriefContext`:
```typescript
import { getAdSize } from '@/lib/sm/ad-sizes';

function buildBriefContext(request: SMCreativeRequest): string {
  const lines = [
    `Brief: ${request.brief_text}`,
    `Goal: ${request.goal ?? 'general'}`,
    `Platforms: ${request.platforms.join(', ')}`,
    // ...
  ];

  // Add size-specific composition requirements
  if (request.ad_size_id && request.creative_format) {
    const size = getAdSize(request.creative_format, request.ad_size_id);
    if (size) {
      lines.push(`\nAD SIZE: ${size.label} (${size.dimensions})`);
      lines.push(`COMPOSITION REQUIREMENT: ${size.composition_note}`);
    }
  }

  return lines.filter(Boolean).join('\n');
}
```

### 4B — Use correct aspect ratio for FLUX

**File:** `src/app/api/sm/creative-requests/[id]/generate/route.ts`

```typescript
import { getAdSize } from '@/lib/sm/ad-sizes';

// When determining aspect ratio:
let aspectRatio: FluxAspectRatio = '4:5'; // default social

if (request.ad_size_id && request.creative_format) {
  const size = getAdSize(request.creative_format, request.ad_size_id);
  if (size) {
    // Map the size's aspect ratio to FLUX-supported ratios
    const ratioMap: Record<string, FluxAspectRatio> = {
      '3:4':  '3:4',
      '4:3':  '16:9', // closest FLUX has to 4:3
      '2:3':  '9:16',
      '16:9': '16:9',
      '2:1':  '16:9',
      '1:2':  '9:16',
      '7:10': '3:4',
      '16:7': '16:9',
    };
    aspectRatio = ratioMap[size.aspect_ratio] ?? '4:5';
  }
}
```

---

## PHASE 5 — SHOW SIZE LABEL ON ASSET CARD

**File:** `src/components/sm/AssetCard.tsx`

The asset card currently shows "INSTAGRAM · POST". For print/outdoor:

```tsx
// Update the platform label:
const formatLabel = (() => {
  if (creativeFormat === 'print_ad' && asset.ad_size_id) {
    const size = getAdSize('print_ad', asset.ad_size_id ?? '');
    return size ? `PRINT · ${size.label.toUpperCase()}` : 'PRINT AD';
  }
  if (creativeFormat === 'outdoor' && asset.ad_size_id) {
    const size = getAdSize('outdoor', asset.ad_size_id ?? '');
    return size ? `OOH · ${size.label.toUpperCase()}` : 'OUTDOOR';
  }
  return `${platformLabel.toUpperCase()} · ${typeLabel.toUpperCase()}`;
})();
```

---

## COMMIT

```
feat(sizes): add PRINT_AD_SIZES and OUTDOOR_AD_SIZES with composition notes and aspect ratios
feat(sizes/db): add ad_size_id to sm_creative_requests
feat(sizes/ui): size picker grid in CreativeBriefForm for print_ad and outdoor formats
feat(sizes): inject size composition requirements into SignalOps brief context
feat(sizes): use size-appropriate FLUX aspect ratio in image generation
feat(sizes): show size label on AssetCard (PRINT · A4 PORTRAIT, OOH · BILLBOARD)
```
