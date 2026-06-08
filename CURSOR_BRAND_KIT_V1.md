# SM — Brand Kit v1
## Cursor Brief · Full Implementation

Upgrades the brand profile from a simplified form into a proper brand kit system. Works for brands with and without existing guidelines. Feeds every format: Social Media, Print, Outdoor. Affects SignalOps, image prompts, typography overlay, and logo selection.

---

## PHASE 1 — SCHEMA + TYPES

### 1A — DB migration

```sql
-- Logo variants (multiple logos per brand)
ALTER TABLE sm_clients
  ADD COLUMN IF NOT EXISTS logo_primary_url    TEXT,  -- full colour logo (replaces logo_url)
  ADD COLUMN IF NOT EXISTS logo_white_url      TEXT,  -- white/reversed logo for dark backgrounds
  ADD COLUMN IF NOT EXISTS logo_dark_url       TEXT,  -- dark logo for light backgrounds
  ADD COLUMN IF NOT EXISTS logo_symbol_url     TEXT;  -- icon/symbol only, no wordmark

-- Color system (named roles, not just an array)
ALTER TABLE sm_clients
  ADD COLUMN IF NOT EXISTS color_primary       TEXT,  -- hex
  ADD COLUMN IF NOT EXISTS color_secondary     TEXT,
  ADD COLUMN IF NOT EXISTS color_accent        TEXT,
  ADD COLUMN IF NOT EXISTS color_background    TEXT,
  ADD COLUMN IF NOT EXISTS color_text          TEXT;

-- Typography
ALTER TABLE sm_clients
  ADD COLUMN IF NOT EXISTS font_primary        TEXT,  -- brand headline font (Google Font name or generic)
  ADD COLUMN IF NOT EXISTS font_secondary      TEXT,  -- brand body font
  ADD COLUMN IF NOT EXISTS font_source         TEXT CHECK (font_source IN ('google', 'system', 'custom'));

-- Photography style
ALTER TABLE sm_clients
  ADD COLUMN IF NOT EXISTS photo_style         TEXT CHECK (photo_style IN (
    'lifestyle','product','minimal','documentary','illustrated','premium'
  ));

-- Voice guidelines (expanded from single tone dropdown)
ALTER TABLE sm_clients
  ADD COLUMN IF NOT EXISTS voice_description   TEXT,  -- free text: "We speak like a trusted friend..."
  ADD COLUMN IF NOT EXISTS voice_do            JSONB DEFAULT '[]',  -- ["Use active voice", "Be direct"]
  ADD COLUMN IF NOT EXISTS voice_dont          JSONB DEFAULT '[]',  -- ["Don't use jargon", "Never be sarcastic"]

-- Brand guidelines (for brands that upload a PDF — Phase 2 extract, store raw for now)
ALTER TABLE sm_clients
  ADD COLUMN IF NOT EXISTS guidelines_pdf_url  TEXT,
  ADD COLUMN IF NOT EXISTS guidelines_summary  TEXT;  -- AI-extracted summary from PDF

-- Has brand kit flag
ALTER TABLE sm_clients
  ADD COLUMN IF NOT EXISTS has_brand_kit       BOOLEAN DEFAULT FALSE;
```

### 1B — Update SMClient type

**File:** `src/types/sm.ts` — replace `SMClient`:

