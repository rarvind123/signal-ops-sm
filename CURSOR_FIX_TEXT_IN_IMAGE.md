# SM — Fix: Text/Numbers in Images + Logo Halo
## Cursor Brief

---

## FIX 1 — STOP FLUX GENERATING TEXT/NUMBERS IN IMAGES

**File:** `src/lib/sm/asset-generator.ts`

Find `buildImageGenerationPrompt`. Replace the exclusions at the end with a stronger, more explicit list:

```typescript
const exclusions = [
  'absolutely no text of any kind in the image',
  'no numbers',
  'no digits',
  'no dates',
  'no years',
  'no words written on any surface',
  'no chalkboard writing',
  'no signs with text',
  'no labels',
  'no captions',
  'no product packaging',
  'no product tins or bottles',
  'no pack shots',
  'no logos in the generated image',
  'no watermarks',
  'no brand marks',
].join(', ');

return `${mainPrompt}, ${exclusions}`.slice(0, 3800);
```

Also: do NOT include `client.name` anywhere in the image prompt — brand names trigger FLUX to render hallucinated product visuals and text.

Find every place `client.name` appears in the prompt construction and remove it. Replace with `client.tone` or a category description if context is needed.

---

## FIX 2 — LOGO SIZE + HALO (already done in AssetCard.tsx)

The AssetCard.tsx file has already been updated with `h-12`, `max-w-[150px]`, and a stronger triple-layer halo. Confirm the current values are:

```tsx
className="h-12 w-auto max-w-[150px] object-contain"
style={{
  filter:
    "drop-shadow(0 0 4px rgba(255,255,255,1)) drop-shadow(0 0 12px rgba(0,0,0,1)) drop-shadow(0 0 2px rgba(255,255,255,0.9))",
}}
```

If they are already correct — no change needed. Just push to deploy.

---

## COMMIT + DEPLOY

```bash
git add src/lib/sm/asset-generator.ts src/components/sm/AssetCard.tsx
git commit -m "fix(prompt): exclude all text/numbers/dates from image generation
fix(logo): h-12 size + stronger triple halo for mid-tone backgrounds"
git push origin master
```
