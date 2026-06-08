# SM — Un-Stockable Visual DNA
## Cursor Brief

This is the most important brief in the codebase. Every other brief adds a feature. This one changes what the engine fundamentally believes about advertising.

**The problem:** SignalOps currently produces concepts that are good on paper and stock on screen. The lateral thinking finds the right analogy. The scene description illustrates it like a junior designer — a lifestyle photo that could exist in Getty Images without the brand.

**The fix:** Bake one rule into the root of SignalOps that governs ALL modes, ALL lenses, ALL formats:

> **If this scene could exist in a stock photo library without the brand, it is rejected.**

Every creative must contain ONE element that is physically impossible in the real world — but completely logical the moment you know the brand. That element IS the concept. Everything else serves it.

This is not a new mode. This is the DNA of every mode.

---

## REFERENCE — What Un-Stockable Looks Like

Study these before implementing. Each is a normal scene + one impossible element:

| Brand | Normal Scene | Impossible Element | Brand Promise Communicated |
|-------|-------------|-------------------|--------------------------|
| FedEx | Handwritten note on a table | Note arrived before the person who wrote it | So fast it beats you there |
| Lynx 24-7 | Two dogs in a park | Male dog approaching female (human subtext) | You never know when attraction strikes |
| Olay | Customs officer checking passport | He doesn't believe her age matches the photo | She looks too young for her passport |
| Ambi Pur | Street scene, two parked cars | Thief breaks into beaten-up car, ignores Lamborghini | Your car smells more desirable than a Lambo |
| Chymo vitamins | Kids playing cricket | Ball left the bat as a military jet | Supercharged energy |
| Chilli sauce | Dress shirt on flat surface | Sauce burned acid holes through the fabric | Dangerously hot |
| WWF | Aerial shot of trees | Shadows longer than the trees that cast them — trees vanishing | What's disappearing faster than you see |
| AXE | Man in bathtub, bathroom scene | AXE bottle on the floor, man relaxed — women clearly on their way | The effect is already working |

**The pattern:** One subject. One twist. Zero explanation needed.

---

## PHASE 1 — NEW OUTPUT FIELDS IN TYPES

**File:** `src/types/sm.ts`

Add to `SMVisualApproach`:

```typescript
export interface SMVisualApproach {
  mode: SMVisualApproachMode;
  rationale: string;
  obvious_ideas_rejected: string[];
  scene_description: string;
  product_visible: boolean;
  brave_score: number;
  // NEW FIELDS:
  impossible_element: string;        // The one thing in this scene that cannot physically exist — but is logically inevitable for this brand
  copy_dependency: 1 | 2 | 3 | 4 | 5; // 1 = image needs nothing, 5 = copy is essential
  image_is_the_ad: boolean;          // If true: no text overlay, logo + whisper tagline only
  product_placement: "in_scene" | "corner_stamp" | "none"; // How product appears
  unstockable_test: string;          // "A Getty Images search for [keywords] would never return this image because: [reason]"
}
```

---

## PHASE 2 — THE UN-STOCKABLE RULE IN SIGNALOPS SYSTEM PROMPT

**File:** `src/lib/sm/signalops-engine.ts`

Find the system prompt. Add this section BEFORE the existing pillars — it is the foundation everything else builds on:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THE UN-STOCKABLE RULE — APPLIES TO EVERYTHING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Before you write a single word of scene_description, answer this:
"Could this scene exist in a stock photo library without the brand?"

If YES — stop. Try again. The scene is rejected.

Every creative this engine produces must contain ONE element that is physically impossible in the real world — but completely logical the moment you know the brand promise.

This is not surrealism. This is not fantasy. The scene is otherwise completely normal, photorealistic, and believable. The impossible element is the only thing that shouldn't exist — and it shouldn't need a single word of explanation.

THE IMPOSSIBLE ELEMENT PROCESS:

Step 1: Name the brand's deepest physical promise in one sentence.
  Not the tagline. The actual thing it does to the world.
  FedEx: "It arrives before you thought possible."
  Olay: "It makes you look younger than your passport says."
  Chilli sauce: "It is as destructive as acid."

Step 2: Find the most ordinary, mundane context in which that promise would produce something impossible.
  FedEx: A note on a table. If FedEx is faster than the sender — the note arrives before the person does.
  Olay: A passport check. If you look younger than your passport — the officer doesn't believe it.
  Chilli sauce: A dress shirt. If the sauce is acid-hot — it burns through fabric.

Step 3: Describe ONLY that scene. One subject. One impossible element. Nothing else.
  No smiling people holding the product.
  No lifestyle montage.
  No "inspired by" visual metaphors.
  The impossible element physically exists in the frame.

Step 4: Pass the Un-Stockable Test.
  "A Getty Images search for [realistic keywords from this scene] would never return this image because [the impossible element doesn't exist in the real world]."
  If a stock photographer could have taken this by accident — reject it.

Step 5: Pass the No-Explanation Test.
  Show this image to someone who has never heard of the brand.
  Do they feel the brand promise in under 2 seconds without reading anything?
  If they need the headline to understand it — the concept is not there yet.
