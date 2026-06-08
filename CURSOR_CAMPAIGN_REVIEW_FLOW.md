# SM — Campaign Visual Brief Review + Sequential Generation + Client Approval
## Cursor Brief · Full Architecture

Redesigns the campaign execution flow: all text briefs auto-generate upfront, user reviews visual brief cards and approves a selection, then sequential image generation runs only for approved posts. A shareable client approval link is generated for each campaign.

---

## ARCHITECTURE

```
Calendar Created
    ↓ (auto-triggers)
Batch Brief Generation — all posts, text only (OpenRouter, ~$0.02 each)
    ↓
Visual Brief Review Page — CSS mockup cards, approve/reject, editable
    ↓ (user clicks "Generate approved")
Sequential Image Queue — one at a time, live progress
    ↓
Generated Creatives — download, redo, publish
```

---

## PHASE 1 — AUTO-BATCH BRIEF GENERATION

When the calendar is created, immediately trigger all brief generation in the background. No waiting.

### 1A — Trigger batch brief generation after calendar creation

**File:** `src/app/api/sm/campaigns/[id]/calendar/route.ts`

After bulk-inserting calendar items, fire a background job to generate all briefs:

```typescript
// After calendar items are inserted:
await updateCampaign(id, { status: 'calendar_ready' });

// Fire brief generation for all items (non-blocking)
// Use a background fetch to avoid blocking the calendar response
void fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/sm/campaigns/${id}/briefs/batch`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
}).catch(err => console.error('[batch briefs]', err));

