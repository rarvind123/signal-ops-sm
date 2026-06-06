# SM — Logo Visibility: Bigger + Halo Effect + No Box
## Cursor Brief

---

## CHANGE 1 — REMOVE THE BOX, ADD HALO

**File:** `src/components/sm/AssetCard.tsx`

Find the logo overlay section. Replace it entirely:

```tsx
{/* Logo overlay — top right, no box, halo for visibility on any background */}
{logoUrl && localAsset.status === 'done' && (
  <div className="absolute right-3 top-3">
    <img
      src={logoUrl}
      alt={client.name}
      className="h-10 w-auto max-w-[130px] object-contain"
      style={{
        filter:
          'drop-shadow(0 0 3px rgba(255,255,255,0.95)) drop-shadow(0 0 7px rgba(0,0,0,0.85))',
      }}
    />
  </div>
)}
```

What changed:
- Removed `rounded bg-black/20 p-1 backdrop-blur-sm` — no box, no padding
- Size: `h-10` (40px) up from `h-7` (28px), `max-w-[130px]` up from `max-w-[100px]`
- Added CSS `drop-shadow` halo: white glow outward + black shadow — logo stays legible on any background

---

## CHANGE 2 — SAME HALO IN DOWNLOAD (sharp compositing)

**File:** `src/lib/sm/logo-composite.ts`

The download route composites the logo onto the image using sharp. Update it to add a soft glow/shadow using sharp's composite with a blurred white clone:

```typescript
import sharp from 'sharp';

export async function compositeLogoOntoImage(
  imageBuffer: Buffer,
  logoUrl: string,
  position: 'top-right' | 'top-left' = 'top-right'
): Promise<Buffer> {
  const logoRes = await fetch(logoUrl);
  if (!logoRes.ok) return imageBuffer; // fail silently

  const logoBuffer = Buffer.from(await logoRes.arrayBuffer());
  const image = sharp(imageBuffer);
  const { width = 1080, height = 1080 } = await image.metadata();

  // Logo max width = 18% of image width
  const logoMaxWidth = Math.round(width * 0.18);
  const resizedLogo = await sharp(logoBuffer)
    .resize({ width: logoMaxWidth, withoutEnlargement: true })
    .toBuffer();

  const logoMeta = await sharp(resizedLogo).metadata();
  const logoW = logoMeta.width ?? logoMaxWidth;
  const logoH = logoMeta.height ?? 40;
  const padding = Math.round(width * 0.03);

  const positions = {
    'top-right': { top: padding, left: width - logoW - padding },
    'top-left':  { top: padding, left: padding },
  };
  const { top, left } = positions[position];

  // Create a white glow layer: enlarge logo slightly, blur it, tint white
  const glowSize = Math.round(logoMaxWidth * 1.15);
  const glowBuffer = await sharp(logoBuffer)
    .resize({ width: glowSize, withoutEnlargement: true })
    .blur(4)
    .tint({ r: 255, g: 255, b: 255 })
    .toBuffer();

  const glowMeta = await sharp(glowBuffer).metadata();
  const glowW = glowMeta.width ?? glowSize;
  const glowH = glowMeta.height ?? logoH;

  // Center glow behind logo
  const glowTop = top - Math.round((glowH - logoH) / 2);
  const glowLeft = left - Math.round((glowW - logoW) / 2);

  return image
    .composite([
      // White glow behind
      {
        input: glowBuffer,
        top: Math.max(0, glowTop),
        left: Math.max(0, glowLeft),
        blend: 'over',
      },
      // Actual logo on top
      {
        input: resizedLogo,
        top,
        left,
        blend: 'over',
      },
    ])
    .jpeg({ quality: 90 })
    .toBuffer();
}
```

---

## CHANGE 3 — LOGO BACKGROUND OPTION IN BRAND PROFILE (optional, Phase 2)

Add a `logo_bg` field to `SMClient` with three values:
- `none` (default) — halo only, no background
- `frost` — `bg-white/15 backdrop-blur-sm rounded-lg px-2 py-1`
- `dark` — `bg-black/40 rounded-lg px-2 py-1`

User sets this once in BrandProfileForm. AssetCard reads `client.logo_bg` and applies the right style.

**Don't build this now** — the halo approach handles 95% of cases well. Add this only if a specific brand complains the logo isn't readable.

---

## COMMIT

```
feat(sm/logo): remove background box — transparent PNG renders cleanly
feat(sm/logo): increase logo size to h-10 / max-w-[130px]
feat(sm/logo): add CSS halo (white glow + black shadow) for universal visibility
feat(sm/logo): add glow layer to sharp compositing in download route
```