```typescript
export type SMPhotoStyle =
  | 'lifestyle' | 'product' | 'minimal'
  | 'documentary' | 'illustrated' | 'premium';

export type SMFontSource = 'google' | 'system' | 'custom';

export interface SMColorPalette {
  primary?:    string; // hex
  secondary?:  string;
  accent?:     string;
  background?: string;
  text?:       string;
}

export interface SMLogoSet {
  primary?:  string; // URL — full colour
  white?:    string; // URL — reversed for dark backgrounds
  dark?:     string; // URL — for light backgrounds
  symbol?:   string; // URL — icon only
}

export interface SMVoiceGuidelines {
  description?: string;
  do?:          string[];
  dont?:        string[];
}

export interface SMClient {
  id: string;
  name: string;
  tagline?: string;
  usp?: string;
  target_audience: { age?: string; gender?: string; interests?: string[]; location?: string };
  tone?: SMTone;

  // Brand Kit fields
  has_brand_kit: boolean;
  logos: SMLogoSet;
  logo_url?: string;          // legacy — keep for backward compat
  color_palette: SMColorPalette;
  brand_colors: Array<{ hex: string; label: string }>; // legacy
  font_primary?: string;
  font_secondary?: string;
  font_source?: SMFontSource;
  photo_style?: SMPhotoStyle;
  voice: SMVoiceGuidelines;
  guidelines_pdf_url?: string;
  guidelines_summary?: string;

  social_handles: Partial<Record<SMPlatform, string>>;
  created_at: string;
  updated_at: string;
}
```

---

## PHASE 2 — SMART LOGO SELECTION

The right logo variant is chosen automatically based on the background brightness of the image.

**File:** `src/lib/sm/logo-selector.ts` (new file)

```typescript
import type { SMLogoSet } from '@/types/sm';

/**
 * Determine average brightness of an image region using canvas.
 * Returns 0 (dark) to 255 (light).
 * Runs client-side only.
 */
export async function getImageRegionBrightness(
  imageUrl: string,
  region: { x: number; y: number; w: number; h: number; imgW: number; imgH: number }
): Promise<number> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(128);
      ctx.drawImage(img, 0, 0);
      const pw = Math.round((region.w / region.imgW) * img.width);
      const ph = Math.round((region.h / region.imgH) * img.height);
      const px = Math.round((region.x / region.imgW) * img.width);
      const py = Math.round((region.y / region.imgH) * img.height);
      const data = ctx.getImageData(px, py, pw, ph).data;
      let total = 0;
      for (let i = 0; i < data.length; i += 4) {
        total += 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
      }
      resolve(total / (data.length / 4));
    };
    img.onerror = () => resolve(128);
    img.src = imageUrl;
  });
}

/**
 * Pick the best logo variant for a given background brightness.
 * brightness > 160 = light background → use dark logo
 * brightness < 96  = dark background  → use white logo
 * otherwise         = midtone          → use primary
 */
export function selectLogo(logos: SMLogoSet, brightness: number): string | null {
  if (brightness > 160) {
    return logos.dark ?? logos.primary ?? null;
  }
  if (brightness < 96) {
    return logos.white ?? logos.primary ?? null;
  }
  return logos.primary ?? logos.dark ?? logos.white ?? null;
}
```

**File:** `src/components/sm/AssetCard.tsx` — update logo loading:

```tsx
import { getImageRegionBrightness, selectLogo } from '@/lib/sm/logo-selector';

// Replace the current logoUrl state + fetch with:
const [logoUrl, setLogoUrl] = useState<string | null>(null);

useEffect(() => {
  if (!localAsset.storage_url || !client.logos) return;

  // Check if brand has multiple logo variants
  const hasVariants = client.logos.white || client.logos.dark;

  if (!hasVariants) {
    // Single logo — use it directly
    setLogoUrl(client.logos.primary ?? client.logo_url ?? null);
    return;
  }

  // Measure top-right corner brightness (where logo sits)
  const cardW = 400; // approximate card width
  const cardH = 400;
  getImageRegionBrightness(localAsset.storage_url, {
    x: cardW * 0.6, y: 0, w: cardW * 0.4, h: cardH * 0.2,
    imgW: cardW, imgH: cardH,
  }).then(brightness => {
    setLogoUrl(selectLogo(client.logos, brightness));
  });
}, [localAsset.storage_url, client.logos, client.logo_url]);
```

---

## PHASE 3 — BRAND TYPOGRAPHY OVERRIDE

If the brand has specified `font_primary`, use it instead of the tone-based mapping.

**File:** `src/lib/sm/typography.ts`

