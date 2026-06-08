# SM — Campaign Form Memory
## Cursor Brief

Pre-fill the campaign brief form with data from the client's most recent campaign. User only types what's changed. Also pre-fills from brand profile when no prior campaign exists.

---

## STEP 1 — FETCH LAST CAMPAIGN API

**File:** `src/app/api/sm/clients/[id]/last-campaign/route.ts` (new)

```typescript
import { smRouteHandler } from '@/lib/sm/api-auth';
import { supabase } from '@/lib/supabase';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: RouteContext) {
  return smRouteHandler(_req, async () => {
    const { id: clientId } = await context.params;

    const { data } = await supabase
      .from('sm_campaigns')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return data ?? null;
  });
}
```

---

## STEP 2 — PRE-FILL CAMPAIGN FORM

**File:** `src/components/sm/CampaignBriefForm.tsx`

On mount (when `client` prop is set), fetch the last campaign and pre-fill:

```tsx
import { useEffect } from 'react';
import type { SMCampaign, SMClient } from '@/types/sm';

// Add to existing state declarations:
const [loading, setLoading] = useState(false);
const [lastCampaignLoaded, setLastCampaignLoaded] = useState(false);

useEffect(() => {
  if (!client.id || lastCampaignLoaded) return;

  async function prefill() {
    try {
      const res = await fetch(`/api/sm/clients/${client.id}/last-campaign`);
      if (!res.ok) return;
      const last = await res.json() as SMCampaign | null;

      if (last) {
        // Pre-fill from last campaign
        if (!name) setName(last.name);
        if (last.objective) setObjective(last.objective);
        if (last.duration_days) setDuration(last.duration_days);
        if (last.product_service && !productService) setProductService(last.product_service);
        if (last.key_message && !keyMessage) setKeyMessage(last.key_message);
        if (last.offer) setOffer(last.offer);
        if (last.platforms?.length) setPlatforms(last.platforms);
        if (last.additional_notes) setNotes(last.additional_notes);
      } else {
        // No prior campaign — pre-fill from brand profile
        if (client.social_handles) {
          const activePlatforms = Object.keys(client.social_handles).filter(
            p => client.social_handles[p as SMPlatform]
          ) as SMPlatform[];
          if (activePlatforms.length > 0) setPlatforms(activePlatforms);
        }
        if (client.usp && !keyMessage) setKeyMessage(client.usp);
      }
    } catch {
      // silently fail — form still works empty
    } finally {
      setLastCampaignLoaded(true);
    }
  }

  void prefill();
}, [client.id, lastCampaignLoaded]);
```

---

## STEP 3 — CLEAR NAME ON LOAD (so user must rename)

The campaign name should NOT be pre-filled — the user should always give the new campaign its own name. Pre-fill everything else, leave name blank:

```tsx
// In the prefill logic above, comment out the name pre-fill:
// if (!name) setName(last.name);  ← REMOVE THIS LINE

// The name field should show a helpful placeholder instead:
<input
  value={name}
  onChange={e => setName(e.target.value)}
  placeholder={`e.g. ${last?.name ? `${client.name} – New Campaign` : 'Summer Sale 2026'}`}
  required
  className="..."
/>
```

---

## STEP 4 — SHOW "RESTORED FROM LAST CAMPAIGN" INDICATOR

When fields are pre-filled, show a subtle notice so the user knows:

```tsx
{lastCampaignLoaded && (
  <p className="text-xs text-zinc-600 flex items-center gap-1.5">
    <span>↺</span>
    Pre-filled from your last campaign — edit anything that's changed
  </p>
)}
```

---

## WHAT THIS MEANS IN PRACTICE

For Himalaya:
- Campaign name: blank (must type new one)
- Objective: Brand awareness ← restored
- Duration: 1 week ← restored  
- Product / Service: "Himalaya baby care" ← restored ✓
- Key Message: "To show the strength of the mother" ← restored ✓
- Offer: blank ← restored
- Platforms: Instagram ← restored ✓
- Additional Notes: "Make sure the creatives have baby pictures" ← restored ✓

User just types the campaign name and hits "Create campaign". Nothing else to fill.

---

## COMMIT

```
feat(campaign): pre-fill form from most recent campaign for this client
feat(campaign/api): GET /api/sm/clients/[id]/last-campaign
feat(campaign): fallback pre-fill from brand profile when no prior campaign
feat(campaign): show "restored from last campaign" indicator
feat(campaign): clear campaign name so user always names new campaigns
```
