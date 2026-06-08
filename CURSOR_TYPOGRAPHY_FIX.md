# SM — Typography Overlay Fixes
## Cursor Brief

---

## FIX 1 — FORCE FONT LOADING

The Google Fonts aren't applying because CSS custom fonts need time to load and the `fontFamily` inline style may not be resolving.

**File:** `src/app/layout.tsx`

Ensure this exact `<link>` is in `<head>` before any other stylesheet:

```tsx
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
<link
  href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Lora:ital,wght@0,400;0,500;1,400&family=DM+Sans:wght@400;700&family=Inter:wght@400;600&family=Oswald:wght@600;700&display=swap"
  rel="stylesheet"
/>
```

Also add a `<style>` block in the same layout to ensure fonts are declared:

```tsx
<style>{`
  .font-lora { font-family: 'Lora', Georgia, serif; }
  .font-cormorant { font-family: 'Cormorant Garamond', 'Times New Roman', serif; }
  .font-bebas { font-family: 'Bebas Neue', Impact, sans-serif; }
  .font-dm { font-family: 'DM Sans', Arial, sans-serif; }
  .font-oswald { font-family: 'Oswald', Impact, sans-serif; }
  .font-inter { font-family: 'Inter', Arial, sans-serif; }
`}</style>
```

**File:** `src/lib/sm/typography.ts`

Update to use CSS class names instead of inline fontFamily strings (more reliable):

```typescript
export interface TypographyStyle {
  cssClass: string;           // ← use className, not inline style
  fontWeight: number;
  letterSpacing: string;
  textTransform: 'uppercase' | 'none';
  lineHeight: number;
  italic: boolean;
}

export const TONE_TYPOGRAPHY: Record<SMTone, TypographyStyle> = {
  bold: {
    cssClass: 'font-bebas',
    fontWeight: 400,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    lineHeight: 1.0,
    italic: false,
  },
  premium: {
    cssClass: 'font-cormorant',
    fontWeight: 300,
    letterSpacing: '0.06em',
    textTransform: 'none',
    lineHeight: 1.3,
    italic: true,
  },
  warm: {
    cssClass: 'font-lora',
    fontWeight: 400,
    letterSpacing: '0.01em',
    textTransform: 'none',
    lineHeight: 1.4,
    italic: false,
  },
  playful: {
    cssClass: 'font-dm',
    fontWeight: 700,
    letterSpacing: '-0.02em',
    textTransform: 'none',
    lineHeight: 1.1,
    italic: false,
  },
  professional: {
    cssClass: 'font-inter',
    fontWeight: 600,
    letterSpacing: '-0.01em',
    textTransform: 'none',
    lineHeight: 1.2,
    italic: false,
  },
  urgent: {
    cssClass: 'font-oswald',
    fontWeight: 700,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    lineHeight: 1.0,
    italic: false,
  },
};
```

---

## FIX 2 — SMART LINE BREAKS (break at punctuation, not mid-sentence)

**File:** `src/components/sm/AssetCard.tsx`

Replace the current text rendering with a function that breaks at sentence boundaries:

```tsx
function formatHeadlineLines(headline: string): string[] {
  // Break at sentence-ending punctuation first
  const sentenceBreaks = headline.match(/[^.!?]+[.!?]+/g);
  if (sentenceBreaks && sentenceBreaks.length > 1) {
    return sentenceBreaks.map(s => s.trim());
  }

  // Fallback: break at em-dash or " — "
  if (headline.includes(' — ')) {
    return headline.split(' — ').map(s => s.trim());
  }

  // Fallback: break at comma if line is long
  if (headline.length > 30 && headline.includes(',')) {
    const parts = headline.split(',');
    return parts.map(s => s.trim());
  }

  // Last resort: wrap at ~35 chars
  const words = headline.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if (current.length + word.length > 32 && current) {
      lines.push(current.trim());
      current = word;
    } else {
      current += (current ? ' ' : '') + word;
    }
  }
  if (current) lines.push(current.trim());
  return lines;
}
```

---

## FIX 3 — TYPOGRAPHY OVERLAY LAYOUT

**File:** `src/components/sm/AssetCard.tsx`

Replace the entire typography overlay section with:

```tsx
{localAsset.status === 'done' && localAsset.storage_url && localAsset.headline && showTextOverlay && (() => {
  const typo = getTypography(client.tone);
  const lines = formatHeadlineLines(localAsset.headline);

  return (
    <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
      {/* Gradient — longer, more gradual, starts at 55% height from bottom */}
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{ height: '55%', background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.35) 40%, transparent 100%)' }}
      />

      {/* Text — left-aligned, bottom-anchored, with breathing room */}
      <div className="relative px-5 pb-5">
        {lines.map((line, i) => (
          <p
            key={i}
            className={`${typo.cssClass} text-white leading-snug`}
            style={{
              fontWeight: typo.fontWeight,
              letterSpacing: typo.letterSpacing,
              textTransform: typo.textTransform,
              fontStyle: typo.italic && i === 0 ? 'italic' : 'normal',
              fontSize: 'clamp(14px, 4cqi, 20px)',
              textShadow: '0 1px 4px rgba(0,0,0,0.6)',
              marginBottom: i < lines.length - 1 ? '0.1em' : 0,
            }}
          >
            {line}
          </p>
        ))}
      </div>
    </div>
  );
})()}
```

---

## FIX 4 — MOVE TOGGLE BUTTON OUT OF TEXT ZONE

Move the `T` toggle button outside the image, into the card's action area:

```tsx
{/* Put this BELOW the image, as a small subtle link in the action area */}
{localAsset.status === 'done' && localAsset.storage_url && localAsset.headline && (
  <button
    type="button"
    onClick={() => setShowTextOverlay(prev => !prev)}
    className="absolute top-2 right-14 text-xs bg-black/40 text-white/70 rounded px-1.5 py-0.5 hover:bg-black/60 z-10"
    title="Toggle headline overlay"
  >
    Aa
  </button>
)}
```

Position it in the top-left area of the image (far from the logo, unobtrusive).

---

## FIX 5 — HIMALAYA-SPECIFIC RESULT

With these fixes, for a `warm` tone brand (Himalaya):
- Font: Lora (elegant, maternal serif)
- Text in lower left, bottom-anchored
- Lines:
  - "Strong enough to protect."
  - "Gentle enough to hold."
- Very long gradient starting at 55% from bottom
- Logo: white frosted pill, top-right

The result should look like a published Instagram post from a premium baby brand.

---

## COMMIT

```
fix(typography): use CSS classes instead of inline fontFamily — fonts load reliably
fix(typography): smart line breaks at punctuation, not mid-sentence
fix(typography): longer gradient (55%), lower text anchor, left-aligned layout
fix(typography): move toggle Aa button away from text zone
```
