# SM — Fix: Redo Button Not Visually Updating
## Cursor Brief

---

## ROOT CAUSE

The regenerate route overwrites the same file at `sm-assets/generated/{assetId}.jpg`.
The `storage_url` returned is identical to the old one.
The browser has the old image cached — so even though the file changed on Supabase, the browser shows the old image.

---

## FIX 1 — ADD CACHE-BUSTING TO IMAGE SRC (frontend, instant fix)

**File:** `src/components/sm/AssetCard.tsx`

When displaying the generated image, append a `?v=` timestamp so the browser always re-fetches:

```tsx
{asset.status === "done" && asset.storage_url && (
  <img
    src={`${asset.storage_url}?v=${new Date(asset.created_at).getTime()}`}
    alt={`${platformLabel} ${typeLabel}`}
    className="h-full w-full object-cover"
  />
)}
```

But `created_at` won't change on update. Better: use a local `refreshKey` state that increments on each Redo:

```tsx
export default function AssetCard({ asset, client, onRegenerate }) {
  const [regenerating, setRegenerating] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);   // ← ADD THIS
  const [localAsset, setLocalAsset] = useState(asset); // ← track latest version locally

  // Sync when parent updates asset prop
  useEffect(() => {
    setLocalAsset(asset);
  }, [asset]);

  async function handleRedo() {
    setRegenerating(true);
    setLocalAsset(prev => ({ ...prev, status: 'generating' })); // optimistic UI
    try {
      await onRegenerate(asset.id);
      setRefreshKey(k => k + 1);  // ← force image re-fetch after redo
    } finally {
      setRegenerating(false);
    }
  }

  // Use refreshKey in the image src:
  // src={`${localAsset.storage_url}?v=${refreshKey}`}
```

Full updated image display:
```tsx
{localAsset.status === "done" && localAsset.storage_url && (
  <>
    <img
      src={`${localAsset.storage_url}?v=${refreshKey}`}
      alt={`${platformLabel} ${typeLabel}`}
      className="h-full w-full object-cover"
    />
    {client.logo_url && (
      <div className="absolute right-3 top-3">
        <img
          src={client.logo_url}
          alt={client.name}
          className="h-8 w-auto max-w-[120px] object-contain drop-shadow-lg"
        />
      </div>
    )}
  </>
)}

{localAsset.status === "generating" && (
  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-zinc-500">
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
    <span className="text-xs">Generating...</span>
  </div>
)}
```

And update the Redo button to use `handleRedo`:
```tsx
<button
  type="button"
  onClick={() => void handleRedo()}
  disabled={regenerating || localAsset.status === "generating"}
  className="flex-1 rounded border border-zinc-600 px-2 py-1.5 text-xs text-zinc-300 hover:border-zinc-400 hover:text-white disabled:opacity-40"
>
  {regenerating ? "..." : "↻ Redo"}
</button>
```

---

## FIX 2 — STORE UNIQUE PATH PER VERSION (backend, proper fix)

**File:** `src/lib/sm/file-storage.ts`

Find `saveSmGeneratedImage`. Change the storage path to include a timestamp so each regeneration gets a unique URL:

```typescript
export async function saveSmGeneratedImage(
  assetId: string,
  bytes: Buffer,
  ext = ".jpg"
): Promise<{ publicUrl: string }> {
  // Use timestamp in path so each redo is a unique URL — no cache issues
  const timestamp = Date.now();
  const path = `generated/${assetId}-${timestamp}${ext}`;

  const { error } = await supabase.storage
    .from("sm-assets")
    .upload(path, bytes, { contentType: "image/jpeg", upsert: false });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data } = supabase.storage.from("sm-assets").getPublicUrl(path);
  return { publicUrl: data.publicUrl };
}
```

This means each redo produces a new unique URL — browser cache is never an issue. Old files accumulate in storage but that's fine for now (can add cleanup later).

---

## FIX 3 — CONFIRM onRegenerate UPDATES STATE IN PAGE.TSX

**File:** `src/app/page.tsx`

Confirm the `onRegenerate` handler updates `generatedAssets` state with the returned asset:

```tsx
onRegenerate={async (assetId) => {
  const res = await fetch(`/api/sm/assets/${assetId}/regenerate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  const updated = await res.json() as SMGeneratedAsset & { error?: string };
  if (!res.ok) {
    console.error('[Redo] Failed:', updated.error);
    return;
  }
  // Update the specific asset in state
  setGeneratedAssets(prev =>
    prev.map(a => a.id === assetId ? updated : a)
  );
}}
```

If `updated` doesn't have `storage_url` set (e.g. it returned a `generating` state), 
the image won't update. Add a log to check what the route actually returns:

```tsx
console.log('[Redo] Response:', JSON.stringify(updated));
```

If the route is returning `{ status: "generating" }` without waiting for image generation to complete — the route has a bug. Check `updateGeneratedAsset` in `store.ts` — it should return the final `done` state after `generateMarketingImageBytes` resolves.

---

## COMMIT

```
fix(sm/redo): add refreshKey cache-buster to image src — browser shows new image after redo
fix(sm/redo): use timestamped storage path per generation — unique URL per redo
fix(sm/redo): optimistic generating state in AssetCard during redo
```