Update `getTypography` to accept the full client:

```typescript
import type { SMClient, SMTone } from '@/types/sm';

export function getClientTypography(client: SMClient): TypographyStyle {
  // If brand kit specifies a font, override the tone mapping
  if (client.font_primary) {
    const isSerif = /garamond|georgia|times|palatino|lora|merriweather|playfair/i.test(client.font_primary);
    const isDisplay = /bebas|oswald|impact|condensed|anton/i.test(client.font_primary);
    const isMono = /mono|code|courier/i.test(client.font_primary);

    return {
      cssClass: '', // no preset class — use inline fontFamily
      fontFamily: client.font_primary,
      fontWeight: isDisplay ? 700 : isSerif ? 400 : 600,
      letterSpacing: isDisplay ? '0.04em' : isSerif ? '0.01em' : '-0.01em',
      textTransform: isDisplay ? 'uppercase' : 'none',
      lineHeight: isDisplay ? 1.0 : 1.25,
      italic: false,
      isCustomFont: true,
    };
  }

  // Fallback to tone-based mapping
  return TONE_TYPOGRAPHY[client.tone ?? 'professional'];
}
```

When `isCustomFont` is true, load the font dynamically:

```tsx
// In AssetCard, after determining typography:
const typo = getClientTypography(client);

useEffect(() => {
  if (!typo.isCustomFont || !typo.fontFamily) return;
  // Try to load from Google Fonts if it's a known Google Font
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  const encoded = encodeURIComponent(typo.fontFamily);
  link.href = `https://fonts.googleapis.com/css2?family=${encoded}:wght@300;400;600;700&display=swap`;
  document.head.appendChild(link);
}, [typo.fontFamily, typo.isCustomFont]);
```

---

## PHASE 4 — SIGNALOPS BRAND KIT INTEGRATION

**File:** `src/lib/sm/signalops-engine.ts`

Extend `buildBrandContext` to include brand kit fields:

```typescript
function buildBrandContext(client: SMClient): string {
  const lines = [
    `Brand: ${client.name}`,
    client.tagline ? `Tagline: ${client.tagline}` : null,
    client.usp ? `USP: ${client.usp}` : null,
    `Tone: ${client.tone ?? 'professional'}`,
    client.voice?.description ? `Voice: ${client.voice.description}` : null,
    client.voice?.do?.length
      ? `Voice Do's: ${client.voice.do.join(', ')}`
      : null,
    client.voice?.dont?.length
      ? `Voice Don'ts: ${client.voice.dont.join(', ')}`
      : null,
    `Audience: ${JSON.stringify(client.target_audience)}`,
  ];

  // Color palette
  const palette = client.color_palette;
  const colorLines = Object.entries(palette)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`);
  if (colorLines.length) {
    lines.push(`Brand colours: ${colorLines.join(', ')}`);
  } else if (client.brand_colors?.length) {
    lines.push(`Brand colours: ${client.brand_colors.map(c => `${c.label}: ${c.hex}`).join(', ')}`);
  }

  // Photography style
  if (client.photo_style) {
    lines.push(`Photography style: ${client.photo_style}`);
  }

  // Brand typography (informs copy and visual style)
  if (client.font_primary) {
    lines.push(`Brand font: ${client.font_primary} — respect this typographic character in the visual direction`);
  }

  return lines.filter(Boolean).join('\n');
}
```

Also inject photo_style into the visual approach:

```typescript
// In the user prompt, add to visual_approach section:
const photoStyleNote = client.photo_style
  ? `\nPHOTOGRAPHY STYLE: This brand uses ${client.photo_style} photography. All scene descriptions must align with this style.`
  : '';
```

---

## PHASE 5 — IMAGE GENERATION PROMPT UPDATE

**File:** `src/lib/sm/asset-generator.ts`

Update `buildImageGenerationPrompt` to incorporate brand kit:

```typescript
export function buildImageGenerationPrompt(
  client: SMClient,
  signalops: SMSignalOpsOutput,
  platform: string,
  assetType: string,
  headline: string,
  creativeFormat?: SMCreativeFormat
): string {
  const approach = signalops.visual_approach;

  // Photo style from brand kit
  const photoStyleMap: Record<string, string> = {
    lifestyle:     'lifestyle photography with real people in natural settings, candid and authentic',
    product:       'clean product photography, controlled lighting, professional studio quality',
    minimal:       'minimal composition, generous white space, restrained and deliberate',
    documentary:   'documentary-style photography, raw and real, no posing',
    illustrated:   'graphic illustration style, not photorealistic',
    premium:       'high-end luxury photography, impeccable lighting, aspirational',
  };
  const photoStyle = client.photo_style
    ? photoStyleMap[client.photo_style]
    : 'professional commercial photography';

  // Brand color language
  const colorContext = (() => {
    const p = client.color_palette;
    if (p.primary) return `dominant colour palette: ${[p.primary, p.secondary, p.accent].filter(Boolean).join(', ')}`;
    if (client.brand_colors?.length) return `colour palette: ${client.brand_colors.map(c => c.hex).join(', ')}`;
    return signalops.color_recommendation;
  })();

  // Format-specific typography zone instruction
  const typographyZone = (() => {
    if (!creativeFormat || creativeFormat === 'social_media') {
      return 'clear negative space in the lower third for headline overlay';
    }
    if (creativeFormat === 'print_ad') {
      return 'clean white band at the bottom 20% of the image — completely clear, no visual elements — reserved for headline typography';
    }
    if (creativeFormat === 'outdoor') {
      return 'massive clear zone on one side (left or right) — at minimum 40% of the frame must be clean solid colour for OOH headline placement';
    }
    return 'clear space for headline overlay';
  })();

  const parts = [
    approach?.scene_description || signalops.visual_direction,
    colorContext,
    photoStyle,
    typographyZone,
    'ultra high quality',
    'sharp focus',
    'professional lighting',
    '8k resolution',
    // Universal exclusions
    'absolutely no text of any kind',
    'no numbers',
    'no dates or years',
    'no words written on any surface',
    'no logos',
    'no watermarks',
    'no product packaging',
    'no tins or bottles',
  ].filter(Boolean).join(', ');

  return parts.replace(/\s+/g, ' ').trim().slice(0, 3800);
}
```

---

## PHASE 6 — FORMAT-SPECIFIC TYPOGRAPHY OVERLAY

**File:** `src/components/sm/AssetCard.tsx`

The typography overlay adapts based on `creative_format`:

```tsx
function getOverlayConfig(format?: SMCreativeFormat) {
  switch (format) {
    case 'print_ad':
      return {
        // Print: text in the clean white band at the bottom — no gradient needed
        gradientStyle: 'none',
        containerClass: 'absolute bottom-0 left-0 right-0 bg-white px-8 py-6',
        setupColor: '#555555',     // dark setup on white
        punchColor: '#000000',     // black punch on white
        setupOpacity: 1,
        fontSize: { setup: 'clamp(11px, 2.2cqi, 16px)', punch: 'clamp(16px, 4cqi, 26px)' },
      };
    case 'outdoor':
      return {
        // OOH: maximum size, no gradient, text in the clear zone
        gradientStyle: 'none',
        containerClass: 'absolute bottom-0 left-0 right-0 px-8 pb-8',
        setupColor: 'white',
        punchColor: 'white',
        setupOpacity: 0.8,
        fontSize: { setup: 'clamp(14px, 3.5cqi, 22px)', punch: 'clamp(22px, 7cqi, 48px)' },
      };
    default:
      return {
        // Social media: gradient overlay
        gradientStyle: 'linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.4) 45%, transparent 100%)',
        containerClass: 'absolute bottom-0 left-0 right-0 px-5 pb-5 pt-10',
        setupColor: 'rgba(255,255,255,0.75)',
        punchColor: 'white',
        setupOpacity: 1,
        fontSize: { setup: 'clamp(11px, 2.8cqi, 15px)', punch: 'clamp(14px, 4.5cqi, 24px)' },
      };
  }
}
```

---

## PHASE 7 — BRAND KIT FORM UI

**File:** `src/components/sm/BrandProfileForm.tsx`

Add a "Brand Kit" section after the basics. Brands without a kit skip these fields.

```tsx
{/* Brand Kit toggle */}
<div className="border border-zinc-700 rounded-xl p-4">
  <div className="flex items-center justify-between mb-1">
    <div>
      <p className="text-sm font-medium text-white">Brand Kit</p>
      <p className="text-xs text-zinc-500">Logos, colours, typography, photo style</p>
    </div>
    <button
      type="button"
      onClick={() => setHasBrandKit(prev => !prev)}
      className={`relative w-10 h-5 rounded-full transition-colors ${hasBrandKit ? 'bg-violet-600' : 'bg-zinc-700'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${hasBrandKit ? 'translate-x-5' : ''}`} />
    </button>
  </div>

  {hasBrandKit && (
    <div className="flex flex-col gap-4 mt-4 pt-4 border-t border-zinc-800">

      {/* Logo variants */}
      <div className="flex flex-col gap-2">
        <label className="text-xs text-zinc-400 uppercase tracking-wider">Logo Variants</label>
        <div className="grid grid-cols-2 gap-2">
          {(['primary','white','dark','symbol'] as const).map(variant => (
            <LogoVariantUploader
              key={variant}
              label={variant}
              clientId={clientId}
              value={logos[variant]}
              onUpload={url => setLogos(prev => ({ ...prev, [variant]: url }))}
            />
          ))}
        </div>
      </div>

      {/* Color roles */}
      <div className="flex flex-col gap-2">
        <label className="text-xs text-zinc-400 uppercase tracking-wider">Colour Palette</label>
        <div className="grid grid-cols-5 gap-2">
          {(['primary','secondary','accent','background','text'] as const).map(role => (
            <div key={role} className="flex flex-col items-center gap-1">
              <input
                type="color"
                value={colorPalette[role] ?? '#000000'}
                onChange={e => setColorPalette(prev => ({ ...prev, [role]: e.target.value }))}
                className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
              />
              <span className="text-xs text-zinc-500 capitalize">{role}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Typography */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-400">Headline Font</label>
          <input
            value={fontPrimary}
            onChange={e => setFontPrimary(e.target.value)}
            placeholder="e.g. Helvetica Neue"
            className="bg-zinc-800 border border-zinc-700 rounded px-2.5 py-1.5 text-white text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-400">Body Font</label>
          <input
            value={fontSecondary}
            onChange={e => setFontSecondary(e.target.value)}
            placeholder="e.g. Lato"
            className="bg-zinc-800 border border-zinc-700 rounded px-2.5 py-1.5 text-white text-sm"
          />
        </div>
      </div>

      {/* Photography style */}
      <div className="flex flex-col gap-2">
        <label className="text-xs text-zinc-400 uppercase tracking-wider">Photography Style</label>
        <div className="grid grid-cols-3 gap-2">
          {(['lifestyle','product','minimal','documentary','illustrated','premium'] as const).map(style => (
            <button
              key={style}
              type="button"
              onClick={() => setPhotoStyle(style)}
              className={`py-1.5 rounded border text-xs capitalize ${photoStyle === style ? 'border-violet-500 bg-violet-500/10 text-violet-300' : 'border-zinc-700 text-zinc-400'}`}
            >
              {style}
            </button>
          ))}
        </div>
      </div>

      {/* Voice guidelines */}
      <div className="flex flex-col gap-2">
        <label className="text-xs text-zinc-400 uppercase tracking-wider">Brand Voice</label>
        <textarea
          value={voiceDescription}
          onChange={e => setVoiceDescription(e.target.value)}
          placeholder="Describe how the brand speaks. e.g. Warm but not sentimental. Scientific but accessible. Never corporate."
          rows={3}
          className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white text-sm resize-none"
        />
      </div>

    </div>
  )}
</div>
```

---

## PHASE 8 — STORE MAPPER UPDATE

**File:** `src/lib/sm/store.ts`

Update `mapClient` to include brand kit fields:

```typescript
function mapClient(row: Record<string, unknown>): SMClient {
  return {
    id: String(row.id),
    name: String(row.name),
    // ... existing fields ...
    has_brand_kit: Boolean(row.has_brand_kit),
    logos: {
      primary: row.logo_primary_url ? String(row.logo_primary_url) : undefined,
      white:   row.logo_white_url   ? String(row.logo_white_url)   : undefined,
      dark:    row.logo_dark_url    ? String(row.logo_dark_url)    : undefined,
      symbol:  row.logo_symbol_url  ? String(row.logo_symbol_url)  : undefined,
    },
    logo_url: row.logo_url ? String(row.logo_url) : undefined,
    color_palette: {
      primary:    row.color_primary    ? String(row.color_primary)    : undefined,
      secondary:  row.color_secondary  ? String(row.color_secondary)  : undefined,
      accent:     row.color_accent     ? String(row.color_accent)     : undefined,
      background: row.color_background ? String(row.color_background) : undefined,
      text:       row.color_text       ? String(row.color_text)       : undefined,
    },
    brand_colors: (row.brand_colors as SMClient['brand_colors']) ?? [],
    font_primary:  row.font_primary  ? String(row.font_primary)  : undefined,
    font_secondary: row.font_secondary ? String(row.font_secondary) : undefined,
    font_source:   row.font_source   ? String(row.font_source) as SMFontSource : undefined,
    photo_style:   row.photo_style   ? String(row.photo_style) as SMPhotoStyle : undefined,
    voice: {
      description: row.voice_description ? String(row.voice_description) : undefined,
      do:   (row.voice_do   as string[]) ?? [],
      dont: (row.voice_dont as string[]) ?? [],
    },
    guidelines_pdf_url: row.guidelines_pdf_url ? String(row.guidelines_pdf_url) : undefined,
    guidelines_summary: row.guidelines_summary ? String(row.guidelines_summary) : undefined,
    // ... rest of fields ...
  };
}
```

---

## PHASE 9 — HOW IT CHANGES EACH FORMAT

### Social Media
- Logo: auto-selects white/dark variant based on image brightness
- Typography: uses `font_primary` if set, falls back to tone mapping
- Color: uses `color_palette.primary` as accent for emphasis_word

### Print Ad
- Typography zone: FLUX instructed to leave clean white band at bottom
- Typography overlay: renders in that white band — dark text, no gradient, larger
- Logo: always use `logo_dark` for print (clean white background assumed)
- Color: `color_primary` used for any design element in the white zone

### Outdoor
- Typography zone: FLUX instructed to leave 40% of frame clear
- Typography overlay: maximum size, ultra-bold, white text
- Logo: use `logo_white` (outdoor hoarding is usually on coloured/dark background)
- Color: scene uses `color_primary` as the background of the clear zone

---

## COMMIT SEQUENCE

```
db: add brand kit columns to sm_clients — logos, color roles, fonts, photo style, voice
feat(types): expand SMClient with SMLogoSet, SMColorPalette, SMVoiceGuidelines
feat(brand-kit): logo variant auto-selection by background brightness
feat(brand-kit): font override — use brand font instead of tone mapping
feat(brand-kit): photo style feeds into FLUX prompt and SignalOps context
feat(brand-kit): voice guidelines (do/dont) feed into SignalOps brand context
feat(brand-kit): color roles feed into image prompt and typography accent
feat(brand-kit): format-specific typography zones (print/outdoor/social)
feat(brand-kit): BrandProfileForm brand kit toggle with all brand kit fields
feat(store): update mapClient to include all brand kit fields
```
