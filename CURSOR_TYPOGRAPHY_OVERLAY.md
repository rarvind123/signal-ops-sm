# SM — Typography Overlay on Creative
## Cursor Brief

Add aesthetic text overlay on the generated image inside AssetCard — headline in the lower third, styled by brand tone. Also composites text into the downloaded file using sharp.

---

## FIX ALREADY DONE (verify and keep)

`src/components/sm/AssetCard.tsx` logo section now uses:
```tsx
<div className="absolute right-3 top-3 rounded-lg bg-white/80 backdrop-blur-sm px-2 py-1.5 shadow-md">
  <img src={logoUrl} alt={client.name} className="h-8 w-auto max-w-[110px] object-contain" />
</div>
```
Do NOT revert this.

---

## NEW: TYPOGRAPHY OVERLAY

### 1 — Font map by brand tone

**File:** `src/lib/sm/typography.ts` (new file)

```typescript
import type { SMTone } from '@/types/sm';

export interface TypographyStyle {
  fontFamily: string;           // Google Fonts import name
  fontWeight: number;
  letterSpacing: string;
  textTransform: 'uppercase' | 'none';
  lineHeight: number;
  googleFontsUrl: string;
}

export const TONE_TYPOGRAPHY: Record<SMTone, TypographyStyle> = {
  bold: {
    fontFamily: 'Bebas Neue',
    fontWeight: 400,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    lineHeight: 1.0,
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap',
  },
  premium: {
    fontFamily: 'Cormorant Garamond',
    fontWeight: 300,
    letterSpacing: '0.08em',
    textTransform: 'none',
    lineHeight: 1.2,
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400&display=swap',
  },
  warm: {
    fontFamily: 'Lora',
    fontWeight: 400,
    letterSpacing: '0.01em',
    textTransform: 'none',
    lineHeight: 1.3,
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Lora:wght@400;500&display=swap',
  },
  playful: {
    fontFamily: 'DM Sans',
    fontWeight: 700,
    letterSpacing: '-0.02em',
    textTransform: 'none',
    lineHeight: 1.1,
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700&display=swap',
  },
  professional: {
    fontFamily: 'Inter',
    fontWeight: 600,
    letterSpacing: '-0.01em',
    textTransform: 'none',
    lineHeight: 1.2,
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap',
  },
  urgent: {
    fontFamily: 'Oswald',
    fontWeight: 700,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    lineHeight: 1.0,
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Oswald:wght@600;700&display=swap',
  },
};

export function getTypography(tone?: SMTone): TypographyStyle {
  return TONE_TYPOGRAPHY[tone ?? 'professional'];
}
```

---

### 2 — Load Google Font in layout

**File:** `src/app/layout.tsx`

The fonts need to be available globally. Since tone varies per brand, load all 6 fonts:

```tsx
import Head from 'next/head';

// In the <head> or via next/font, add the Google Fonts link:
// Simplest: add a <link> in the layout for all 6 font families
// OR use next/font/google — preferred in Next.js 13+

// Add to layout.tsx <head>:
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Cormorant+Garamond:wght@300;400&family=Lora:wght@400;500&family=DM+Sans:wght@400;700&family=Inter:wght@400;600&family=Oswald:wght@600;700&display=swap" rel="stylesheet" />
```

---

### 3 — Typography overlay in AssetCard

**File:** `src/components/sm/AssetCard.tsx`

Import:
```tsx
import { getTypography } from '@/lib/sm/typography';
```

Inside the image container, after the logo overlay, add the headline overlay:

```tsx
{/* Headline overlay — lower third */}
{localAsset.status === 'done' && localAsset.storage_url && localAsset.headline && (() => {
  const typo = getTypography(client.tone);
  return (
    <div className="absolute bottom-0 left-0 right-0">
      {/* Gradient fade — ensures text legibility on any background */}
      <div className="absolute bottom-0 left-0 right-0 h-2/5 bg-gradient-to-t from-black/70 to-transparent" />
      {/* Headline text */}
      <div className="relative px-4 pb-4 pt-8">
        <p
          style={{
            fontFamily: `'${typo.fontFamily}', sans-serif`,
            fontWeight: typo.fontWeight,
            letterSpacing: typo.letterSpacing,
            textTransform: typo.textTransform,
            lineHeight: typo.lineHeight,
            fontSize: 'clamp(13px, 3.5cqi, 22px)',
          }}
          className="text-white drop-shadow-sm"
        >
          {localAsset.headline}
        </p>
      </div>
    </div>
  );
})()}
```

