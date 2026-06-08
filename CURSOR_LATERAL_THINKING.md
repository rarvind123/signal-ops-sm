# SM — Lateral Thinking Engine: Perfect Analogy Layer
## Cursor Brief

Adds a "Find the Perfect Analogy" step to SignalOps that forces the model to search outside the category for concepts. This is the gap between the engine generating competent ideas and generating the kind of concepts a senior creative director would bring to a pitch.

The twins-for-Fevicol example: the engine currently finds "things that bond" within the adhesive category. The lateral leap is to find "nature's own unbreakable bond" (twins) — a phenomenon completely outside the category that perfectly embodies the brand truth.

---

## PHASE 1 — NEW OUTPUT FIELD: `creative_analogy`

**File:** `src/types/sm.ts`

```typescript
export interface SMCreativeAnalogy {
  brand_truth_distilled: string;    // The deepest brand truth in one sharp sentence
  analogies_considered: string[];   // 3-5 analogies explored before choosing
  chosen_analogy: string;           // The selected analogy and why it's the strongest
  analogy_domain: string;           // Where it comes from: nature, sport, science, human biology, history, art
  no_explanation_test: string;      // "A viewer who has never heard of [brand] would feel [X] when seeing [analogy]"
}

// Add to SMSignalOpsOutput:
export interface SMSignalOpsOutput {
  // ... existing fields ...
  creative_analogy: SMCreativeAnalogy;  // ← ADD
}
```

**DB:**
```sql
ALTER TABLE sm_signalops_outputs ADD COLUMN IF NOT EXISTS creative_analogy JSONB DEFAULT '{}';
```

---

## PHASE 2 — ADD TO SIGNALOPS SYSTEM PROMPT

**File:** `src/lib/sm/signalops-engine.ts`

Find the system prompt. Add this as **PILLAR 7 — THE PERFECT ANALOGY** after the existing pillars:

```
PILLAR 7 — THE PERFECT ANALOGY (The Creative Leap)

This is the most important step. Before writing scene_description, you must find the perfect analogy.

THE PROCESS:
1. Distill the brand's deepest truth into ONE sharp sentence. Not the tagline. The actual truth.
2. Search OUTSIDE the category for a real-world phenomenon, human experience, or natural fact that perfectly embodies this truth — something that would need zero explanation once seen.
3. The analogy must be:
   - From a completely different domain (nature, biology, sport, science, history, art, mathematics)
   - Immediately recognisable to the audience
   - So perfectly aligned with the brand truth that the connection is felt before it's understood
   - Never previously used for this brand (check obvious_ideas_rejected)

THE TWINS EXAMPLE:
Brand: Fevicol
Brand truth: Some bonds cannot be broken — not by force, not by time, not by design.
Analogy search:
  - Magnets? Too technical, too mechanical
  - Siamese twins? Too medical, too uncomfortable
  - Identical twins? YES — nature's own version of an unbreakable bond. Same DNA. Inseparable by design. No glue needed. No explanation needed.
Analogy domain: human biology
No-explanation test: A viewer who has never heard of Fevicol would feel "these two can never be apart" — which is exactly Fevicol's promise.

MORE EXAMPLES OF THIS THINKING:
- Himalaya baby (a mother's protective instinct) → A lioness sleeping with her cubs in golden afternoon light: ancient, fierce, gentle protection — no product needed
- A savings brand (small actions compound) → A single drop of water that has carved a canyon over centuries: patience made visible
- A coffee brand (clarity at the moment it matters) → A surgeon's steady hands at 6am under operating lights: peak alertness at highest stakes
- A gym brand (invisible transformation) → A chrysalis: the most dramatic change in the world happens in complete silence and darkness
- A data backup brand (things you can't afford to lose) → A mother's handwriting in an old recipe book: irreplaceable, irreproducible

DOMAIN GUIDE (search here, not in the category):
- NATURE: animals, weather, geology, plants, ecosystems
- HUMAN BIOLOGY: twins, heartbeat, memory, instinct, reflex, sleep
- SPORT: the moment before the whistle, the last mile, the weight training no one sees
- SCIENCE: gravity, magnetism, entropy, crystallisation, photosynthesis
- MATHEMATICS: prime numbers, fractals, infinity
- HISTORY: the handshake that ended a war, the letter that wasn't sent
- ART: the canvas before the first brushstroke, the rest in music

THE NO-EXPLANATION TEST:
Your chosen analogy must pass this: "A viewer who has never heard of [brand] would feel [exact brand emotion] when seeing [analogy]."
If they would feel something else — try again.

OUTPUT FORMAT for creative_analogy:
{
  "brand_truth_distilled": "One sentence — the actual brand truth, not the tagline",
  "analogies_considered": [
    "Analogy 1 — rejected because: [reason]",
    "Analogy 2 — rejected because: [reason]",
    "Analogy 3 — rejected because: [reason]"
  ],
  "chosen_analogy": "The selected analogy and exactly why it passes the no-explanation test",
  "analogy_domain": "nature | human_biology | sport | science | history | art | mathematics",
  "no_explanation_test": "A viewer who has never heard of [brand] would feel [X] when seeing [analogy]"
}

IMPORTANT: The scene_description MUST be built from the chosen analogy. Not from a general visual direction. The analogy IS the concept.
```

