# SM — Visual Approach Intelligence
## Cursor Brief

SignalOps currently outputs `visual_direction` as a text description, but has no concept of WHICH creative strategy to use for the image. This adds `visual_approach` as a new SignalOps output field — the engine decides which of 5 execution modes best fits the brand + brief, outputs a rationale and a concrete scene description per mode, and the user can override before generating.

This is the layer that produces "better than human" creative — most humans default to product-hero. SignalOps should push toward concept-first or visual tension whenever the brand allows it.

---

## PHASE 1 — TYPES

**File:** `src/types/sm.ts`

```typescript
export type SMVisualApproachMode =
  | 'concept_first'        // No product. A metaphorical scene proves the truth. (Fevicol mode)
  | 'product_transformed'  // Product appears but impossibly reimagined. (Absolut mode)
  | 'product_hero'         // Product is the dramatic subject. (Food/beauty/tech mode)
  | 'effects_visible'      // Product absent. Show its effect on a person or world. (Automotive mode)
  | 'visual_tension';      // Two incompatible things forced together. (Highest creative risk)

export interface SMVisualApproach {
  mode: SMVisualApproachMode;
  rationale: string;           // Why this mode for this brand + brief
  scene_description: string;   // Concrete, FLUX-renderable description of exactly what to generate
  product_visible: boolean;    // Explicit flag: does any product appear?
  brave_score: number;         // 1-10: how much creative courage does this mode require for this brand?
}

// Add to SMSignalOpsOutput:
export interface SMSignalOpsOutput {
  // ... existing fields ...
  visual_approach: SMVisualApproach;  // ← ADD THIS
}
```

---

## PHASE 2 — DB

```sql
ALTER TABLE sm_signalops_outputs ADD COLUMN IF NOT EXISTS visual_approach JSONB DEFAULT '{}';
```

Update `mapSignalOpsOutput` in `store.ts`:
```typescript
visual_approach: (row.visual_approach as SMVisualApproach) ?? {
  mode: 'concept_first',
  rationale: '',
  scene_description: '',
  product_visible: false,
  brave_score: 5,
},
```

---

## PHASE 3 — SIGNALOPS ENGINE: ADD VISUAL APPROACH DECISION

**File:** `src/lib/sm/signalops-engine.ts`

### 3A — Add visual approach instruction to system prompt

In the system prompt, add this pillar AFTER the existing 4 pillars (Insight Bridge, BE Trigger, Cultural Resonance, Lions Score):

```
PILLAR 5 — VISUAL APPROACH (The Execution Decision)

The most important creative decision after the insight is: how should the image be constructed?
Most advertising defaults to showing the product. Most award-winning advertising does not.

You must decide which of these 5 visual execution modes is right for this brand + brief:

MODE 1 — CONCEPT FIRST (No product appears)
When to use: The brand's benefit is intangible — strength, protection, connection, freedom, change.
The visual communicates the core truth through metaphor or human scenario alone.
The product is completely absent. The viewer earns the brand connection themselves.
This is the mode that wins Grand Prix awards.
Fevicol buses, WWF cigarette animals, Amnesty barbed wire imagery.
BRAVE SCORE: 8-10. Most clients resist this mode. It is usually correct.

MODE 2 — PRODUCT TRANSFORMED (Product appears but impossibly reimagined)
When to use: The product's physical form has creative potential — it can become something else.
The product appears but in an unexpected, impossible, or conceptual way.
Absolut bottle as a city skyline. Heinz bottle as a giant tomato.
BRAVE SCORE: 6-8.

MODE 3 — PRODUCT HERO (Product is the dramatic subject)
When to use: The product's appearance IS the communication. Food, beauty, tech, automotive.
The product is shot dramatically, with the environment serving it.
Used when showing the product proves the claim.
Burger King Moldy Whopper. Apple product photography.
BRAVE SCORE: 2-5. Lowest creative risk. Often the correct choice for tangible products.

MODE 4 — EFFECTS VISIBLE (Product absent, consequences shown)
When to use: The emotional or physical effect of the brand is more powerful than the brand itself.
A coffee brand showing sharp, alive eyes at 6am. A car brand showing a genuine smile of freedom.
The product is never seen. Its impact on a human is shown instead.
BRAVE SCORE: 5-7.

MODE 5 — VISUAL TENSION (Two incompatible things forced together)
When to use: Any category. The highest creative ambition.
Something impossible or contradictory that creates cognitive dissonance, resolved through the brand.
A knife made of butter. A fire extinguisher shaped like a flame. A chess piece bonded to its square.
BRAVE SCORE: 9-10. The work that divides opinion and wins awards.

DECISION RULES:
1. DEFAULT BIAS: Always consider CONCEPT FIRST or VISUAL TENSION before defaulting to PRODUCT HERO.
   If the brand's USP is intangible (bonds, protection, freshness, energy, trust), PRODUCT HERO is usually the wrong choice.
2. If the brief involves a cultural moment, newsjacking, or an emotional occasion — CONCEPT FIRST or VISUAL TENSION.
3. Only choose PRODUCT HERO if: the product's visual is itself the proof of the claim, or the brief explicitly requires product visibility (e.g. a launch, a new variant).
4. Rate the brave_score honestly — if it's below 5, the mode is safe. Ask: would a conservative client accept this immediately? If yes, score ≤4.

Your output must include a CONCRETE scene_description: exactly what an image generation model should render, in specific physical terms. Not abstract ("show the bond"). Specific ("two pencils standing on a wooden desk, tips barely touching, warm amber light, clear chalkboard background with no writing").
```

