# SM — Reconcile: Typography + Brand Kit
## Cursor Brief · Read this BEFORE implementing either CURSOR_DYNAMIC_TYPOGRAPHY.md or CURSOR_BRAND_KIT_V1.md

These two briefs were written in sequence and have 3 conflicts. Implement both together using the resolutions below.

---

## CONFLICT 1 — Two font selection functions

**Problem:**
- `CURSOR_DYNAMIC_TYPOGRAPHY.md` creates `getTypography(tone: SMTone): TypographyStyle`
- `CURSOR_BRAND_KIT_V1.md` creates `getClientTypography(client: SMClient): TypographyStyle`

Both exist in `src/lib/sm/typography.ts`. `AssetCard` may call either.

**Resolution:**
- Keep BOTH functions in `typography.ts`
- `getClientTypography` calls `getTypography` as its fallback — it's a superset
- **All calls in `AssetCard.tsx` and any other component must use `getClientTypography(client)` only**
- Delete any direct calls to `getTypography(client.tone)` outside of `getClientTypography`'s internal fallback

```typescript
// typography.ts — correct structure:

export function getTypography(tone?: SMTone): TypographyStyle {
  return TONE_TYPOGRAPHY[tone ?? 'professional'];
}

export function getClientTypography(client: SMClient): TypographyStyle {
  if (client.font_primary) {
    // Brand kit font overrides tone mapping
    return buildCustomTypography(client.font_primary);
  }
  // Fallback to tone mapping
  return getTypography(client.tone);
}

// In AssetCard — ALWAYS use:
const typo = getClientTypography(client);
// NEVER use:
// const typo = getTypography(client.tone); ← remove all instances of this
```

---

## CONFLICT 2 — CSS class vs inline fontFamily

**Problem:**
- `CURSOR_DYNAMIC_TYPOGRAPHY.md` uses CSS class names (`.font-lora`, `.font-bebas`) for reliable preset font rendering
- `CURSOR_BRAND_KIT_V1.md` uses inline `style={{ fontFamily: '...' }}` for brand-specified fonts
- The `TypographyStyle` interface must support both

**Resolution:**
Update `TypographyStyle` to carry both fields:

```typescript
export interface TypographyStyle {
  // For preset tone fonts (loaded via Google Fonts in layout.tsx)
  cssClass: string;              // e.g. 'font-lora' — use as className
  
  // For brand-specified fonts (loaded dynamically)
  fontFamily?: string;          // e.g. 'Helvetica Neue' — use as inline style
  isCustomFont?: boolean;       // true when fontFamily should override cssClass

  // Common to both
  fontWeight: number;
  letterSpacing: string;
  textTransform: 'uppercase' | 'none';
  lineHeight: number;
  italic: boolean;
}
```

In `AssetCard`, apply conditionally:

```tsx
const typo = getClientTypography(client);

// Typography class and style — handles both cases:
const fontClass = typo.isCustomFont ? '' : typo.cssClass;
const fontStyle = typo.isCustomFont && typo.fontFamily
  ? { fontFamily: `'${typo.fontFamily}', sans-serif` }
  : {};

// Use in both setup and punch lines:
<p
  className={`${fontClass} text-white`}
  style={{
    ...fontStyle,
    fontWeight: punchWeight,
    letterSpacing: typo.letterSpacing,
    textTransform: typo.textTransform,
    fontSize: punchFontSize,
    lineHeight: typo.lineHeight,
    textShadow: '0 1px 6px rgba(0,0,0,0.7)',
  }}
>
  {tiers.punch}
</p>
```

The preset CSS classes (`.font-lora`, etc.) are always loaded in `layout.tsx` via Google Fonts link. Brand-specified fonts are loaded on demand in `AssetCard` via a `useEffect`.

---

## CONFLICT 3 — Color accent source

**Problem:**
- `CURSOR_DYNAMIC_TYPOGRAPHY.md` reads brand accent from `client.brand_colors?.[0]?.hex`
- `CURSOR_BRAND_KIT_V1.md` introduces `client.color_palette.accent` as the proper field

Both refer to the accent color, but different data structures.

**Resolution:**
Use a single helper that checks both, brand kit taking priority:

```typescript
// In AssetCard or typography.ts:
export function getBrandAccentColor(client: SMClient): string | null {
  // Brand kit color palette takes priority
  if (client.color_palette?.accent) return client.color_palette.accent;
  if (client.color_palette?.primary) return client.color_palette.primary;
  // Legacy fallback
  if (client.brand_colors?.length) return client.brand_colors[0].hex;
  return null;
}
```

Use this everywhere the accent color is needed:
- Typography emphasis_word highlight
- Logo selector (color_palette.background helps determine logo variant)
- Any brand color reference in image prompts

---

## IMPLEMENTATION ORDER

Implement in this order to avoid rework:

1. **Update `TypographyStyle` interface** in `typography.ts` — add `fontFamily`, `isCustomFont` fields
2. **Update `TONE_TYPOGRAPHY` map** — add `cssClass` to each entry, keep existing values
3. **Add `getClientTypography(client)`** function
4. **Add `getBrandAccentColor(client)`** helper
5. **Update `AssetCard`** — replace all `getTypography(client.tone)` with `getClientTypography(client)`, use `fontClass`/`fontStyle` pattern
6. **Run DB migration** from Brand Kit brief
7. **Update `BrandProfileForm`** with brand kit fields
8. **Update `mapClient`** in store.ts

---

## WHAT NOT TO DO

- Do NOT create two separate `getTypography` call sites in `AssetCard` — one for tone, one for brand kit
- Do NOT use `client.brand_colors[0]` directly for accent color anywhere after this — always use `getBrandAccentColor(client)`
- Do NOT use CSS class names for brand-specified fonts (they won't be loaded in the preset stylesheet)
- Do NOT use inline `fontFamily` for preset tone fonts (less reliable, defeats the CSS class approach)

---

## COMMIT

```
refactor(typography): unify getClientTypography as single font selection function
refactor(typography): TypographyStyle supports both cssClass (preset) and fontFamily (brand)
refactor(typography): getBrandAccentColor helper — brand kit priority, legacy fallback
refactor(assetcard): replace all getTypography(tone) calls with getClientTypography(client)
```
