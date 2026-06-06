# SM — Fix: Logo Missing + Image Quality
## Cursor Brief

---

## FIX 1 — LOGO MISSING

### 1A — Add logo_url column to DB (run in Supabase SQL Editor)
```sql
ALTER TABLE sm_clients ADD COLUMN IF NOT EXISTS logo_url TEXT;
```

### 1B — Check LogoUploader saves logo_url to sm_clients

**File:** `src/components/sm/LogoUploader.tsx`

Find where it calls the upload API. After upload succeeds, it must PATCH the client:

```bash
grep -n "logo_url\|client_id\|PATCH\|PUT\|update" src/components/sm/LogoUploader.tsx
grep -n "logo_url\|client_id" src/app/api/sm/clients/\[id\]/assets/route.ts
```

In `src/app/api/sm/clients/[id]/assets/route.ts`, after uploading the file to storage, if `type === 'logo'` update the client record:

```typescript
if (type === 'logo') {
  await supabase
    .from('sm_clients')
    .update({ logo_url: publicUrl })
    .eq('id', clientId);
}
```

### 1C — Pass logo_url back when client is fetched

After saving a logo, the `BrandProfileForm` calls `onSave(client)` which sets `activeClient` in page state. Make sure the returned client object includes `logo_url`.

In `src/lib/sm/store.ts` → `mapClient` — `logo_url` is already mapped (line 29). ✓

**The likely real issue:** the Fevicol brand was created before `logo_url` was added. Either:
- Re-create the brand profile and upload a logo this time
- Or update the existing record directly in Supabase Table Editor → `sm_clients` → set `logo_url` to the Supabase Storage public URL of the logo

---

## FIX 2 — IMAGE QUALITY: USE ALL SIGNALOPS DATA IN PROMPT

**File:** `src/lib/sm/asset-generator.ts`

The current `buildImageGenerationPrompt` ignores `headline`, `platform`, and `asset_type`. Replace it entirely:

```typescript
export function buildImageGenerationPrompt(
  client: SMClient,
  signalops: SMSignalOpsOutput,
  platform: SMPlatform,
  assetType: SMAssetType,
  headline: string
): string {
  // Extract the creative tension — this is the visual idea
  const tension = signalops.insight_bridge?.creative_tension?.trim();
  const visualDir = signalops.visual_direction?.trim();
  const colorRec = signalops.color_recommendation?.trim();
  const theme = signalops.theme?.trim();
  const tone = client.tone ?? 'professional';

  // Platform-specific composition guidance
  const compositionNote =
    assetType === 'story' || assetType === 'reel_cover'
      ? 'vertical portrait composition, subject centered with breathing room top and bottom'
      : platform === 'linkedin'
      ? 'wide landscape composition, professional setting, corporate aesthetic'
      : 'square composition, bold central subject, clean negative space at bottom third for text';

  // Build the prompt: FLUX works best with scene description first, then style
  const parts = [
    // Scene/concept (most important for FLUX)
    tension ? `Concept: ${tension}` : theme,
    visualDir,

    // Art direction
    `Color palette: ${colorRec || 'neutral professional tones'}`,
    `Brand tone: ${tone}`,
    compositionNote,

    // Quality and style
    'ultra high quality commercial photography',
    'sharp focus, professional studio lighting',
    'clean background, premium advertising aesthetic',
    '8k resolution',

    // Hard restrictions
    'no text in image',
    'no logos',
    'no watermarks',
    'no visible brand marks',
    'no people unless central to the concept',
  ].filter(Boolean).join(', ');

  return parts.replace(/\s+/g, ' ').trim().slice(0, 3800);
}
```

---

## FIX 3 — IMPROVE SIGNALOPS VISUAL DIRECTION FOR FLUX

The SignalOps `visual_direction` field drives the image prompt. If it says "warm tones, aspirational, split composition" — FLUX generates something generic.

**File:** `src/lib/sm/signalops-engine.ts`

In the user prompt where `visual_direction` is requested, update the instruction to be FLUX-specific:

Find the JSON schema instruction for `visual_direction` and replace with:

```
"visual_direction": "Describe the SCENE in concrete visual terms that an image generation model can render directly. Name: the main subject/object, its position, lighting direction, background description, color treatment, and mood. Do NOT use abstract words like 'aspirational' or 'premium' — name specific visual elements instead. Example: 'A single vintage leather football resting on cracked dry earth, warm amber side-lighting from the left, dusty ochre background, shallow depth of field, the ball shows wear and age — it has history'."
```

This forces SignalOps to output scene descriptions that FLUX can actually render rather than abstract creative concepts.

---

## FIX 4 — QUICK TEST AFTER FIXES

1. Re-create or update the Fevicol brand profile with a real logo uploaded
2. Submit a new brief
3. Check SignalOps `visual_direction` field — it should describe a concrete scene now
4. Generate — image should reflect the scene description
5. Logo overlay should appear in top-right corner of the AssetCard

---

## COMMIT

```
fix(sm/db): add logo_url column to sm_clients
fix(sm/assets): save logo_url to sm_clients after logo upload
fix(sm/prompt): use insight_bridge tension + platform context in image prompt
fix(sm/signalops): instruct visual_direction to use FLUX-renderable scene descriptions
```