### 3B — Add to JSON output schema in user prompt

Add to the output JSON structure in the user prompt:

```
"visual_approach": {
  "mode": "concept_first | product_transformed | product_hero | effects_visible | visual_tension",
  "rationale": "Why this mode is right for this brand and this specific brief — what about the brand's truth or the brief's goal makes this mode the correct choice",
  "scene_description": "Exactly what to generate: specific subjects, their positions, lighting direction, background details, mood, composition. Concrete enough that a director could brief a photographer from this alone. No abstract adjectives.",
  "product_visible": true or false,
  "brave_score": <1-10 integer>
}
```

---

## PHASE 4 — UPDATE FLUX PROMPT BUILDER

**File:** `src/lib/sm/asset-generator.ts`

Replace `buildImageGenerationPrompt` with a version that uses `visual_approach`:

```typescript
import type { SMClient, SMSignalOpsOutput, SMPlatform, SMAssetType } from '@/types/sm';

// Mode-specific FLUX instructions
const VISUAL_APPROACH_INSTRUCTIONS: Record<string, string> = {
  concept_first: [
    'absolutely no product visible in the image',
    'no product packaging or containers',
    'the brand is communicated entirely through the scene and metaphor',
    'the image should make sense as a standalone scene',
    'no brand marks or logos rendered in the image',
  ].join(', '),

  product_transformed: [
    'the product appears but in a conceptual, impossible, or unexpected way',
    'the product is reimagined as something else or placed in an impossible context',
    'high-end surrealist commercial photography',
    'the transformation should feel both surprising and inevitable',
  ].join(', '),

  product_hero: [
    'the product is the primary subject of the image',
    'dramatic product photography, the environment serves the product',
    'high-end commercial photography quality',
    'the product occupies at least 40% of the frame',
    'beautiful lighting that makes the product look premium',
  ].join(', '),

  effects_visible: [
    'absolutely no product visible',
    'show the human emotional or physical effect of using the brand',
    'the scene shows a person or environment transformed by the brand\'s benefit',
    'authentic, unposed, emotionally true',
    'the viewer should feel the benefit before they understand the brand',
  ].join(', '),

  visual_tension: [
    'create a visual that combines two contradictory or incompatible elements',
    'the impossibility or contradiction should be immediately visible',
    'no product unless it is part of the tension',
    'clean, minimal composition — the tension is the entire point',
    'the image should stop a viewer and demand a second look',
  ].join(', '),
};

const UNIVERSAL_EXCLUSIONS = [
  'absolutely no text of any kind',
  'no numbers',
  'no digits',
  'no dates or years',
  'no words written on any surface',
  'no chalkboard writing',
  'no signs with text',
  'no labels with text',
  'no watermarks',
].join(', ');

export function buildImageGenerationPrompt(
  client: SMClient,
  signalops: SMSignalOpsOutput,
  platform: SMPlatform,
  assetType: SMAssetType,
  headline: string
): string {
  const approach = signalops.visual_approach;
  const modeInstructions = VISUAL_APPROACH_INSTRUCTIONS[approach?.mode ?? 'concept_first'];

  // Composition guidance per format
  const compositionNote =
    assetType === 'story' || assetType === 'reel_cover'
      ? 'vertical portrait composition, subject centered'
      : platform === 'linkedin'
      ? 'wide landscape composition, professional setting'
      : 'bold central subject, clear negative space at bottom third';

  // Build prompt from scene description (most important) + mode instructions + quality
  const parts = [
    // The scene description from SignalOps is the primary driver
    approach?.scene_description || signalops.visual_direction,

    // Color and mood
    signalops.color_recommendation,

    // Composition
    compositionNote,

    // Mode-specific instructions (how to handle product visibility)
    modeInstructions,

    // Quality
    'ultra high quality commercial photography',
    'sharp focus',
    'professional studio or location lighting',
    '8k resolution',
    'premium advertising aesthetic',

    // Universal text exclusions — always applied
    UNIVERSAL_EXCLUSIONS,
  ].filter(Boolean).join(', ');

  return parts.replace(/\s+/g, ' ').trim().slice(0, 3800);
}
```