```

---

## PHASE 3 — MODE-SPECIFIC IMPOSSIBLE ELEMENT RULES

**File:** `src/lib/sm/signalops-engine.ts`

Replace the generic descriptions of each visual approach mode with these:

```
VISUAL APPROACH MODES — IMPOSSIBLE ELEMENT GUIDE:

concept_first:
The image IS the ad. No text overlay needed. The impossible element is so self-evident 
that the brand promise communicates in under 2 seconds without copy.
copy_dependency: 1
image_is_the_ad: true
Your impossible element must be embedded in a completely mundane, everyday scene.
The more ordinary the context, the more powerful the twist.
Examples: a note that arrived before its sender (FedEx), shadows of trees that no longer exist (WWF).

visual_tension:
Two elements in the frame that should never coexist — but do. The impossibility IS the tension.
copy_dependency: 1-2
image_is_the_ad: true
The tension must be immediately readable. The viewer feels something is wrong before they understand why.
Examples: a thief choosing the cheaper car over the Lamborghini, a male dog approaching a female in a park (with the human subtext fully visible).

product_transformed:
The product itself becomes something else entirely — not shown as itself, but as what it does.
copy_dependency: 2-3
The product is physically present but unrecognisable as a product. It has become its own promise.
Examples: a chilli sauce bottle that has burned a hole in everything near it, an AXE bottle on the bathroom floor of a man clearly not alone for long.

effects_visible:
The effect of the product is shown as a physical, impossible change to an ordinary object or person.
copy_dependency: 2
The effect must be exaggerated to the point of impossibility — but remain photorealistic.
Examples: chilli sauce burning acid holes through a dress shirt, vitamins turning a cricket ball into a jet.

product_hero:
The product is the subject — but it must be framed in a context that is un-stockable.
copy_dependency: 3-4
The product cannot simply be photographed. It must be placed in a scene that makes its power obvious without words.
Use only when the product's design or form is itself the concept.
```

---

## PHASE 4 — UPDATE THE JSON OUTPUT SCHEMA

**File:** `src/lib/sm/signalops-engine.ts`

In the user prompt where JSON output is requested, update the `visual_approach` block:

```json
"visual_approach": {
  "mode": "concept_first | visual_tension | product_transformed | effects_visible | product_hero",
  "rationale": "Why this mode serves the impossible element",
  "obvious_ideas_rejected": ["Idea rejected — reason", "Idea rejected — reason"],
  "impossible_element": "The ONE thing in this scene that cannot physically exist — stated as a single sentence",
  "scene_description": "Complete physical description of the scene including the impossible element. Write as a director's shot note: camera position, subject, light, the impossible element exactly placed. NO lifestyle language. NO 'inspired by'. The impossible element physically exists in the frame.",
  "copy_dependency": 1,
  "image_is_the_ad": true,
  "product_placement": "in_scene | corner_stamp | none",
  "product_visible": false,
  "brave_score": 9,
  "unstockable_test": "A Getty Images search for [realistic scene keywords] would never return this image because [the impossible element]."
}
```

Also update `scene_description` instruction:

```
"scene_description": "Build this from impossible_element. Do NOT write a lifestyle description. 
Write exactly what is physically present in the frame, including the impossible element as a real object.
Format: [Camera angle and distance]. [Subject and their exact position]. [The impossible element, exactly described]. [Light source and quality]. [What is NOT in the frame — no product unless product_placement is in_scene, no text on surfaces, no brand logos in the scene itself]."
```

---

## PHASE 5 — COPY DEPENDENCY DRIVES RENDERING

**File:** `src/components/sm/AssetCard.tsx` (or wherever the creative is rendered)

The `copy_dependency` score and `image_is_the_ad` flag must control what gets overlaid on the image:

```typescript
// In the creative rendering logic:

const isConceptAd = signalops?.visual_approach?.image_is_the_ad === true;
const copyDependency = signalops?.visual_approach?.copy_dependency ?? 3;

// CONCEPT ADS (copy_dependency 1-2, image_is_the_ad: true)
// → No brand band. No headline overlay. No gradient strip.
// → Logo bottom-right, small (max 80px wide)
// → Optional: one-line tagline in clean 13px type, bottom-right above logo
// → Product: corner stamp only if product_placement === "corner_stamp"

// BALANCED ADS (copy_dependency 3)  
// → Minimal gradient overlay at bottom
// → Headline rendered at 70% of current size
// → Logo bottom-right
// → Body copy hidden by default

// COPY-LED ADS (copy_dependency 4-5)
// → Current behaviour preserved
// → Full headline overlay, brand band, layout template applied
```

Implement as a conditional rendering branch in AssetCard, switching between three layout modes based on `copy_dependency`.

---

## PHASE 6 — FLUX PROMPT MUST DESCRIBE THE IMPOSSIBLE ELEMENT

**File:** `src/lib/sm/flux-prompt-builder.ts` (or wherever FLUX prompts are assembled)

The FLUX prompt must be built FROM the `impossible_element` and `scene_description` — not from the headline or theme.

```typescript
// BEFORE (current approach — builds from theme/visual direction):
const prompt = `${visualDirection}. ${colorRecommendation}. Commercial photography style...`