return { items: calendarItems, campaign_id: id };
```

### 1B — Batch brief generation route

**File:** `src/app/api/sm/campaigns/[id]/briefs/batch/route.ts`

```typescript
import { smRouteHandler } from '@/lib/sm/api-auth';
import { generateCreativeBrief } from '@/lib/sm/creative-brief-engine';
import {
  getCalendarItems,
  getClient,
  getCampaign,
  getCampaignStrategy,
  saveCreativeBrief,
  updateCampaign,
} from '@/lib/sm/store';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 min for batch

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: Request, context: RouteContext) {
  return smRouteHandler(req, async () => {
    const { id: campaignId } = await context.params;

    const [campaign, strategy, calendarItems] = await Promise.all([
      getCampaign(campaignId),
      getCampaignStrategy(campaignId),
      getCalendarItems(campaignId),
    ]);

    if (!campaign || !strategy) {
      return { error: 'Campaign or strategy not found', generated: 0 };
    }

    const client = await getClient(campaign.client_id);
    if (!client) return { error: 'Client not found', generated: 0 };

    let generated = 0;
    const errors: string[] = [];

    // Generate briefs sequentially (avoid rate limits)
    for (const item of calendarItems) {
      try {
        const brief = await generateCreativeBrief(client, campaign, strategy, item);
        await saveCreativeBrief({
          calendar_item_id: item.id,
          campaign_id: campaignId,
          post_number: item.post_number,
          ...brief,
          status: 'pending',
        });
        generated++;
      } catch (e) {
        errors.push(`Post #${item.post_number}: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }
    }

    await updateCampaign(campaignId, { status: 'calendar_ready' });

    return { generated, total: calendarItems.length, errors };
  });
}
```

---

## PHASE 2 — VISUAL BRIEF REVIEW PAGE

**File:** `src/app/campaign/[id]/review/page.tsx`

### 2A — Brief approval state

```typescript
// DB: add approved/rejected status to sm_creative_briefs
ALTER TABLE sm_creative_briefs
  ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT NULL,
  -- NULL = pending, true = approved, false = rejected
  ADD COLUMN IF NOT EXISTS client_comment TEXT;
```

Update `SMCreativeBrief` type:
```typescript
approved?: boolean | null;  // null = pending
client_comment?: string;
```

### 2B — Visual Brief Card component

**File:** `src/components/sm/VisualBriefCard.tsx`

Each card is a CSS-rendered mockup — no image generation, zero cost:

```tsx
'use client';

import { useState } from 'react';
import { getClientTypography } from '@/lib/sm/typography';
import type { SMCreativeBrief, SMClient, SMContentFormat } from '@/types/sm';

const FORMAT_COLORS: Record<SMContentFormat, string> = {
  static:      'bg-blue-500/20 text-blue-300 border-blue-500/30',
  carousel:    'bg-violet-500/20 text-violet-300 border-violet-500/30',
  reel:        'bg-green-500/20 text-green-300 border-green-500/30',
  reel_comic:  'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  meme:        'bg-pink-500/20 text-pink-300 border-pink-500/30',
  testimonial: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  offer:       'bg-red-500/20 text-red-300 border-red-500/30',
};

const APPROACH_ICONS: Record<string, string> = {
  concept_first: '💡',
  product_transformed: '✨',
  product_hero: '📸',
  effects_visible: '🌊',
  visual_tension: '⚡',
};

export default function VisualBriefCard({
  brief,
  client,
  onApprove,
  onReject,
  onEdit,
}: {
  brief: SMCreativeBrief;
  client: SMClient;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onEdit: (id: string, field: string, value: string) => void;
}) {
  const [editingHook, setEditingHook] = useState(false);
  const [editingScene, setEditingScene] = useState(false);
  const [hookValue, setHookValue] = useState(brief.hook);
  const [sceneValue, setSceneValue] = useState(brief.scene_description ?? '');
  const typo = getClientTypography(client);

  const approved = brief.approved === true;
  const rejected = brief.approved === false;
  const pending = brief.approved === null || brief.approved === undefined;

  // CSS mockup card using brand colors
  const primaryColor = client.color_palette?.primary ?? '#1a1a2e';
  const accentColor = client.color_palette?.accent ?? client.color_palette?.primary ?? '#6366f1';

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${
      approved ? 'border-green-500/50 bg-green-500/5' :
      rejected ? 'border-red-500/20 bg-red-500/5 opacity-50' :
      'border-zinc-700 bg-zinc-900/30'
    }`}>
      {/* Post number + format */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="text-zinc-500 text-xs font-mono">POST #{String(brief.post_number).padStart(2, '0')}</span>
          <span className={`text-xs border rounded-full px-2 py-0.5 ${FORMAT_COLORS[brief.format]}`}>
            {brief.format}
          </span>
          {brief.visual_approach_mode && (
            <span className="text-xs text-zinc-600">
              {APPROACH_ICONS[brief.visual_approach_mode]} {brief.visual_approach_mode.replace('_', ' ')}
            </span>
          )}
        </div>
        <span className="text-xs text-zinc-600">{brief.pillar}</span>
      </div>

      {/* CSS Visual Mockup — the "visual brief" */}
      <div
        className="relative mx-4 mt-4 rounded-lg overflow-hidden"
        style={{ paddingTop: '100%', background: primaryColor }}
      >
        <div className="absolute inset-0 flex flex-col justify-end p-4">
          {/* Gradient overlay */}
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)'
          }} />

          {/* Scene description hint (top) */}
          <div className="absolute top-3 left-3 right-12">
            <p className="text-white/50 text-xs line-clamp-2 font-mono">{sceneValue || brief.scene_description}</p>
          </div>

          {/* Visual approach badge */}
          <div className="absolute top-3 right-3">
            <span className="text-lg">{APPROACH_ICONS[brief.visual_approach_mode ?? 'concept_first']}</span>
          </div>

          {/* Color chips */}
          {client.color_palette && (
            <div className="absolute top-10 right-3 flex flex-col gap-1">
              {Object.entries(client.color_palette).filter(([,v]) => v).slice(0, 3).map(([k, v]) => (
                <div key={k} className="w-4 h-4 rounded-full border border-white/20" style={{ background: v as string }} />
              ))}
            </div>
          )}

          {/* Headline — rendered in brand font */}
          <div className="relative z-10">
            {brief.hook && (() => {
              const sentences = brief.hook.match(/[^.!?]+[.!?]+/g);
              const setup = sentences && sentences.length > 1 ? sentences.slice(0, -1).join('') : null;
              const punch = sentences && sentences.length > 1 ? sentences[sentences.length - 1] : brief.hook;
              return (
                <>
                  {setup && (
                    <p style={{ fontFamily: typo.fontFamily ?? 'inherit', fontWeight: 300, fontSize: '10px', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.01em' }}>
                      {setup}
                    </p>
                  )}
                  <p style={{ fontFamily: typo.fontFamily ?? 'inherit', fontWeight: 700, fontSize: '14px', color: 'white', lineHeight: 1.1, letterSpacing: '0.02em', textTransform: typo.textTransform }}>
                    {punch}
                  </p>
                </>
              );
            })()}

            {/* CTA */}
            {brief.cta && (
              <div className="mt-2 inline-block px-2 py-0.5 rounded text-xs text-white border border-white/40" style={{ background: accentColor + '40' }}>
                {brief.cta}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Editable hook */}
      <div className="px-4 pt-3">
        {editingHook ? (
          <textarea
            autoFocus
            value={hookValue}
            onChange={e => setHookValue(e.target.value)}
            onBlur={() => { setEditingHook(false); onEdit(brief.id, 'hook', hookValue); }}
            rows={2}
            className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-white text-xs resize-none focus:outline-none"
          />
        ) : (
          <p
            className="text-white text-sm font-medium cursor-text hover:text-zinc-300 transition-colors"
            onClick={() => setEditingHook(true)}
            title="Click to edit headline"
          >
            "{hookValue || brief.hook}"
            <span className="text-zinc-700 text-xs ml-1">✎</span>
          </p>
        )}
      </div>

      {/* Scene description (editable) */}
      <div className="px-4 pb-3 pt-1">
        {editingScene ? (
          <textarea
            autoFocus
            value={sceneValue}
            onChange={e => setSceneValue(e.target.value)}
            onBlur={() => { setEditingScene(false); onEdit(brief.id, 'scene_description', sceneValue); }}
            rows={3}
            className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-zinc-300 text-xs font-mono resize-none focus:outline-none"
          />
        ) : (
          <p
            className="text-zinc-500 text-xs font-mono leading-relaxed cursor-text hover:text-zinc-400 transition-colors line-clamp-2"
            onClick={() => setEditingScene(true)}
            title="Click to edit scene description"
          >
            {sceneValue || brief.scene_description || 'No scene description yet'}
            <span className="text-zinc-700 ml-1">✎</span>
          </p>
        )}
      </div>

      {/* Approve / Reject */}
      <div className="flex gap-2 px-4 pb-4">
        <button
          type="button"
          onClick={() => onApprove(brief.id)}
          className={`flex-1 py-1.5 rounded text-xs font-medium transition-all ${
            approved
              ? 'bg-green-600 text-white'
              : 'border border-zinc-700 text-zinc-400 hover:border-green-500 hover:text-green-400'
          }`}
        >
          {approved ? '✓ Approved' : '✓ Approve'}
        </button>
        <button
          type="button"
          onClick={() => onReject(brief.id)}
          className={`flex-1 py-1.5 rounded text-xs transition-all ${
            rejected
              ? 'border border-red-500/50 text-red-400'
              : 'border border-zinc-700 text-zinc-600 hover:border-red-500/50 hover:text-red-400'
          }`}
        >
          {rejected ? '✗ Skipped' : '✗ Skip'}
        </button>
      </div>
    </div>
  );
}
```

### 2C — Visual Brief Review Page

**File:** `src/app/campaign/[id]/review/page.tsx`

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import VisualBriefCard from '@/components/sm/VisualBriefCard';
import type { SMCreativeBrief, SMClient, SMCampaign } from '@/types/sm';

export default function CampaignReviewPage() {
  const { id: campaignId } = useParams<{ id: string }>();
  const [briefs, setBriefs] = useState<SMCreativeBrief[]>([]);
  const [client, setClient] = useState<SMClient | null>(null);
  const [campaign, setCampaign] = useState<SMCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingQueue, setGeneratingQueue] = useState<string[]>([]);
  const [currentlyGenerating, setCurrentlyGenerating] = useState<string | null>(null);
  const [generatedCount, setGeneratedCount] = useState(0);

  useEffect(() => {
    async function load() {
      const [briefsRes, campaignRes] = await Promise.all([
        fetch(`/api/sm/campaigns/${campaignId}/briefs`),
        fetch(`/api/sm/campaigns/${campaignId}`),
      ]);
      const briefsData = await briefsRes.json();
      const campaignData = await campaignRes.json();
      setBriefs(briefsData.briefs ?? []);
      setCampaign(campaignData.campaign);
      setClient(campaignData.client);
      setLoading(false);
    }
    void load();
  }, [campaignId]);

  function handleApprove(id: string) {
    setBriefs(prev => prev.map(b => b.id === id ? { ...b, approved: true } : b));
    void fetch(`/api/sm/briefs/${id}/approve`, { method: 'POST', body: JSON.stringify({ approved: true }) });
  }

  function handleReject(id: string) {
    setBriefs(prev => prev.map(b => b.id === id ? { ...b, approved: false } : b));
    void fetch(`/api/sm/briefs/${id}/approve`, { method: 'POST', body: JSON.stringify({ approved: false }) });
  }

  function handleEdit(id: string, field: string, value: string) {
    setBriefs(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b));
    void fetch(`/api/sm/briefs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });
  }

  // Sequential generation queue
  async function startGeneration() {
    const approved = briefs.filter(b => b.approved === true && b.status !== 'done');
    const queue = approved.map(b => b.id);
    setGeneratingQueue(queue);

    for (const briefId of queue) {
      setCurrentlyGenerating(briefId);
      try {
        await fetch(`/api/sm/briefs/${briefId}/generate`, { method: 'POST' });
        setBriefs(prev => prev.map(b => b.id === briefId ? { ...b, status: 'done' } : b));
        setGeneratedCount(n => n + 1);
      } catch {
        setBriefs(prev => prev.map(b => b.id === briefId ? { ...b, status: 'pending' } : b));
      }
    }
    setCurrentlyGenerating(null);
    setGeneratingQueue([]);
  }

  const approvedCount = briefs.filter(b => b.approved === true).length;
  const totalCount = briefs.length;
  const readyCount = briefs.filter(b => b.approved !== null && b.approved !== undefined).length;
  const isGenerating = currentlyGenerating !== null;
  const estimatedCost = (approvedCount * 0.04).toFixed(2);

  if (loading) return <div className="min-h-screen bg-[#060608] flex items-center justify-center text-zinc-500">Loading briefs...</div>;

  return (
    <div className="min-h-screen bg-[#060608] px-6 py-8">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-zinc-500 text-sm">{campaign?.name}</p>
            <h1 className="text-white text-xl font-semibold mt-0.5">Review Campaign Briefs</h1>
            <p className="text-zinc-500 text-sm mt-1">
              {readyCount}/{totalCount} reviewed · {approvedCount} approved
              {approvedCount > 0 && ` · est. $${estimatedCost}`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Approve all / Clear */}
            <button
              type="button"
              onClick={() => briefs.forEach(b => handleApprove(b.id))}
              className="text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-700 rounded px-3 py-1.5"
            >
              Approve all
            </button>

            {/* Generate button */}
            <button
              type="button"
              onClick={() => void startGeneration()}
              disabled={approvedCount === 0 || isGenerating}
              className="bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white rounded-lg px-4 py-2 text-sm font-medium"
            >
              {isGenerating
                ? `Generating ${generatedCount + 1}/${approvedCount}...`
                : `Generate approved (${approvedCount})`}
            </button>
          </div>
        </div>

        {/* Live progress bar during generation */}
        {isGenerating && (
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 flex items-center gap-3">
            <div className="flex-1 bg-zinc-800 rounded-full h-1.5">
              <div
                className="bg-violet-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${(generatedCount / approvedCount) * 100}%` }}
              />
            </div>
            <span className="text-xs text-zinc-400">{generatedCount}/{approvedCount} images generated</span>
          </div>
        )}

        {/* Brief cards grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {briefs.map(brief => (
            <VisualBriefCard
              key={brief.id}
              brief={brief}
              client={client!}
              onApprove={handleApprove}
              onReject={handleReject}
              onEdit={handleEdit}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

## PHASE 3 — API: APPROVE BRIEF + BATCH BRIEFS

### 3A — Brief approval

**File:** `src/app/api/sm/briefs/[id]/approve/route.ts`

```typescript
export async function POST(req: Request, context: RouteContext) {
  return smRouteHandler(req, async () => {
    const { id } = await context.params;
    const { approved } = await req.json();
    await supabase.from('sm_creative_briefs').update({ approved }).eq('id', id);
    return { ok: true };
  });
}
```

### 3B — Patch brief (for edits)

**File:** `src/app/api/sm/briefs/[id]/route.ts` — add PATCH:

```typescript
export async function PATCH(req: Request, context: RouteContext) {
  return smRouteHandler(req, async () => {
    const { id } = await context.params;
    const body = await req.json();
    const allowed = ['hook', 'scene_description', 'cta', 'caption_direction'];
    const patch = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));
    await supabase.from('sm_creative_briefs').update(patch).eq('id', id);
    return { ok: true };
  });
}
```

### 3C — GET campaign briefs

**File:** `src/app/api/sm/campaigns/[id]/briefs/route.ts`

```typescript
export async function GET(req: Request, context: RouteContext) {
  return smRouteHandler(req, async () => {
    const { id: campaignId } = await context.params;
    const { data } = await supabase
      .from('sm_creative_briefs')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('post_number', { ascending: true });
    return { briefs: data ?? [] };
  });
}
```

---

## PHASE 4 — CLIENT APPROVAL LINK

### 4A — DB: add review token to campaigns

```sql
ALTER TABLE sm_campaigns
  ADD COLUMN IF NOT EXISTS review_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS review_enabled BOOLEAN DEFAULT FALSE;
```

Generate token when campaign is created:
```typescript
import { randomBytes } from 'crypto';
const review_token = randomBytes(16).toString('hex');
// Save with campaign
```

### 4B — Shareable review URL

**File:** `src/app/review/[token]/page.tsx`

Public page — no login required. Shows visual brief cards in read-only mode with approve/comment buttons.

```tsx
// Load campaign by token:
const { data: campaign } = await supabase
  .from('sm_campaigns')
  .select('*, sm_creative_briefs(*)')
  .eq('review_token', token)
  .eq('review_enabled', true)
  .single();

// Show read-only VisualBriefCard with:
// - approve/reject buttons (saves to DB)
// - comment textarea
// - no editing of hook/scene
```

### 4C — Enable review link button in campaign view

```tsx
{/* In campaign page header */}
<button
  onClick={async () => {
    await fetch(`/api/sm/campaigns/${id}/enable-review`, { method: 'POST' });
    const url = `${window.location.origin}/review/${campaign.review_token}`;
    navigator.clipboard.writeText(url);
    // Show toast: "Review link copied to clipboard"
  }}
  className="text-xs border border-zinc-700 rounded px-3 py-1.5 text-zinc-400 hover:text-white"
>
  🔗 Share for client approval
</button>
```

---

## CALENDAR CHANGES

Update the campaign calendar page to:
1. Show brief generation progress (loading state while batch runs)
2. Replace "View briefs →" with "Review briefs →" linking to `/campaign/[id]/review`
3. Show approved/total count as a progress indicator

---

## COMMIT SEQUENCE

```
feat(campaign/briefs): auto-batch brief generation after calendar creation
feat(campaign/briefs): POST /campaigns/[id]/briefs/batch — sequential brief gen
feat(campaign/briefs): GET /campaigns/[id]/briefs — all briefs for campaign
feat(campaign/review): VisualBriefCard — CSS mockup with editable headline + scene
feat(campaign/review): review page with approve/reject, batch select, cost estimate
feat(campaign/review): sequential generation queue with live progress bar
feat(campaign/review): PATCH /briefs/[id] — edit hook and scene_description
feat(campaign/review): POST /briefs/[id]/approve — approve/reject per brief
feat(campaign/client): client approval shareable link — /review/[token]
feat(campaign/client): enable-review endpoint + review_token on campaign
```