---

## PHASE 5 — UI: SHOW VISUAL APPROACH ON STRATEGY SCREEN

**File:** `src/components/sm/SignalOpsInsightsCard.tsx`

Add a Visual Approach section after the Insight Bridge, with a mode selector that lets the user override:

```tsx
import type { SMVisualApproachMode } from '@/types/sm';

const APPROACH_LABELS: Record<SMVisualApproachMode, { label: string; emoji: string; description: string }> = {
  concept_first:       { label: 'Concept First',       emoji: '💡', description: 'No product. Pure idea.' },
  product_transformed: { label: 'Product Transformed', emoji: '✨', description: 'Product reimagined.' },
  product_hero:        { label: 'Product Hero',        emoji: '📸', description: 'Product as subject.' },
  effects_visible:     { label: 'Effects Visible',     emoji: '🌊', description: 'Show the impact.' },
  visual_tension:      { label: 'Visual Tension',      emoji: '⚡', description: 'Contradiction as idea.' },
};

// In the component, add a state for overriding:
const [selectedMode, setSelectedMode] = useState<SMVisualApproachMode>(
  output.visual_approach?.mode ?? 'concept_first'
);

// Visual Approach section (add between Insight Bridge and Visual Direction):
{output.visual_approach && (
  <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4">
    <div className="flex items-center gap-2 mb-3">
      <p className="text-xs text-zinc-500 uppercase tracking-wider">Visual Approach</p>
      <span className={`text-xs rounded-full px-2 py-0.5 ${
        output.visual_approach.brave_score >= 8
          ? 'bg-red-500/10 text-red-400 border border-red-500/20'
          : output.visual_approach.brave_score >= 6
          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
          : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
      }`}>
        Brave score: {output.visual_approach.brave_score}/10
      </span>
    </div>

    {/* Mode selector */}
    <div className="flex flex-wrap gap-2 mb-3">
      {(Object.keys(APPROACH_LABELS) as SMVisualApproachMode[]).map(mode => (
        <button
          key={mode}
          type="button"
          onClick={() => setSelectedMode(mode)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-all ${
            selectedMode === mode
              ? 'border-violet-500 bg-violet-500/10 text-violet-300'
              : 'border-zinc-700 text-zinc-500 hover:border-zinc-500'
          }`}
        >
          <span>{APPROACH_LABELS[mode].emoji}</span>
          <span>{APPROACH_LABELS[mode].label}</span>
        </button>
      ))}
    </div>

    {/* Rationale for selected mode */}
    <p className="text-zinc-400 text-xs leading-relaxed mb-2">
      <span className="text-zinc-500">Why this approach: </span>
      {selectedMode === output.visual_approach.mode
        ? output.visual_approach.rationale
        : `Override: ${APPROACH_LABELS[selectedMode].description} — regenerate strategy to get a new scene description for this mode.`}
    </p>

    {/* Scene description */}
    {selectedMode === output.visual_approach.mode && output.visual_approach.scene_description && (
      <div className="border-t border-zinc-800 pt-2 mt-1">
        <p className="text-xs text-zinc-500 mb-1">Scene to generate:</p>
        <p className="text-zinc-300 text-xs leading-relaxed font-mono">
          {output.visual_approach.scene_description}
        </p>
      </div>
    )}
  </div>
)}
```

### Pass selected mode to Generate

The `selectedMode` override needs to reach the generate call. Pass it through `onApprove`:

```tsx
// Update onApprove signature:
onApprove: (headlineIndex: number, visualApproachOverride?: SMVisualApproachMode) => Promise<void>;

