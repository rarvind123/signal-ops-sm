# SM — Dynamic Typography System
## Cursor Brief

Upgrade the headline overlay from a flat single-style text to a two-tier dynamic system with setup/punchline hierarchy, responsive font sizing, and optional emphasis accent.

---

## LEVEL 1 — TWO-TIER HEADLINE SPLIT

**File:** `src/components/sm/AssetCard.tsx`

Replace the current `formatHeadlineLines` function with a smarter split that identifies setup vs punchline:

```tsx
function splitHeadlineIntoTiers(headline: string): { setup: string; punch: string } | null {
  if (!headline || headline.length < 10) return null;

  // Strategy 1: Split at em-dash
  if (headline.includes(' — ')) {
    const [setup, ...rest] = headline.split(' — ');
    return { setup: setup.trim(), punch: rest.join(' — ').trim() };
  }

  // Strategy 2: Split at sentence boundary (last sentence is the punch)
  const sentences = headline.match(/[^.!?]+[.!?]+\s*/g);
  if (sentences && sentences.length >= 2) {
    const punch = sentences[sentences.length - 1].trim();
    const setup = sentences.slice(0, -1).join('').trim();
    return { setup, punch };
  }

  // Strategy 3: Split at comma or natural pause
  if (headline.includes(', ')) {
    const idx = headline.indexOf(', ');
    return {
      setup: headline.slice(0, idx + 1).trim(),
      punch: headline.slice(idx + 2).trim(),
    };
  }

  // Strategy 4: Split words at ~55% mark (first part = setup)
  const words = headline.split(' ');
  if (words.length >= 4) {
    const splitAt = Math.ceil(words.length * 0.45);
    return {
      setup: words.slice(0, splitAt).join(' '),
      punch: words.slice(splitAt).join(' '),
    };
  }

  // Short headline — show as single punch only
  return { setup: '', punch: headline };
}
```

Update the overlay render to use two-tier display:

```tsx
{localAsset.status === 'done' && localAsset.storage_url && localAsset.headline && showTextOverlay && (() => {
  const typo = getTypography(client.tone);
  const tiers = splitHeadlineIntoTiers(localAsset.headline);
  if (!tiers) return null;

  // Font size: responsive to punch length
  const punchWords = tiers.punch.split(' ').length;
  const punchFontSize =
    punchWords <= 3  ? 'clamp(18px, 5.5cqi, 28px)' :
    punchWords <= 5  ? 'clamp(15px, 4.5cqi, 24px)' :
    punchWords <= 8  ? 'clamp(13px, 3.8cqi, 20px)' :
                       'clamp(12px, 3.2cqi, 17px)';

  const setupFontSize =
    punchWords <= 3  ? 'clamp(11px, 2.8cqi, 15px)' :
                       'clamp(11px, 2.6cqi, 14px)';

  return (
    <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
      {/* Gradient — gradual, starts at 60% from bottom */}
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          height: '60%',
          background: 'linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.4) 45%, transparent 100%)',
        }}
      />

      <div className="relative px-5 pb-5 pt-10">
        {/* Setup line — lighter, smaller */}
        {tiers.setup && (
          <p
            className={`${typo.cssClass} text-white/75 mb-0.5`}
            style={{
              fontWeight: Math.max(typo.fontWeight - 200, 300),
              letterSpacing: typo.letterSpacing,
              textTransform: typo.textTransform,
              fontSize: setupFontSize,
              lineHeight: 1.25,
              textShadow: '0 1px 3px rgba(0,0,0,0.5)',
            }}
          >
            {tiers.setup}
          </p>
        )}

        {/* Punch line — bold, larger, full white */}
        <p
          className={`${typo.cssClass} text-white`}
          style={{
            fontWeight: Math.min(typo.fontWeight + 200, 900),
            letterSpacing: typo.textTransform === 'uppercase' ? '0.04em' : typo.letterSpacing,
            textTransform: typo.textTransform,
            fontSize: punchFontSize,
            lineHeight: 1.1,
            textShadow: '0 1px 6px rgba(0,0,0,0.7)',
          }}
        >
          {tiers.punch}
        </p>
      </div>
    </div>
  );
})()}
```

---

## LEVEL 2 — BRAND COLOR ACCENT (if brand colors are available)

If `client.brand_colors` has a primary color, use it to accent the LAST word of the punch:

```tsx
// Inside the punch line render:
const punchWords = tiers.punch.split(' ');
const lastWord = punchWords[punchWords.length - 1];
const restWords = punchWords.slice(0, -1).join(' ');
const accentColor = client.brand_colors?.[0]?.hex;

// Render punch with accent on last word:
<p className={`${typo.cssClass} text-white`} style={{ fontWeight: boldWeight, ... }}>
  {restWords}{' '}
  {accentColor ? (
    <span style={{ color: accentColor, textShadow: `0 0 20px ${accentColor}40` }}>
      {lastWord}
    </span>
  ) : lastWord}
</p>
```

Only apply accent if the brand color is dark enough to read on the gradient (avoid yellow/light colors). Check luminance:

```typescript
function isColorReadableOnDark(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // Relative luminance — skip accent if color is too light
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.7; // Only use if not too light
}
```

---

## LEVEL 3 — SIGNALOPS EMPHASIS HINT

Update SignalOps to output which part of the headline to emphasize:

**File:** `src/lib/sm/signalops-engine.ts`

In the user prompt, update the headlines array schema:

```
"headlines": [
  {
    "text": "The complete headline",
    "setup": "The gentlest hands carry",
    "punch": "the greatest strength.",
    "emphasis_word": "greatest",
    "rationale": "...",
    "be_trigger": "..."
  }
]
```

**File:** `src/types/sm.ts` — update `SMSignalOpsHeadline`:

```typescript
export interface SMSignalOpsHeadline {
  text: string;
  setup?: string;       // ← ADD: first part, lighter styling
  punch?: string;       // ← ADD: second part, bold styling
  emphasis_word?: string; // ← ADD: single word to color-accent
  rationale: string;
  be_trigger: string;
}
```

When `setup` and `punch` come from SignalOps directly, use them instead of the auto-split:

```tsx
// Priority: use SignalOps-provided setup/punch if available
const signalopsHeadline = signalOpsOutput?.headlines?.[selectedHeadlineIndex];
const tiers = signalopsHeadline?.setup && signalopsHeadline?.punch
  ? { setup: signalopsHeadline.setup, punch: signalopsHeadline.punch }
  : splitHeadlineIntoTiers(localAsset.headline ?? '');
```

---

## VISUAL RESULT

For "The gentlest hands carry the greatest strength." (warm tone = Lora):

```
[dark green background, open hand photograph]
[                                            ]
[                                            ]
[gradient starts here...                     ]
[                                            ]
The gentlest hands carry        ← small, Lora regular, 75% opacity
THE GREATEST STRENGTH.          ← large, Lora bold, full white
```

For "Unhone kaha chod do. Humne Fevicol lagaya tha." (bold tone = Bebas Neue):

```
UNHONE KAHA CHOD DO.            ← smaller, thinner
HUMNE FEVICOL LAGAYA THA.       ← larger, maximum weight, uppercase
```

---

## COMMIT

```
feat(typography): two-tier setup/punch split for dynamic headline hierarchy
feat(typography): responsive font sizing — shorter punches get bigger type
feat(typography): brand color accent on last punch word (luminance-gated)
feat(signalops): output setup/punch/emphasis_word per headline option
feat(typography): prefer SignalOps-provided split over auto-split when available
```
