# SM — SignalOps Anti-Cliché Upgrade
## Cursor Brief

The core problem: SignalOps generates the most obvious visual for every brief.
"Baby brand" → mother hands + baby feet. "Chess + Fevicol" → chess pieces. "RCB" → cricket stadium.
These are all stock photo clichés — the first image in a Google search.

The fix: add an explicit anti-cliché step inside the SignalOps scene_description generation.

---

## THE UPGRADE

**File:** `src/lib/sm/signalops-engine.ts`

### Find the user prompt where `visual_approach` is requested.

Locate the section that asks for `"visual_approach"` in the JSON output. Update the instruction for `scene_description` to include an explicit rejection step:

Replace the current `scene_description` instruction with:

```
"visual_approach": {
  "mode": "...",
  "rationale": "...",
  "obvious_ideas_rejected": [
    "The first obvious visual you thought of — describe it briefly so it's clear you rejected it",
    "The second obvious visual — the stock photo version",
    "The third obvious visual — what any junior designer would do"
  ],
  "scene_description": "The scene you WILL generate — it must not resemble any of the three rejected ideas. This is the scene that makes a creative director lean forward. Describe it in specific physical terms: what is in the frame, where, how it is lit, what it implies. Concrete, FLUX-renderable, no abstract adjectives.",
  "product_visible": true or false,
  "brave_score": 1-10
}
```

### Add this to the SYSTEM PROMPT under PILLAR 5 — VISUAL APPROACH:

Find the section on MODE 1 — CONCEPT FIRST. Add AFTER the existing mode descriptions:

```
ANTI-CLICHÉ MANDATE (applies to all modes):

Before writing the scene_description, identify the three most obvious visuals for this brief. These are:
- The stock photo version (what appears first on Getty Images for these keywords)
- The junior designer version (safe, literal, expected)
- The ad agency cliché (the trope everyone has seen before)

Then REJECT all three.

The scene_description you write must not resemble any of the rejected ideas.

Examples of obvious ideas to reject:
- Baby brand brief → hands holding baby feet, smiling baby with product, mother applying lotion → REJECT
- Chess brief → chess pieces on board, hand moving a piece → REJECT
- Coffee brand → steam rising from cup, cozy morning → REJECT
- Luxury brand → marble, gold, elegant woman → REJECT
- Fitness brand → person in gym, muscles, determination → REJECT

Instead, find the visual that:
1. Only exists because of this brand's specific truth
2. Has never been used in this category before
3. Makes sense only when you understand the brand — and makes perfect sense when you do

For Himalaya baby: Grandmother's weathered hand and a newborn's hand touching — 90 years of trust made visible without showing any product.
For a coffee brand: A single lit lamp in a dark house at 5am — someone awake before the world, no coffee in frame.
For a fitness brand: The gym bag left by the door — the choice made, before the effort.

The obvious is forgettable. The unexpected is the ad.

Document your rejection in "obvious_ideas_rejected" — this proves you didn't take the easy path.
```

---

## UPDATE THE TYPE

**File:** `src/types/sm.ts`

Add to `SMVisualApproach`:
```typescript
export interface SMVisualApproach {
  mode: SMVisualApproachMode;
  rationale: string;
  obvious_ideas_rejected: string[];   // ← ADD
  scene_description: string;
  product_visible: boolean;
  brave_score: number;
}
```

---

## UPDATE THE DB

```sql
-- visual_approach column is already JSONB, so adding a key to the object doesn't require migration
-- The new obvious_ideas_rejected field will be stored in the existing JSONB column automatically
```

---

## SHOW REJECTED IDEAS ON STRATEGY SCREEN

**File:** `src/components/sm/SignalOpsInsightsCard.tsx`

In the Visual Approach section, after the rationale, show what was rejected (collapsed by default):

```tsx
{output.visual_approach?.obvious_ideas_rejected?.length > 0 && (
  <details className="mt-2">
    <summary className="text-xs text-zinc-600 cursor-pointer hover:text-zinc-500">
      ↓ Ideas rejected ({output.visual_approach.obvious_ideas_rejected.length})
    </summary>
    <ul className="mt-1.5 flex flex-col gap-1">
      {output.visual_approach.obvious_ideas_rejected.map((idea, i) => (
        <li key={i} className="text-xs text-zinc-600 line-through pl-2">
          {idea}
        </li>
      ))}
    </ul>
  </details>
)}
```

This is transparent — the user can see what SignalOps explicitly chose NOT to do, and understand why the chosen direction is more distinctive.

---

## ALSO UPDATE STORE MAPPER

**File:** `src/lib/sm/store.ts`

In `mapSignalOpsOutput`, update the `visual_approach` mapping:
```typescript
visual_approach: (row.visual_approach as SMVisualApproach) ?? {
  mode: 'concept_first',
  rationale: '',
  obvious_ideas_rejected: [],
  scene_description: '',
  product_visible: false,
  brave_score: 5,
},
```

---

## WHAT THIS PRODUCES

**Same brief:** Himalaya baby products, warmth, gentleness

**BEFORE (obvious):**
```
obvious_ideas_rejected: []
scene_description: "Mother's hands cupped around tiny baby feet in a heart shape, soft warm light, white background"
brave_score: 3
```

**AFTER (anti-cliché active):**
```
obvious_ideas_rejected: [
  "Mother's hands holding baby feet — the default Getty image for any baby brand",
  "Smiling baby looking up with product nearby — safe and forgettable",
  "Mother applying lotion to baby — literal product demo, no idea"
]
scene_description: "An elderly grandmother's hand with visible life-lines and a newborn's perfectly smooth hand, fingers barely touching on white cotton cloth, side light from a window, no product, no faces — just two hands at opposite ends of life, both soft. The gap between them is the space Himalaya has occupied for 90 years."
brave_score: 9
```

---

## COMMIT

```
feat(signalops): add anti-cliché mandate to system prompt — reject the obvious before generating
feat(signalops/types): add obvious_ideas_rejected field to SMVisualApproach
feat(signalops/ui): show rejected ideas on strategy screen as collapsed list
feat(signalops/store): update visual_approach mapper for new field
```