// In the generate button:
onClick={async () => {
  setLoading(true);
  await onApprove(
    selectedHeadline,
    selectedMode !== output.visual_approach?.mode ? selectedMode : undefined
  );
  setLoading(false);
}}
```

**In `page.tsx`**, pass the override to the generate API:

```typescript
body: JSON.stringify({
  platforms: activeRequest!.platforms,
  asset_types: ['post'],
  headline_index: headlineIndex,
  visual_approach_override: visualApproachOverride,  // ← ADD
}),
```

**In the generate route**, if `visual_approach_override` is present, modify the signalops output before using it:

```typescript
const body = await req.json();
const visualApproachOverride = body.visual_approach_override as SMVisualApproachMode | undefined;

// If user overrode the mode, update the approach for this generation:
if (visualApproachOverride && signalops.visual_approach) {
  signalops = {
    ...signalops,
    visual_approach: {
      ...signalops.visual_approach,
      mode: visualApproachOverride,
      product_visible: ['product_hero', 'product_transformed'].includes(visualApproachOverride),
    },
  };
}
```

---

## PHASE 6 — WHAT THE OUTPUT LOOKS LIKE

**Brief:** "Fevicol post for school reopening — back to school, two best friends"

**SignalOps Visual Approach output:**
```json
{
  "mode": "concept_first",
  "rationale": "Fevicol's brand equity is built entirely on the idea of unbreakable bonds — never on the adhesive itself. Showing the product would contradict 40 years of brand building. The brief is about friendship that survives separation — an intangible bond. Concept First is the only correct choice.",
  "scene_description": "Two wooden pencils standing upright on a school desk, tips gently touching at the top, warm amber side-lighting from left, clean dark green chalkboard background completely bare with no writing, shallow depth of field focusing on the point of contact, soft shadow extending right, no product, no text anywhere",
  "product_visible": false,
  "brave_score": 8
}
```

**Brief:** "Burger King post — new spicy chicken burger launch"

**SignalOps Visual Approach output:**
```json
{
  "mode": "product_hero",
  "rationale": "A new product launch requires the product to be seen — the visual claim is the product itself. The brief is about launch, where awareness of the physical product is the communication goal. Product Hero is correct here.",
  "scene_description": "Spicy chicken burger close-up, cross-section view showing layered ingredients, dramatic underlighting in warm amber-red tones, steam rising from the chicken, dark moody background, droplets of sauce mid-fall, cinematic food photography",
  "product_visible": true,
  "brave_score": 3
}
```

**Brief:** "Burger King post — flame-grilled taste vs competitors"

**SignalOps Visual Approach output:**
```json
{
  "mode": "visual_tension",
  "rationale": "The brief's core tension is 'grilled' vs 'fried'. Visual Tension mode can express this as a single contradictory image more powerfully than any product shot. No product needed — the idea is the communication.",
  "scene_description": "A pristine white chef's kitchen where everything is normal except one dramatic flame is rising from a cold steel surface, casting sharp shadows, surrounded by the clinical order of a fast food kitchen, isolated flame, no people, no product",
  "product_visible": false,
  "brave_score": 9
}
```

---

## COMMIT SEQUENCE

```
feat(sm/types): add SMVisualApproachMode and SMVisualApproach interface
feat(sm/types): add visual_approach field to SMSignalOpsOutput
db: add visual_approach column to sm_signalops_outputs
feat(sm/signalops): add Visual Approach as Pillar 5 in SignalOps system prompt
feat(sm/signalops): add visual_approach to JSON output schema
feat(sm/prompt): rebuild buildImageGenerationPrompt to use visual_approach scene_description
feat(sm/prompt): add mode-specific FLUX instructions per visual approach
feat(sm/prompt): universal text/number exclusions applied to all generations
feat(sm/ui): show visual approach section on Strategy screen with mode selector
feat(sm/ui): allow user to override visual approach mode before generating
feat(sm/generate): apply visual_approach_override in generate route
```
