# SM — Agency Experience: Creative Variety + Quality + Strategy Voice
## Cursor Brief

Four changes that make the tool feel like a full agency working for the account manager: visual variety memory, cross-client differentiation, quality gatekeeping, and a creative director voice on the strategy screen.

---

## FEATURE 1 — CLIENT CREATIVE GALLERY

Every client gets a visual gallery of past creatives. Before briefing, the account manager sees what's already been made — variety is visible at a glance.

### 1A — Client page with gallery

**File:** `src/app/page.tsx` (or client detail route)

On the Brand step, after selecting a client, show their recent creatives before entering the Brief step:

```tsx
{/* After ClientSelector, before Brief form */}
{step === 'brand' && activeClient && (
  <ClientGallery clientId={activeClient.id} onProceed={() => setStep('brief')} />
)}
```

**File:** `src/components/sm/ClientGallery.tsx`

```tsx
'use client';

import { useEffect, useState } from 'react';
import type { SMGeneratedAsset } from '@/types/sm';

export default function ClientGallery({
  clientId,
  onProceed,
}: {
  clientId: string;
  onProceed: () => void;
}) {
  const [assets, setAssets] = useState<SMGeneratedAsset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/sm/clients/${clientId}/gallery?limit=12`)
      .then(r => r.json())
      .then(data => { setAssets(data.assets ?? []); setLoading(false); });
  }, [clientId]);

  if (loading) return null;
  if (assets.length === 0) {
    return (
      <button onClick={onProceed} className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl px-6 py-3 text-sm font-medium">
        ✦ Create first post →
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-zinc-500 text-sm">{assets.length} creatives made — keep the variety going</p>
        <button onClick={onProceed} className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl px-5 py-2 text-sm font-medium">
          ✦ New creative →
        </button>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {assets.map(asset => (
          <div key={asset.id} className="relative aspect-square rounded-lg overflow-hidden bg-zinc-900">
            {asset.storage_url && (
              <img src={asset.storage_url} alt="" className="w-full h-full object-cover" />
            )}
            {/* Visual approach badge */}
            <div className="absolute bottom-1.5 left-1.5 text-xs bg-black/60 text-white rounded px-1.5 py-0.5">
              {asset.asset_type}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 1B — Gallery API

**File:** `src/app/api/sm/clients/[id]/gallery/route.ts`

```typescript
export async function GET(req: Request, context: RouteContext) {
  return smRouteHandler(req, async () => {
    const { id: clientId } = await context.params;
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') ?? '12');

    const { data } = await supabase
      .from('sm_generated_assets')
      .select('id, storage_url, asset_type, headline, platform, generation_prompt, created_at, sm_creative_requests!inner(client_id)')
      .eq('sm_creative_requests.client_id', clientId)
      .eq('status', 'done')
      .not('storage_url', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    return { assets: data ?? [] };
  });
}
```

---

## FEATURE 2 — CREATIVE VARIETY MEMORY IN SIGNALOPS

SignalOps reads recent creative history before generating — explicitly avoids repeating visual approaches, color moods, and compositional patterns used recently for this client.

### 2A — Fetch recent creative signatures

**File:** `src/lib/sm/signalops-engine.ts`

Add a function to extract what was recently used for a client:

```typescript
async function getRecentCreativeSignatures(clientId: string): Promise<string> {
  const { data } = await supabase
    .from('sm_generated_assets')
    .select('generation_prompt, headline, asset_type, platform')
    .eq('status', 'done')
    .order('created_at', { ascending: false })
    .limit(5);

  // Also get recent signalops outputs for this client
  const { data: signalopsData } = await supabase
    .from('sm_signalops_outputs')
    .select('visual_approach, color_recommendation, theme')
    .order('created_at', { ascending: false })
    .limit(5);

  if (!signalopsData?.length) return '';

  const modes = [...new Set(signalopsData.map((s: any) => s.visual_approach?.mode).filter(Boolean))];
  const colors = signalopsData.map((s: any) => s.color_recommendation).filter(Boolean).slice(0, 3);
  const themes = signalopsData.map((s: any) => s.theme).filter(Boolean).slice(0, 3);

  return `
RECENT CREATIVE HISTORY FOR THIS CLIENT (do NOT repeat these):
Visual approach modes used recently: ${modes.join(', ')}
Color palettes used recently: ${colors.join(' | ')}
Campaign themes used recently: ${themes.join(' | ')}

Your output MUST use a DIFFERENT visual approach mode from the ones listed above.
Your color direction MUST feel distinct from the recent palettes.
Your theme MUST offer a fresh angle — not a variation of recent themes.
If all 5 modes have been used recently, pick the one least recently used.`;
}
```

### 2B — Inject into SignalOps user prompt

```typescript
// In runSignalOpsEngine:
const recentHistory = await getRecentCreativeSignatures(client.id);

// Add to userPrompt, after brief context:
const userPrompt = `
BRAND DNA:
${brandContext}

TODAY'S BRIEF:
${briefContext}

${recentHistory}

${beMenu}

Generate a complete SignalOps creative direction:
...
`;
```

### 2C — Log visual approach after generation

After SignalOps runs successfully, log the visual approach mode used so future runs can avoid it:

```typescript
// Store the approach mode on the generated asset for variety tracking
// The sm_signalops_outputs already stores visual_approach — no extra table needed
// Just ensure it's always saved with the full visual_approach JSON
```

---

## FEATURE 3 — QUALITY GATE

If the LIONS overall score is below 6.5, block generation and show a quality prompt. The user must either regenerate the strategy or explicitly override.

**File:** `src/components/sm/SignalOpsInsightsCard.tsx`

Add quality gate logic before the "Generate Creatives" button:

```tsx
const lionsScore = output.lions_score?.overall ?? 0;
const isBelowQuality = lionsScore > 0 && lionsScore < 6.5;
const [qualityOverride, setQualityOverride] = useState(false);

{/* Quality gate — shown when score is below threshold */}
{isBelowQuality && !qualityOverride && (
  <div className="border border-amber-500/30 bg-amber-500/5 rounded-xl p-4 flex flex-col gap-3">
    <div className="flex items-start gap-3">
      <span className="text-amber-400 text-lg">⚠</span>
      <div>
        <p className="text-amber-300 text-sm font-medium">
          This creative direction scored {lionsScore}/10
        </p>
        <p className="text-zinc-400 text-xs mt-1">
          {output.lions_score?.improvement_note ?? 'The insight or visual concept could be stronger.'}
        </p>
      </div>
    </div>
    <div className="flex gap-2">
      <button
        type="button"
        onClick={async () => {
          // Re-run SignalOps for a stronger direction
          setLoading(true);
          const res = await fetch(`/api/sm/creative-requests/${output.request_id}/signalops`, { method: 'POST' });
          const newOutput = await res.json();
          // Update parent with new output
          onRedo?.(newOutput);
          setLoading(false);
        }}
        disabled={loading}
        className="flex-1 bg-amber-600/20 border border-amber-500/40 text-amber-300 rounded px-3 py-2 text-sm hover:bg-amber-600/30"
      >
        ↻ Strengthen the strategy
      </button>
      <button
        type="button"
        onClick={() => setQualityOverride(true)}
        className="text-zinc-500 text-xs hover:text-zinc-400 px-3"
      >
        Use anyway
      </button>
    </div>
  </div>
)}

{/* Generate button — only shown when quality is acceptable or override */}
{(!isBelowQuality || qualityOverride) && (
  <button
    onClick={async () => { ... }}
    disabled={loading}
    className="flex-1 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded px-4 py-2 text-sm font-medium"
  >
    {loading ? 'Generating creatives...' : '✦ Generate Creatives →'}
  </button>
)}
```

Also add `onRedo` prop to `SignalOpsInsightsCard` and handle it in `page.tsx`:
```tsx
onRedo={(newOutput) => setSignalOpsOutput(newOutput)}
```

---

## FEATURE 4 — CREATIVE DIRECTOR VOICE ON STRATEGY SCREEN

The strategy screen currently shows data cards. Rewrite the header section to read like a creative director presenting their thinking.

**File:** `src/components/sm/SignalOpsInsightsCard.tsx`

Replace the current plain header with a directorial voice introduction:

```tsx
{/* Creative Director Voice — replaces the plain header */}
<div className="border-b border-zinc-800 pb-5 mb-5">
  <div className="flex items-center gap-2 mb-3">
    <span className="text-xs text-violet-400 bg-violet-500/10 border border-violet-500/30 rounded-full px-3 py-1">
      ✦ SignalOps Creative Direction
    </span>
    {output.lions_score?.overall >= 8 && (
      <span className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-full px-2.5 py-1">
        Strong brief — {output.lions_score.overall}/10
      </span>
    )}
  </div>

  {/* The insight bridge as the opening statement — this is the creative director speaking */}
  <div className="space-y-2">
    <p className="text-zinc-500 text-xs uppercase tracking-wider">What we found</p>
    <p className="text-white text-base leading-relaxed">
      {output.insight_bridge?.creative_tension
        ? `"${output.insight_bridge.creative_tension}"`
        : output.theme}
    </p>
    {output.insight_bridge?.creative_tension && (
      <p className="text-zinc-400 text-sm">
        {output.insight_bridge.human_truth} — and {output.insight_bridge.brand_truth.toLowerCase()}.
        That gap is where this brief lives.
      </p>
    )}
  </div>
</div>
```

This means the first thing the account manager reads isn't "Campaign Theme" — it's the creative tension stated in plain language, as if a creative director just walked into the room and said it.

---

## COMMIT SEQUENCE

```
feat(gallery): client creative gallery on brand step — visual variety at a glance
feat(gallery/api): GET /clients/[id]/gallery — recent creatives with storage URLs
feat(signalops): inject recent creative history — prevent visual approach repetition
feat(signalops): log and track visual approach modes per client for variety
feat(quality): LIONS quality gate — block generation below 6.5, offer regen or override
feat(strategy): creative director voice — insight bridge as opening statement
feat(strategy): quality score badge on strategy header
```