---

## PHASE 3 — ADD TO USER PROMPT JSON SCHEMA

In the user prompt where the JSON output is requested, add:

```
"creative_analogy": {
  "brand_truth_distilled": "...",
  "analogies_considered": ["...", "...", "..."],
  "chosen_analogy": "...",
  "analogy_domain": "nature | human_biology | sport | science | history | art | mathematics",
  "no_explanation_test": "..."
},
```

Also update the `scene_description` instruction to reference the analogy:

```
"scene_description": "Build this directly from your chosen analogy in creative_analogy.chosen_analogy. Do NOT default to a generic lifestyle scene. The analogy is the concept. Describe how to render it as a specific, photorealistic, composition-ready scene."
```

---

## PHASE 4 — INCREASE TEMPERATURE FOR SCENE DESCRIPTION

**File:** `src/lib/sm/signalops-engine.ts`

Find where `callSignalOpsModel` or the main AI call happens. Increase temperature:

```typescript
// BEFORE:
temperature: 0.7,

// AFTER:
temperature: 0.92,  // Higher temperature = more unexpected lateral connections
                     // 0.7 produces competent ideas. 0.92 produces surprising ones.
```

---

## PHASE 5 — DISPLAY ON STRATEGY SCREEN

**File:** `src/components/sm/SignalOpsInsightsCard.tsx`

Show the analogy thinking as the creative heart of the strategy — above the visual approach section:

```tsx
{output.creative_analogy?.chosen_analogy && (
  <div className="bg-zinc-900 border border-amber-500/20 rounded-xl p-4 mb-4">
    <div className="flex items-center gap-2 mb-3">
      <span className="text-amber-400 text-sm">💡</span>
      <p className="text-xs text-amber-400 uppercase tracking-wider font-semibold">Creative Analogy</p>
      <span className="text-xs text-zinc-600 ml-auto capitalize">{output.creative_analogy.analogy_domain}</span>
    </div>

    {/* Brand truth */}
    <p className="text-zinc-500 text-xs mb-2">{output.creative_analogy.brand_truth_distilled}</p>

    {/* The chosen analogy */}
    <p className="text-white text-sm leading-relaxed font-medium mb-3">
      {output.creative_analogy.chosen_analogy}
    </p>

    {/* No explanation test */}
    <p className="text-zinc-500 text-xs italic border-t border-zinc-800 pt-2">
      {output.creative_analogy.no_explanation_test}
    </p>

    {/* Rejected analogies — collapsed */}
    {output.creative_analogy.analogies_considered?.length > 0 && (
      <details className="mt-2">
        <summary className="text-xs text-zinc-600 cursor-pointer hover:text-zinc-500">
          ↓ Analogies considered and rejected ({output.creative_analogy.analogies_considered.length})
        </summary>
        <ul className="mt-1.5 flex flex-col gap-1">
          {output.creative_analogy.analogies_considered.map((a, i) => (
            <li key={i} className="text-xs text-zinc-600 line-through pl-2">{a}</li>
          ))}
        </ul>
      </details>
    )}
  </div>
)}
```

---

## PHASE 6 — UPDATE STORE MAPPER

**File:** `src/lib/sm/store.ts`

In `mapSignalOpsOutput`, add:
```typescript
creative_analogy: (row.creative_analogy as SMCreativeAnalogy) ?? {
  brand_truth_distilled: '',
  analogies_considered: [],
  chosen_analogy: '',
  analogy_domain: '',
  no_explanation_test: '',
},
```

---

## WHAT THIS PRODUCES

**Without lateral thinking (current):**
```
Brand: Fevicol
Scene: Two wooden chairs side by side with their legs intertwined
Brave score: 6
```

**With lateral thinking (after this brief):**
```
Brand: Fevicol
Brand truth distilled: "Some bonds are not made — they are discovered. Nature got there first."
Analogies considered:
  - Magnets: rejected — mechanical, no human warmth
  - Handshake: rejected — too transactional, chosen by humans not nature
  - River joining sea: rejected — one disappears into the other, wrong message
Chosen analogy: Identical twins — nature's own unbreakable bond. Same DNA. Cannot be told apart. Cannot be separated. No adhesive needed. The universe already made them one.
Analogy domain: human_biology
No-explanation test: A viewer who has never heard of Fevicol would feel "these two were never separate to begin with" — which is exactly the bond Fevicol creates.
Scene description: Two identical Indian men in their 60s, seated side by side at a wooden dining table, holding identical steel cups of chai, both looking slightly off-camera — the same slight smile, the same angle of the head, the same wrinkle at the eye's corner. Shot at eye level, 50mm, shallow depth of field, warm afternoon light from a window to the left. Nothing remarkable about the scene except the impossible mirroring. No product. No text on surfaces. One subject — the bond — expressed through two bodies.
Brave score: 9
```

---

## COMMIT

```
feat(signalops): add PILLAR 7 — Perfect Analogy lateral thinking layer
feat(signalops/types): add SMCreativeAnalogy interface and creative_analogy field
feat(signalops): increase temperature to 0.92 for more unexpected connections
feat(signalops/db): add creative_analogy JSONB column to sm_signalops_outputs
feat(strategy/ui): display creative analogy card on strategy screen
feat(store): update mapSignalOpsOutput for creative_analogy field
```