// AFTER (builds from the impossible element):
function buildFluxPrompt(signalops: SMSignalOpsOutput, client: SMClient): string {
  const { visual_approach } = signalops;
  
  // The impossible element is the hero of the prompt
  const conceptCore = visual_approach.impossible_element 
    ? `${visual_approach.scene_description}` 
    : visual_approach.scene_description;

  // Composition guide based on copy_dependency
  const compositionGuide = visual_approach.copy_dependency <= 2
    ? "Subject fills 80% of frame. No space reserved for text — the image needs none."
    : visual_approach.copy_dependency <= 3
    ? "Subject fills upper 65% of frame. Lower 30% naturally dark or blurred — space for minimal text."
    : "Subject in upper-left two-thirds. Right side or bottom third open with soft background — space for headline.";

  // Product in scene
  const productNote = visual_approach.product_placement === "in_scene" && client.logo_url
    ? `${client.name} product appears naturally in the scene as described above.`
    : "No product packaging in frame.";

  return [
    conceptCore,
    compositionGuide,
    productNote,
    "Commercial photography. 50mm lens equivalent. Natural or single-source studio light.",
    "No text on any surface. No numbers. No words. No dates. No signage with readable text.",
    "No stock photo clichés: no hands holding product, no smiling people looking at camera, no white seamless background.",
    "Photorealistic. Shot on medium format film.",
    `Colour palette: ${signalops.color_recommendation}.`,
  ].filter(Boolean).join(" ");
}
```

---

## PHASE 7 — ANTI-STOCKPHOTO GATE IN SIGNALOPS OUTPUT VALIDATION

**File:** `src/lib/sm/signalops-engine.ts`

After parsing the SignalOps JSON output, add a validation check:

```typescript
function validateUnstockable(output: SMSignalOpsOutput): boolean {
  const { visual_approach } = output;
  
  // Must have an impossible element defined
  if (!visual_approach.impossible_element?.trim()) return false;
  
  // Must have passed the unstockable test
  if (!visual_approach.unstockable_test?.trim()) return false;
  
  // brave_score must be 7+ for concept_first and visual_tension modes
  if (
    ["concept_first", "visual_tension"].includes(visual_approach.mode) &&
    visual_approach.brave_score < 7
  ) return false;
  
  return true;
}

// In the main SignalOps generation function, after parsing:
if (!validateUnstockable(signalopsOutput)) {
  console.warn("[SignalOps] Output failed un-stockable validation — proceeding with warning");
  // Don't block — log and surface in dev, proceed in prod
  // Future: retry with stronger prompt injection
}
```

---

## WHAT THIS PRODUCES

**BEFORE (current SignalOps output for Himalaya Baby):**
```
scene_description: "A mother in a white sari sits cross-legged on a wooden floor, 
cradling her newborn. Warm morning light from a window. Himalaya logo bottom right."
impossible_element: [none]
brave_score: 5
copy_dependency: [undefined — defaults to full overlay]
```

**AFTER (un-stockable SignalOps output for Himalaya Baby):**
```
impossible_element: "The baby's fingers, impossibly small, are wrapped around 
the mother's thumb — but the thumb has the same fingerprint as the baby's fingers. 
Nature already marked them as the same."
scene_description: "Extreme close-up. A newborn's hand gripping an adult thumb. 
Shot at 5cm, macro lens, shallow depth of field. The fingerprint on the thumb and 
the fingerprint on the baby's finger are visibly identical — a physical impossibility. 
Warm amber light from the left. Nothing else in frame. No face. No product. No text."
copy_dependency: 1
image_is_the_ad: true
product_placement: "corner_stamp"
brave_score: 9
unstockable_test: "A Getty search for 'mother baby hands close-up' returns thousands 
of results. None of them have matching fingerprints. This image cannot exist 
without the brand idea."
```

---

## COMMIT

```
feat(signalops): add Un-Stockable Rule as root-level visual DNA for all modes
feat(signalops/types): add impossible_element, copy_dependency, image_is_the_ad, product_placement, unstockable_test to SMVisualApproach
feat(signalops/prompt): mode-specific impossible element rules for all 5 visual approach modes
feat(signalops/render): copy_dependency score drives overlay intensity (1-2: logo only, 3: minimal, 4-5: full)
feat(flux): build FLUX prompt from impossible_element + scene_description, not from theme/visual_direction
feat(signalops): anti-stock-photo gate validates impossible_element presence before accepting output
refactor(signalops): remove lifestyle language from all scene_description instructions
```

---

## NOTE FOR CURSOR

The single most important instruction in this brief:

**The scene_description is a director's shot note, not a mood board caption.**

It describes what physically exists in the frame. Not what it "feels like." Not what it "evokes." What is literally there — including the one thing that shouldn't be.

If the scene_description contains the words "inspired by", "evoking", "reminiscent of", "feeling of" — it has failed. Rewrite it.