Note: `clamp(13px, 3.5cqi, 22px)` scales the font with the container width — works on any card size.

---

### 4 — Toggle: text on / off

Some brands may want text-only in caption, not on image. Add a toggle state:

```tsx
const [showTextOverlay, setShowTextOverlay] = useState(true);

// Small toggle button in the top-left, below the platform label:
<button
  type="button"
  onClick={() => setShowTextOverlay(prev => !prev)}
  className="absolute left-2 bottom-2 z-10 text-xs bg-black/50 text-white rounded px-2 py-0.5"
>
  {showTextOverlay ? 'T' : 'T̶'}
</button>

// Only render overlay if showTextOverlay is true
{showTextOverlay && localAsset.headline && ( ... overlay ... )}
```

---

### 5 — Composite text into download (sharp)

**File:** `src/app/api/sm/assets/[id]/download/route.ts`

After the existing logo composite step, add text composite:

```typescript
import sharp from 'sharp';
// sharp can composite SVG text — we create an SVG with the headline and overlay it

async function compositeTextOntoImage(
  imageBuffer: Buffer,
  headline: string,
  tone: string
): Promise<Buffer> {
  const { width = 1080, height = 1080 } = await sharp(imageBuffer).metadata();

  // Font map for SVG (system fonts + web-safe fallbacks)
  const fontMap: Record<string, string> = {
    bold: 'Impact, "Arial Black", sans-serif',
    premium: 'Georgia, "Times New Roman", serif',
    warm: 'Georgia, Palatino, serif',
    playful: '"Trebuchet MS", Arial, sans-serif',
    professional: 'Arial, Helvetica, sans-serif',
    urgent: 'Impact, "Arial Black", sans-serif',
  };
  const fontFamily = fontMap[tone] ?? fontMap.professional;
  const fontSize = Math.round(width * 0.045);
  const paddingX = Math.round(width * 0.04);
  const paddingY = Math.round(height * 0.04);

  // Wrap headline if too long (max ~35 chars per line)
  const words = headline.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if ((current + ' ' + word).trim().length > 35) {
      lines.push(current.trim());
      current = word;
    } else {
      current += (current ? ' ' : '') + word;
    }
  }
  if (current) lines.push(current.trim());

  const lineHeight = fontSize * 1.2;
  const totalTextH = lines.length * lineHeight;
  const gradientH = Math.round(height * 0.4);
  const textY = height - paddingY - totalTextH;

  const svgText = lines.map((line, i) =>
    `<text x="${paddingX}" y="${textY + i * lineHeight + fontSize}" 
      font-family="${fontFamily}" font-size="${fontSize}" font-weight="bold"
      fill="white" filter="url(#shadow)">${line.replace(/[<>&"]/g, c => ({ '<':'&lt;', '>':'&gt;', '&':'&amp;', '"':'&quot;' }[c] ?? c))}</text>`
  ).join('\n');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs>
      <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="black" stop-opacity="0"/>
        <stop offset="100%" stop-color="black" stop-opacity="0.65"/>
      </linearGradient>
      <filter id="shadow">
        <feDropShadow dx="0" dy="1" stdDeviation="2" flood-opacity="0.8"/>
      </filter>
    </defs>
    <rect x="0" y="${height - gradientH}" width="${width}" height="${gradientH}" fill="url(#grad)"/>
    ${svgText}
  </svg>`;

  return sharp(imageBuffer)
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .jpeg({ quality: 90 })
    .toBuffer();
}

// In the download route, after logo composite:
if (asset.headline) {
  const clientRecord = await getClient(request.client_id);
  imageBuffer = await compositeTextOntoImage(
    imageBuffer,
    asset.headline,
    clientRecord?.tone ?? 'professional'
  );
}
```

---

### 6 — Verify

1. Generate a creative for Himalaya (warm tone) → overlay should appear in the lower third with Lora font
2. Generate for a bold brand → Bebas Neue uppercase
3. Toggle button hides/shows text on card
4. Download → open the JPG — gradient + text should be baked in
5. Logo pill still visible in top-right

---

## COMMIT

```
feat(sm/typography): add tone-based font map for 6 brand tones
feat(sm/ui): add headline overlay in lower third of AssetCard
feat(sm/ui): gradient backdrop for text legibility on any image
feat(sm/ui): text overlay toggle button
feat(sm/download): composite headline text into downloaded JPG using sharp + SVG
fix(sm/logo): frosted white pill — already done, verify and push
```
