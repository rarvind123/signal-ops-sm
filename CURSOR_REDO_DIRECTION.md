# SM — Fix: Logo Not Showing + Redo Direction Input
## Cursor Brief

---

## FIX 1 — LOGO STILL NOT SHOWING: FIND THE ACTUAL CAUSE

Run this in Supabase SQL Editor to check the current state:

```sql
-- Check if logo_url column exists and has data
SELECT id, name, logo_url FROM sm_clients ORDER BY created_at DESC LIMIT 10;

-- Check if logo files exist in storage
-- Go to Supabase → Storage → sm-assets → browse for any logo/ files
```

### Case A: logo_url column is NULL for all rows
The LogoUploader uploads to storage but never writes back to `sm_clients`.

**File:** `src/app/api/sm/clients/[id]/assets/route.ts`

Find the POST handler. After uploading the file, add:

```typescript
// After getting the public URL from storage:
if (type === 'logo') {
  const { error: updateError } = await supabase
    .from('sm_clients')
    .update({ logo_url: publicUrl, updated_at: new Date().toISOString() })
    .eq('id', params.id);

  if (updateError) {
    console.warn('[asset upload] Could not update logo_url on client:', updateError.message);
  }
}
```

### Case B: logo_url is set in DB but not reaching the frontend

Check `BrandProfileForm.tsx` and `ClientSelector.tsx` — when a client is selected or saved, the `activeClient` state in `page.tsx` must include `logo_url`.

In `store.ts` → `mapClient`, `logo_url` is already mapped. So the issue is likely that:
- The client is loaded once (at brand selection) before any logo is uploaded
- After uploading a logo, `activeClient` in page state is never refreshed

**Fix in `page.tsx`:** After logo upload, refresh the active client from the DB:

```tsx
// Add a refreshClient function:
async function refreshActiveClient() {
  if (!activeClient) return;
  const res = await fetch(`/api/sm/clients/${activeClient.id}`);
  if (res.ok) {
    const updated = await res.json();
    setActiveClient(updated);
  }
}
```

Pass this to `BrandProfileForm` as `onLogoUploaded={refreshActiveClient}` and call it after LogoUploader completes.

### Case C: No logo uploaded at all for this brand

Go to Brand step → edit Fevicol profile → upload a logo file. Then regenerate.

The brand profile form may not show a logo upload option clearly. Check `BrandProfileForm.tsx`:
```bash
grep -n "LogoUploader\|logo" src/components/sm/BrandProfileForm.tsx | head -10
```

If LogoUploader is present but not calling an upload API — find and fix the upload handler.

---

## FIX 2 — REDO DIRECTION INPUT

Add a small expandable text input to the Redo button so users can type creative direction before regenerating.

**File:** `src/components/sm/AssetCard.tsx`

Replace the current Redo button with an expandable panel:

```tsx
const [showRedoInput, setShowRedoInput] = useState(false);
const [redoDirection, setRedoDirection] = useState('');

// In the action buttons section, replace the Redo button:
<div className="flex flex-col gap-1.5">
  {/* Redo direction input — appears when Redo is clicked */}
  {showRedoInput && (
    <div className="flex gap-1.5">
      <input
        type="text"
        value={redoDirection}
        onChange={e => setRedoDirection(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && !regenerating) {
            void handleRedoWithDirection();
          }
          if (e.key === 'Escape') {
            setShowRedoInput(false);
            setRedoDirection('');
          }
        }}
        placeholder="e.g. more vibrant, darker mood, show a hand..."
        autoFocus
        className="flex-1 rounded border border-violet-500/40 bg-zinc-900 px-2 py-1 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500"
      />
      <button
        type="button"
        onClick={() => void handleRedoWithDirection()}
        disabled={regenerating}
        className="rounded border border-violet-500/30 bg-violet-600/20 px-2.5 py-1 text-xs text-violet-300 hover:bg-violet-600/30 disabled:opacity-40"
      >
        {regenerating ? '...' : '↻'}
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
        if (showRedoInput && redoDirection.trim()) {
          void handleRedoWithDirection();
        } else {
          setShowRedoInput(prev => !prev);
          if (showRedoInput) setRedoDirection('');
        }
      }}
      disabled={regenerating || localAsset.status === 'generating'}
      className="flex-1 rounded border border-zinc-600 px-2 py-1.5 text-xs text-zinc-300 hover:border-zinc-400 hover:text-white disabled:opacity-40"
    >
      {regenerating ? '...' : showRedoInput ? '× Cancel' : '↻ Redo'}
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

Add the `handleRedoWithDirection` function:

```tsx
async function handleRedoWithDirection() {
  setRegenerating(true);
  setLocalAsset(prev => ({ ...prev, status: 'generating' }));
  try {
    // Pass direction as body to the regenerate API
    const res = await fetch(`/api/sm/assets/${asset.id}/regenerate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        direction: redoDirection.trim() || undefined,
      }),
    });
    const updated = await res.json() as SMGeneratedAsset;
    if (res.ok) {
      setLocalAsset(updated);
      setRefreshKey(k => k + 1);
      setShowRedoInput(false);
      setRedoDirection('');
    }
    await onRegenerate(asset.id); // sync parent state
  } finally {
    setRegenerating(false);
  }
}
```

### Wire direction into the regenerate route

**File:** `src/app/api/sm/assets/[id]/regenerate/route.ts`

The route already reads `body`. Find where `prompt` is built and use `direction` if provided:

```typescript
const userDirection = typeof body.direction === 'string' && body.direction.trim()
  ? body.direction.trim()
  : null;

const prompt = userDirection
  // User gave specific direction — prepend it to the existing prompt
  ? `${userDirection}. ${asset.generation_prompt || buildImageGenerationPrompt(client, signalops, asset.platform, asset.asset_type, headline)}`
  : asset.generation_prompt || buildImageGenerationPrompt(client, signalops, asset.platform, asset.asset_type, headline);
```

---

## COMMIT

```
fix(sm/logo): write logo_url to sm_clients after logo upload in assets route
fix(sm/logo): refresh activeClient after logo upload so overlay appears immediately
feat(sm/redo): add direction input that expands on Redo click
feat(sm/redo): pass user direction to regenerate route to steer the new image
```
