# SM — Fix: Logo in Creative is Wrong (Hallucinated by FLUX)
## Cursor Brief

The problem: FLUX is inventing/hallucinating the brand logo in the image.
The fix: remove logo from the generation prompt, overlay the real logo via CSS + sharp compositing.

---

## ROOT CAUSE

`buildImageGenerationPrompt` in `src/lib/sm/asset-generator.ts` likely includes something like
"with logo placement" or "brand logo in corner" — FLUX then draws its own guess at the logo.

FLUX cannot read files. It can only hallucinate logos from its training data.

---

## FIX 1 — REMOVE LOGO FROM FLUX PROMPT

**File:** `src/lib/sm/asset-generator.ts`

Find `buildImageGenerationPrompt`. Remove any mention of logo, watermark, or brand mark:

```typescript
// REMOVE phrases like:
// "with logo placement", "brand logo in upper right", "watermark", "logo in corner"

// ADD this explicitly:
"no logos, no text overlays, no watermarks, no brand marks in image"
```

The final prompt should end with something like:
```typescript
return `${visualDescription}, no text in image, no logos, no watermarks, clean composition with clear space in the lower third for headline overlay`.slice(0, 3800);
```

---

## FIX 2 — OVERLAY REAL LOGO VIA CSS (frontend)

This is the right approach for the live preview. The AssetCard shows the image — position the brand logo on top using absolute CSS.

**File:** `src/components/sm/AssetCard.tsx`

Find the image preview section. Wrap it and add a logo overlay:

```tsx
{/* Image container with logo overlay */}
<div className="relative aspect-square bg-zinc-900 overflow-hidden">
  
  {/* Generated image */}
  {asset.status === 'done' && asset.storage_url && (
    <img
      src={asset.storage_url}
      alt={`${asset.platform} ${asset.asset_type}`}
      className="w-full h-full object-cover"
    />
  )}

  {/* Real brand logo overlay — top right corner */}
  {client.logo_url && asset.status === 'done' && (
    <div className="absolute top-3 right-3">
      <img
        src={client.logo_url}
        alt={client.name}
        className="h-8 w-auto object-contain drop-shadow-lg"
        style={{ maxWidth: '120px' }}
      />
    </div>
  )}

  {/* Platform label */}
  <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
    {asset.platform} · {asset.asset_type}
  </div>

  {/* Loading state */}
  {asset.status === 'generating' && (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-zinc-500">
      <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      <span className="text-xs">Generating...</span>
    </div>
  )}

  {/* Failed state */}
  {asset.status === 'failed' && (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
      <p className="text-red-400 text-sm font-medium">Generation failed</p>
      {asset.error_message && (
        <p className="text-zinc-500 text-xs">{asset.error_message}</p>
      )}
    </div>
  )}
</div>
```

### Where does client.logo_url come from?

Check `src/lib/sm/store.ts` → `mapClient`. The `SMClient` interface should have `logo_url`.

If it's not in the interface yet, add to `src/types/sm.ts`:
```typescript
export interface SMClient {
  // ... existing fields ...
  logo_url?: string;   // ← add this
}
```

And in `store.ts` → `mapClient`:
```typescript
logo_url: row.logo_url ? String(row.logo_url) : undefined,
```

