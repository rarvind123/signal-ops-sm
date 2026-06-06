# SM — Three Fixes: Logo Overlay + Redo Direction + No Pack Shot
## Cursor Brief

---

## FIX 1 — LOGO OVERLAY (the real fix)

The CSS overlay code exists in `AssetCard.tsx` but `client.logo_url` is null.
Stop depending on `client.logo_url` being set. Instead, fetch the logo directly from `sm_brand_assets`.

### 1A — Add a logo endpoint

**File:** `src/app/api/sm/clients/[id]/logo/route.ts` (new file)

```typescript
import { smRouteHandler } from '@/lib/sm/api-auth';
import { supabase } from '@/lib/supabase';

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  return smRouteHandler(_req, async () => {
    const { id } = await context.params;

    // First try logo_url column on sm_clients
    const { data: client } = await supabase
      .from('sm_clients')
      .select('logo_url')
      .eq('id', id)
      .single();

    if (client?.logo_url) return { logo_url: client.logo_url };

    // Fallback: get most recent logo from sm_brand_assets
    const { data: asset } = await supabase
      .from('sm_brand_assets')
      .select('storage_url')
      .eq('client_id', id)
      .eq('type', 'logo')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return { logo_url: asset?.storage_url ?? null };
  });
}
```

### 1B — Load logo in AssetCard

**File:** `src/components/sm/AssetCard.tsx`

Add a `logoUrl` state that fetches on mount:

```tsx
const [logoUrl, setLogoUrl] = useState<string | null>(client.logo_url ?? null);

useEffect(() => {
  if (logoUrl) return; // already have it
  fetch(`/api/sm/clients/${client.id}/logo`)
    .then(r => r.json())
    .then((data: { logo_url: string | null }) => {
      if (data.logo_url) setLogoUrl(data.logo_url);
    })
    .catch(() => {}); // silently fail — no logo is fine
}, [client.id, logoUrl]);
```

Replace every `client.logo_url` reference in the component with `logoUrl`:

```tsx
{/* Logo overlay — top right corner */}
{logoUrl && asset.status === 'done' && (
  <div className="absolute right-3 top-3 rounded bg-black/20 p-1 backdrop-blur-sm">
    <img
      src={logoUrl}
      alt={client.name}
      className="h-7 w-auto max-w-[100px] object-contain drop-shadow"
    />
  </div>
)}
```

### 1C — Also fix the assets route to save logo_url on upload

**File:** `src/app/api/sm/clients/[id]/assets/route.ts`

Find the POST handler. After getting the public URL, add:

```typescript
// After upload succeeds and publicUrl is obtained:
if (body.get('type') === 'logo' || formData.get('type') === 'logo') {
  await supabase
    .from('sm_clients')
    .update({ logo_url: publicUrl, updated_at: new Date().toISOString() })
    .eq('id', params.id);
}
```

---

## FIX 2 — REDO DIRECTION INPUT (implement it now)

**File:** `src/components/sm/AssetCard.tsx`

Add these state variables at the top of the component:

```tsx
const [showRedoInput, setShowRedoInput] = useState(false);
const [redoDirection, setRedoDirection] = useState('');
const [regenerating, setRegenerating] = useState(false);
const [refreshKey, setRefreshKey] = useState(0);
```

Replace the entire action buttons section at the bottom of the card with:

```tsx
<div className="mt-auto flex flex-col gap-1.5 px-3 pb-3 pt-1">

  {/* Direction input — shown when Redo is clicked */}
  {showRedoInput && (
    <div className="flex gap-1.5">
      <input
        autoFocus
        type="text"
        value={redoDirection}
        onChange={e => setRedoDirection(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') void handleRedo();
          if (e.key === 'Escape') { setShowRedoInput(false); setRedoDirection(''); }
        }}
        placeholder="e.g. warmer tones, no chess pieces, outdoor setting..."
        className="min-w-0 flex-1 rounded border border-violet-500/40 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-violet-400 focus:outline-none"
      />
      <button
        type="button"
        onClick={() => void handleRedo()}
        disabled={regenerating}
        className="shrink-0 rounded border border-violet-500/30 bg-violet-600/20 px-3 py-1.5 text-xs text-violet-300 hover:bg-violet-600/30 disabled:opacity-40"
      >
        {regenerating ? '…' : '↻'}
      </button>
    </div>
  )}

  {/* Main action row */}
  <div className="flex gap-2">
    <button
      type="button"
      onClick={() => void handleDownload()}
      className="flex-1 rounded border border-zinc-600 px-2 py-1.5 text-center text-xs text-zinc-300 hover:border-zinc-400 hover:text-white"
    >
      ↓ Download
    </button>
    <button
      type="button"
      onClick={() => {
        if (!showRedoInput) {
          setShowRedoInput(true);
        } else if (redoDirection.trim()) {
          void handleRedo();
        } else {
          setShowRedoInput(false);
        }
      }}
      disabled={regenerating || asset.status === 'generating'}
      className="flex-1 rounded border border-zinc-600 px-2 py-1.5 text-xs text-zinc-300 hover:border-zinc-400 hover:text-white disabled:opacity-40"
    >
      {regenerating ? '…' : '↻ Redo'}
    </button>
    <button
      type="button"
      onClick={() => setShowPublish(true)}
      className="flex-1 rounded border border-violet-500/30 bg-violet-600/20 px-2 py-1.5 text-xs text-violet-300 hover:bg-violet-600/30"
    >
      ↑ Publish
    </button>
  </div>
</div>
```

Add the `handleRedo` function inside the component:

```tsx
async function handleRedo() {
  setRegenerating(true);
  try {
    const res = await fetch(`/api/sm/assets/${asset.id}/regenerate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ direction: redoDirection.trim() || undefined }),
    });
    const updated = await res.json() as SMGeneratedAsset;
    if (res.ok) {
      setRefreshKey(k => k + 1);
      setShowRedoInput(false);
      setRedoDirection('');
      await onRegenerate(asset.id); // sync parent state
    }
  } finally {
    setRegenerating(false);
  }
}
```

Update the image `src` to use `refreshKey`:
```tsx
src={`${asset.storage_url}?v=${refreshKey}`}
```

### Wire direction into regenerate route

**File:** `src/app/api/sm/assets/[id]/regenerate/route.ts`

Find where `prompt` is constructed. Add direction handling:

```typescript
const userDirection = typeof body.direction === 'string' && body.direction.trim()
  ? body.direction.trim()
  : null;

const basePrompt = asset.generation_prompt
  || buildImageGenerationPrompt(client, signalops, asset.platform, asset.asset_type, headline);

const prompt = userDirection
  ? `${userDirection}. ${basePrompt}`.slice(0, 3800)
  : basePrompt;
```

---

## FIX 3 — NO PACK SHOTS / NO PRODUCT IN IMAGE

FLUX generates Fevicol tins because the brand name appears in the prompt and FLUX has been trained on Fevicol product images.

**File:** `src/lib/sm/asset-generator.ts`

In `buildImageGenerationPrompt`, add explicit exclusions at the end:

```typescript
const exclusions = [
  'no product packaging',
  'no product tins',
  'no bottles',
  'no containers',
  'no pack shots',
  'no product labels',
  'no text in image',
  'no logos',
  'no watermarks',
  'no brand marks',
].join(', ');

return `${mainPrompt}, ${exclusions}`.slice(0, 3800);
```

Also: do NOT include the brand name (`client.name`) anywhere in the image prompt. It triggers FLUX to render the product. Replace any `client.name` in the prompt with the brand's tone and category context instead.

---

## COMMIT

```
fix(sm/logo): fetch logo from sm_brand_assets as fallback — overlay works without logo_url set
fix(sm/logo): save logo_url to sm_clients on logo asset upload
feat(sm/redo): implement direction input that expands on Redo click
feat(sm/redo): pass user direction to regenerate route + prepend to prompt
fix(sm/prompt): exclude pack shots and product tins from image generation prompt
fix(sm/prompt): remove brand name from image prompt to prevent product hallucination
```
