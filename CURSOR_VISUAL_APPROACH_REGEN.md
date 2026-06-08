# SM — Visual Approach: Mode Regen + Custom Creative Angle
## Cursor Brief

When user selects a non-recommended visual approach mode, regenerate the scene description for that mode. Also add a free-text field for users to write their own creative direction.

---

## FEATURE 1 — MODE-SPECIFIC SCENE REGENERATION

### 1A — New API endpoint

**File:** `src/app/api/sm/creative-requests/[id]/visual-approach/route.ts` (new file)

```typescript
import { NextResponse } from 'next/server';
import { smRouteHandler } from '@/lib/sm/api-auth';
import { getClient, getCreativeRequest, getSignalOpsOutput } from '@/lib/sm/store';
import { callAI } from '@/lib/ai';
import type { SMVisualApproachMode } from '@/types/sm';

export const runtime = 'nodejs';
export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: Request, context: RouteContext) {
  return smRouteHandler(req, async () => {
    const { id: requestId } = await context.params;
    const body = await req.json();
    const mode = body.mode as SMVisualApproachMode;
    const signalopsId = body.signalops_id as string;

    const [request, signalops] = await Promise.all([
      getCreativeRequest(requestId),
      getSignalOpsOutput(requestId),
    ]);

    if (!request || !signalops) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const client = await getClient(request.client_id);
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

    const modeDescriptions: Record<SMVisualApproachMode, string> = {
      concept_first: 'No product. A metaphorical scene proves the brand truth. Product completely absent. The viewer earns the brand connection themselves.',
      product_transformed: 'Product appears but impossibly reimagined — in an unexpected, conceptual, or surrealist way.',
      product_hero: 'Product is the dramatic primary subject. Environment serves the product. High-end commercial photography.',
      effects_visible: 'Product completely absent. Show its emotional or physical effect on a person or the world.',
      visual_tension: 'Two incompatible or contradictory things forced together. Creates cognitive dissonance resolved by the brand. No product needed.',
    };

    const prompt = `You are a senior art director generating a scene description for a specific visual execution mode.

BRAND: ${client.name}
BRAND TONE: ${client.tone ?? 'professional'}
CAMPAIGN THEME: ${signalops.theme}
CREATIVE TENSION: ${signalops.insight_bridge?.creative_tension ?? ''}

CHOSEN VISUAL MODE: ${mode.replace('_', ' ').toUpperCase()}
MODE DESCRIPTION: ${modeDescriptions[mode]}

MANDATORY CONSTRAINTS:
${request.must_exclude ? `- FORBIDDEN: ${request.must_exclude}` : '- No hands as primary subject'}
${request.must_include ? `- MUST INCLUDE: ${request.must_include}` : ''}
- Absolutely no text, numbers, logos, or watermarks in the image
- ONE primary subject only (maximum economy rule)

Generate a single, specific, FLUX-renderable scene description for this mode.
The description must:
- Name the exact primary subject (one noun)
- Describe its position, lighting, and background
- Be specific enough to brief a photographer
- Reject any scene featuring hands as the primary subject

Return ONLY the scene description as plain text. No explanation. No preamble.`;

    const scene_description = await callAI({
      system: 'You are a visual art director. Return only the scene description, nothing else.',
      user: prompt,
      maxTokens: 400,
      temperature: 0.8,
    });

    return { scene_description: scene_description.trim(), mode };
  });
}
```

### 1B — Update SignalOpsInsightsCard to call regen on mode change

**File:** `src/components/sm/SignalOpsInsightsCard.tsx`

Add state for the generated scene per selected mode:

```tsx
const [selectedMode, setSelectedMode] = useState<SMVisualApproachMode>(
  output.visual_approach?.mode ?? 'concept_first'
);
const [modeSceneDescription, setModeSceneDescription] = useState<string>(
  output.visual_approach?.scene_description ?? ''
);
const [regeneratingScene, setRegeneratingScene] = useState(false);
const [customAngle, setCustomAngle] = useState('');

async function handleModeChange(mode: SMVisualApproachMode) {
  setSelectedMode(mode);
  
  // If selecting the recommended mode, use original scene
  if (mode === output.visual_approach?.mode) {
    setModeSceneDescription(output.visual_approach.scene_description);
    return;
  }

  // Otherwise regenerate scene for the selected mode
  setRegeneratingScene(true);
  try {
    const res = await fetch(`/api/sm/creative-requests/${output.request_id}/visual-approach`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, signalops_id: output.id }),
    });
    const data = await res.json();
    if (res.ok && data.scene_description) {
      setModeSceneDescription(data.scene_description);
    }
  } catch (e) {
    console.error('Scene regen failed:', e);
  } finally {
    setRegeneratingScene(false);
  }
}
```

Update the mode selector buttons to call `handleModeChange`:

```tsx
{APPROACH_LABELS && Object.entries(APPROACH_LABELS).map(([mode, info]) => (
  <button
    key={mode}
    type="button"
    onClick={() => void handleModeChange(mode as SMVisualApproachMode)}
    disabled={regeneratingScene}
    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-all disabled:opacity-50 ${
      selectedMode === mode
        ? 'border-violet-500 bg-violet-500/10 text-violet-300'
        : 'border-zinc-700 text-zinc-500 hover:border-zinc-500'
    }`}
  >
    <span>{info.emoji}</span>
    <span>{info.label}</span>
    {mode === output.visual_approach?.mode && (
      <span className="text-[9px] text-zinc-600 uppercase tracking-wide ml-1">rec</span>
    )}
  </button>
))}
```

Show the scene description for the selected mode:

```tsx
{/* Scene description — updates when mode changes */}
<div className="border border-zinc-800 rounded-lg p-3 mt-3">
  <p className="text-xs text-zinc-500 mb-1.5">
    Scene to generate
    {regeneratingScene && <span className="ml-2 text-violet-400">regenerating...</span>}
  </p>
  {regeneratingScene ? (
    <div className="h-4 w-3/4 bg-zinc-800 rounded animate-pulse" />
  ) : (
    <p className="text-zinc-300 text-xs leading-relaxed font-mono">
      {modeSceneDescription || output.visual_approach?.scene_description}
    </p>
  )}
</div>
```

---

## FEATURE 2 — CUSTOM CREATIVE ANGLE

Add a free-text field below the mode selector:

```tsx
{/* Custom creative angle */}
<div className="flex flex-col gap-1.5 mt-3">
  <label className="text-xs text-zinc-500 flex items-center gap-2">
    Your creative angle
    <span className="text-zinc-700 text-xs">— optional override</span>
  </label>
  <textarea
    value={customAngle}
    onChange={e => setCustomAngle(e.target.value)}
    placeholder="e.g. An old cracked chair, standing alone in afternoon light, no people, warm shadow on wall behind it..."
    rows={3}
    className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-xs leading-relaxed resize-none placeholder:text-zinc-700 focus:border-zinc-500 focus:outline-none"
  />
  {customAngle.trim() && (
    <p className="text-xs text-amber-400">
      ✦ Your direction will be used instead of the generated scene
    </p>
  )}
</div>
```

---

## FEATURE 3 — PASS FINAL SCENE TO GENERATE

When "Approve & generate creatives" is clicked, pass the final scene:

```tsx
// The final scene description priority:
// 1. customAngle (if user wrote one)
// 2. modeSceneDescription (if mode was changed)
// 3. output.visual_approach.scene_description (original)

const finalScene = customAngle.trim()
  || modeSceneDescription
  || output.visual_approach?.scene_description
  || '';

// Pass to onApprove:
await onApprove(selectedHeadline, selectedMode, finalScene);
```

Update the `onApprove` signature and the generate API call in `page.tsx`:

```typescript
// In the generate POST body:
body: JSON.stringify({
  platforms: activeRequest!.platforms,
  asset_types: ['post'],
  headline_index: headlineIndex,
  visual_approach_override: selectedMode,
  scene_description_override: finalScene || undefined,
}),
```

In the generate route, if `scene_description_override` is present, use it instead of the stored scene:

```typescript
const sceneOverride = body.scene_description_override as string | undefined;

if (sceneOverride) {
  // Use user's custom scene or mode-regenerated scene
  prompt = buildPromptFromScene(client, sceneOverride, platform, assetType, request);
} else {
  // Use stored scene from signalops
  prompt = buildImageGenerationPrompt(client, signalops, platform, assetType, headline);
}
```

---

## VISUAL STATE SUMMARY

```
[ Concept First  REC ] [ Product Transformed ] [ Product Hero ] [ Effects Visible ]
[ Visual Tension ← selected ]

Scene to generate:
"An old wooden chair standing alone against a bare cream wall, a single crack 
running through its seat, afternoon light casting a long shadow to the right, 
no people, no objects on the chair, the crack visible but the chair intact"
← regenerated for Visual Tension mode

Your creative angle — optional override
┌────────────────────────────────────────────────────────────────┐
│ e.g. An old cracked chair, standing alone in afternoon light...│
└────────────────────────────────────────────────────────────────┘
✦ Your direction will be used instead of the generated scene

[ Approve & generate creatives ]
```

---

## COMMIT

```
feat(strategy): regenerate scene description when non-recommended mode is selected
feat(strategy/api): POST /creative-requests/[id]/visual-approach — mode-specific scene gen
feat(strategy): show live scene description that updates on mode change
feat(strategy): add custom creative angle textarea — user override for scene description
feat(generate): pass scene_description_override to image generation pipeline
```