And in the DB (if the column doesn't exist):
```sql
ALTER TABLE sm_clients ADD COLUMN IF NOT EXISTS logo_url TEXT;
```

---

## FIX 3 — COMPOSITE LOGO INTO DOWNLOAD (server-side)

For the Download button, the image file needs the logo baked in. Use `sharp`.

### Install sharp:
```bash
npm install sharp
npm install --save-dev @types/sharp
```

### Create compositing helper:

**File:** `src/lib/sm/logo-composite.ts`

```typescript
import sharp from 'sharp';

export async function compositeLogoOntoImage(
  imageBuffer: Buffer,
  logoUrl: string,
  position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' = 'top-right'
): Promise<Buffer> {
  // Fetch logo
  const logoRes = await fetch(logoUrl);
  if (!logoRes.ok) {
    // If logo fetch fails, return original image unchanged
    console.warn('[logo-composite] Could not fetch logo:', logoUrl);
    return imageBuffer;
  }
  const logoBuffer = Buffer.from(await logoRes.arrayBuffer());

  // Get image dimensions
  const image = sharp(imageBuffer);
  const { width = 1080, height = 1080 } = await image.metadata();

  // Resize logo to max 18% of image width
  const logoMaxWidth = Math.round(width * 0.18);
  const resizedLogo = await sharp(logoBuffer)
    .resize({ width: logoMaxWidth, withoutEnlargement: true })
    .toBuffer();

  const logoMeta = await sharp(resizedLogo).metadata();
  const logoW = logoMeta.width ?? logoMaxWidth;
  const logoH = logoMeta.height ?? 40;

  const padding = Math.round(width * 0.03); // 3% padding

  const gravity: Record<typeof position, { top: number; left: number }> = {
    'top-right':     { top: padding, left: width - logoW - padding },
    'top-left':      { top: padding, left: padding },
    'bottom-right':  { top: height - logoH - padding, left: width - logoW - padding },
    'bottom-left':   { top: height - logoH - padding, left: padding },
  };

  const { top, left } = gravity[position];

  return image
    .composite([{ input: resizedLogo, top, left }])
    .jpeg({ quality: 90 })
    .toBuffer();
}
```

### Wire into download route:

**File:** `src/app/api/sm/assets/[id]/download/route.ts`

```typescript
import { compositeLogoOntoImage } from '@/lib/sm/logo-composite';
import { getSupabase } from '@/lib/supabase';
import { getAsset, getClient, getCreativeRequest } from '@/lib/sm/store';

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const asset = await getAsset(id);
  if (!asset?.storage_url) {
    return new Response('Asset not found', { status: 404 });
  }

  // Download the generated image
  const imageRes = await fetch(asset.storage_url);
  if (!imageRes.ok) return new Response('Image not found', { status: 404 });
  let imageBuffer = Buffer.from(await imageRes.arrayBuffer());

  // Composite the brand logo if available
  try {
    const request = await getCreativeRequest(asset.request_id);
    if (request) {
      const client = await getClient(request.client_id);
      if (client?.logo_url) {
        imageBuffer = await compositeLogoOntoImage(imageBuffer, client.logo_url, 'top-right');
      }
    }
  } catch (e) {
    // Logo compositing failed — serve image without logo rather than erroring
    console.warn('[download] Logo composite failed, serving without logo:', e);
  }

  const filename = `${asset.platform}-${asset.asset_type}-${id.slice(0, 8)}.jpg`;

  return new Response(imageBuffer, {
    headers: {
      'Content-Type': 'image/jpeg',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(imageBuffer.length),
    },
  });
}
```

---

## FIX 4 — LOGO UPLOAD IN BRAND PROFILE

For the logo overlay to work, the brand profile needs to save a `logo_url`.
Check `src/components/sm/LogoUploader.tsx` and `src/components/sm/BrandProfileForm.tsx`:

```bash
grep -n "logo_url\|logo\|upload" src/components/sm/LogoUploader.tsx | head -10
grep -n "logo_url\|logo" src/components/sm/BrandProfileForm.tsx | head -10
```

If `logo_url` is not being saved to `sm_clients` after upload — find the upload API route
(`src/app/api/sm/clients/[id]/assets/route.ts` or similar) and ensure it does:

```typescript
// After uploading logo to storage:
if (type === 'logo') {
  await supabase
    .from('sm_clients')
    .update({ logo_url: publicUrl })
    .eq('id', clientId);
}
```

---

## COMMIT

```
fix(sm): remove logo from FLUX prompt — stop AI hallucinating brand logos
feat(sm): overlay real brand logo in AssetCard via CSS positioning
feat(sm): composite brand logo into downloaded image using sharp
fix(sm): add logo_url field to SMClient type and store mapper
fix(sm): save logo_url to sm_clients after logo upload
```
