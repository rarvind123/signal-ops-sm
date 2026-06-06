# SM — Creative Lenses: Agency Philosophy Engine
## Cursor Brief

This adds "Creative Lenses" — a proprietary layer inside SignalOps where users choose a creative philosophy approach before generating. Each lens encodes how the world's most awarded agencies actually think about briefs — not their visual style, but their cognitive process. This is the secret sauce.

---

## PHASE 1 — SCHEMA + TYPES

### 1A — Add creative_lens to SMCreativeRequest

**File:** `src/types/sm.ts`

```typescript
export type SMCreativeLens =
  | 'signalops'        // Default — current behaviour
  | 'human_truth'      // The Big Idea (Ogilvy lineage)
  | 'brave_take'       // The Uncomfortable Truth (W+K lineage)
  | 'category_breaker' // Category Destroyer (GUT lineage)
  | 'cultural_insider' // The Indian Insider (Piyush Pandey / Talented lineage)
  | 'behaviour_change' // The Science Lens (FCB lineage)
  | 'craft_first';     // Execution as Idea (Droga5 / BBDO lineage)

export interface SMCreativeRequest {
  // ... existing fields ...
  creative_lens?: SMCreativeLens;  // ← ADD THIS
}
```

### 1B — Add column to DB

Run in Supabase SQL Editor:
```sql
ALTER TABLE sm_creative_requests ADD COLUMN IF NOT EXISTS creative_lens TEXT DEFAULT 'signalops';
```

Update `mapCreativeRequest` in `store.ts`:
```typescript
creative_lens: (row.creative_lens as SMCreativeRequest['creative_lens']) ?? 'signalops',
```

---

## PHASE 2 — THE LENSES FILE (Secret Sauce)

**File:** `src/lib/sm/creative-lenses.ts`

This file is the proprietary core. Never expose via API. Each lens has a philosophy block that gets injected into the SignalOps system prompt.

```typescript
import type { SMCreativeLens } from '@/types/sm';

export interface CreativeLens {
  id: SMCreativeLens;
  name: string;
  tagline: string;
  description: string; // shown to user in UI
  philosophy: string;  // injected into SignalOps system prompt — NOT shown to user
}

export const CREATIVE_LENSES: CreativeLens[] = [
  {
    id: 'signalops',
    name: 'SignalOps',
    tagline: 'Default creative intelligence',
    description: 'Balanced strategic direction — insight, emotion, and platform-native execution.',
    philosophy: '', // No injection — uses base SignalOps behaviour
  },

  {
    id: 'human_truth',
    name: 'The Big Idea',
    tagline: 'Benefit-led. Research-driven. Built to last.',
    description: 'Finds the single human truth that connects the brand\'s benefit to a universal desire. Ideas that could run for decades.',
    philosophy: `
CREATIVE LENS ACTIVE: THE BIG IDEA

Your creative approach for this brief is rooted in the discipline of finding the single most powerful human truth — a researched, credible insight connecting what people deeply desire or fear to what this brand genuinely delivers.

HOW TO THINK:
1. RESEARCH FIRST — Before any creative concept, surface the most powerful human insight buried in this brief. Not a product feature. A human truth about desire, fear, aspiration, longing, or belonging.
2. THE BIG IDEA — Every brief needs one idea so simple and honest it could run as a campaign for 30 years. Everything else derives from this one idea. If you cannot state the big idea in one sentence, it is not found yet.
3. BENEFIT-LED HEADLINES — Headlines must contain news, proof, or benefit. Specific and credible always beats clever. "At 60 miles an hour, the loudest noise in this car comes from the clock" — not "Whisper-quiet luxury." Name the specific truth, not the category adjective.
4. RESPECT THE AUDIENCE — Write for an intelligent adult. No empty superlatives ("best", "great", "amazing"). No jargon. The consumer is not fooled by flash.
5. VISUAL CLARITY — The image communicates the entire idea without words. A stranger should understand the ad's intent within 3 seconds of seeing it.
6. ANTI-CLEVER TEST — Read each headline back. If it sounds like an ad trying to be clever, it has failed. If it sounds like something true and honest that happens to be memorable — it passes.

Apply this lens aggressively. Find the human truth first. Build everything from there.
`,
  },

  {
    id: 'brave_take',
    name: 'The Brave Take',
    tagline: 'Find the uncomfortable truth.',
    description: 'Counter-cultural, identity-first. The work that\'s afraid of nothing — and makes brands stand for something real.',
    philosophy: `
CREATIVE LENS ACTIVE: THE BRAVE TAKE

Your creative approach for this brief is rooted in the discipline of creative courage — finding the uncomfortable truth the brand and its category are afraid to say, and saying it with conviction.

HOW TO THINK:
1. THE UNCOMFORTABLE QUESTION — What is the one thing no brand in this category would dare say? What would make the marketing department nervous? Find that. That is your starting point, not your ending point.
2. IDENTITY OVER PRODUCT — Do not sell the product. Sell what the audience stands for, believes in, or wants to become. The product is just the means. "Just Do It" does not describe a shoe. It describes a person.
3. REFUSE THE CATEGORY — What does every brand in this space do? Whatever it is — refuse it. The most powerful ads break the category conventions completely. Find those conventions, then invert or destroy them.
4. CULTURAL COURAGE — Align with a cultural moment, a social tension, or a human truth that is genuinely contested or uncomfortable. Safe cultural references are useless. The signal to noise ratio must be high.
5. DIVIDE TO CONQUER — Great work polarizes. Not everyone will like it, and that is correct. The work should attract its audience intensely and repel those who are not the audience. Mass appeal is creative death.
6. THE BRAVE TEST — Before returning the direction, ask: would a cautious client reject this? If no, return to step 1. If yes, that is when it starts getting interesting.

Apply this lens fearlessly. The brief is just the starting point. What does this brand STAND FOR?
`,
  },

  {
    id: 'category_breaker',
    name: 'Category Breaker',
    tagline: 'Work that scares you.',
    description: 'The most provocative angle possible. Finds what makes the category boring — then breaks every convention in it.',
    philosophy: `
CREATIVE LENS ACTIVE: CATEGORY BREAKER

Your creative approach for this brief is to produce the most category-breaking, convention-destroying idea possible — the work that should, frankly, make the brand nervous before it makes them famous.

HOW TO THINK:
1. AUDIT THE CATEGORY — What does every brand in this category look like, sound like, feel like? Make a mental list of every visual, every headline trope, every tone of voice. You are now going to avoid every single item on that list.
2. THE LAWYER TEST — After generating the direction, ask: would this make someone reach for a lawyer? Not because it is harmful — because it is audacious. If no lawyer instinct is triggered, the idea is not bold enough.
3. FIND THE ABSURDITY — The most memorable work often has an element of brilliant absurdity — something that feels wrong until it feels right. Find the unexpected collision of brand truth and cultural moment that no one has made yet.
4. ZERO COMPROMISE — Every brief has a "safer version" of the bold idea lurking nearby. Reject it. The compromise is where great ideas go to die. Return the dangerous version.
5. EARNED PROVOCATION — The boldness must be earned by the insight, not just for its own sake. "Work that scares you" is not shock for shock's sake — it is the full implication of the brand's most honest position, pushed to its logical extreme.
6. LEGACY CHECK — Would this work, 10 years later, be held up as the campaign that changed what the category could be? If yes, you are in the right territory.

Apply this lens with the maximum creative ambition. If the direction feels comfortable, push further.
`,
  },

  {
    id: 'cultural_insider',
    name: 'Cultural Insider',
    tagline: 'The truth only an Indian can find.',
    description: 'Deeply vernacular, locally rooted. Finds the Indian insight that only works because it\'s specifically, authentically Indian.',
    philosophy: `
CREATIVE LENS ACTIVE: CULTURAL INSIDER

Your creative approach for this brief is rooted in deep Indian cultural intelligence — finding the insight, the emotion, and the human truth that is specifically and authentically Indian, not translated from a Western framework.

HOW TO THINK:
1. THE VERNACULAR FIRST — Conceive the idea in the emotional language of the target audience, not in English that gets translated later. The idea should feel like it was born in Hindi, Tamil, Bengali, or the specific cultural context of the brief. If it only works in English, it is not the right idea.
2. SPECIFICALLY INDIAN — Do not find a universal insight and apply it to India. Find the insight that ONLY exists in India. The specific texture of Indian family dynamics, cricket as religion, chai as ritual, the relationship between generations, the weight of a mother's opinion, the jugaad spirit — mine these specifically.
3. SMILE AND SOUL — Indians smile more times in a day than they cry. The most powerful Indian advertising finds the joy, the warmth, the humanity — even in serious messages. The smile is not frivolous; it is the signal of cultural recognition. When an Indian audience sees themselves accurately represented, they smile.
4. SCALE ACROSS INDIA — Does this idea travel from a metro apartment to a tier-3 town home? If it only resonates with urban English-speaking India, it is not truly Indian — it is the Western gaze on India. The best Indian work resonates simultaneously at both ends.
5. AVOID THE CLICHÉS — Bollywood aesthetics, dancing in fields, "unity in diversity" imagery — these are the lazy shortcuts. Go deeper. Find the specific, textured, real Indian moment that feels like it was ripped from someone's actual life.
6. CULTURAL SENSITIVITY TEST — Does this insight respect the community it represents? Cultural specificity is a strength only when it comes from genuine knowledge and respect, not appropriation or stereotype.

Apply this lens with cultural depth. The idea should only be possible because someone understood this culture from the inside.
`,
  },

  {
    id: 'behaviour_change',
    name: 'The Science Lens',
    tagline: 'Change what people do, not what they think.',
    description: 'Rooted in behavioural science. Identifies the specific behaviour to change, then selects the psychological trigger that achieves it.',
    philosophy: `
CREATIVE LENS ACTIVE: THE SCIENCE LENS

Your creative approach for this brief is rooted in behavioural science — identifying precisely what behaviour needs to change, then selecting the specific psychological mechanism that will change it.

HOW TO THINK:
1. DEFINE THE BEHAVIOUR — Before any creative concept, define exactly what you want people to DO differently after seeing this. Not feel. Not think. DO. "Buy now" is too vague. "Replace their existing habit with ours before the weekend" is specific.
2. SELECT THE MECHANISM — From the toolkit of behavioural economics, identify which trigger is most relevant:
   - LOSS AVERSION: Losses loom larger than gains. What does the audience lose by NOT acting?
   - NUDGE: A gentle directional push that preserves choice. Change the default, not the freedom.
   - SOCIAL PROOF: Peer behaviour is the most powerful persuader. What are others doing?
   - SCARCITY / URGENCY: Limited availability triggers immediate action.
   - IDENTITY RESONANCE: People act in line with who they believe they are.
   - STATUS QUO BIAS: Remind people what they love — loyalty over acquisition.
   - ANCHORING: Perception of value is entirely relative.
3. BUILD FROM THE TRIGGER — The entire creative direction — headline, visual, CTA, copy — should be a single-minded expression of the chosen mechanism. Every word either serves the trigger or should be cut.
4. THE SYSTEM, NOT THE MOMENT — The best behaviour-change work creates ongoing systems of behaviour, not single moments of persuasion. "Never Finished" — what does the audience keep doing after the first interaction?
5. MEASURE THE INTENT — Every creative decision should be answerable with "this will increase/decrease [specific behaviour] because [specific psychological principle]." If you cannot complete that sentence, the decision is decorative.

Apply this lens with scientific precision. The creative output should be elegant AND mechanically correct.
`,
  },

  {
    id: 'craft_first',
    name: 'Craft First',
    tagline: 'The execution is the idea.',
    description: 'Obsessive about craft. Every word, every visual choice, every structural decision is load-bearing. Simplicity achieved through precision, not laziness.',
    philosophy: `
CREATIVE LENS ACTIVE: CRAFT FIRST

Your creative approach for this brief treats the execution as inseparable from the idea — where the specific, considered crafting of language and image IS the creative act, not just its delivery.

HOW TO THINK:
1. THE LOAD-BEARING TEST — Every word in every headline must be load-bearing. Remove any word and the headline fails. If a word can be removed without loss, remove it. The final headline should be irreducible.
2. SIMPLICITY THROUGH PRECISION — Simplicity is not laziness. It is the result of relentless specificity until only what is essential remains. "Just Do It" is three words because no other combination of words says the same thing as efficiently. Find that irreducible expression.
3. THE VISUAL AS ARGUMENT — The image is not decoration for the copy. It must make an argument. The best visual-copy combinations work in counterpoint — the image says something the copy does not, and vice versa. The combination creates a third meaning neither could make alone.
4. CRAFT IN SERVICE OF TRUTH — Craft is not style. It is precision in service of the core truth of the brief. Ornament that does not serve the idea is noise. Remove it.
5. THE SECOND READING — Great crafted work rewards a second read. The headline means something different the second time. The image reveals a detail that changes its meaning. Design this in.
6. PRODUCTION QUALITY INTENT — The visual direction must be specific enough that a director or art director can execute it precisely. Not "warm tones and a sense of joy" — "amber side-lighting at 45 degrees, the subject's hands in frame, no eye contact with camera, the light catching dust particles in the air." Specificity is craft.

Apply this lens with obsessive attention to every detail. The work should feel inevitable — as if it could not have been made any other way.
`,
  },
];

export function getLens(id: SMCreativeLens | undefined): CreativeLens {
  return CREATIVE_LENSES.find(l => l.id === (id ?? 'signalops')) ?? CREATIVE_LENSES[0];
}

export function getLensPhilosophy(id: SMCreativeLens | undefined): string {
  return getLens(id).philosophy;
}
```

---

## PHASE 3 — INJECT LENS INTO SIGNALOPS ENGINE

**File:** `src/lib/sm/signalops-engine.ts`

### 3A — Import the lenses

```typescript
import { getLensPhilosophy } from '@/lib/sm/creative-lenses';
import type { SMCreativeLens } from '@/types/sm';
```

### 3B — Accept lens in the engine function

```typescript
export async function runSignalOpsEngine(
  client: SMClient,
  request: SMCreativeRequest & { creative_lens?: SMCreativeLens }
): Promise<SignalOpsPayload> {
```

### 3C — Inject lens into the system prompt

Find where `systemPrompt` is built. Add the lens philosophy block AFTER the core SignalOps philosophy:

```typescript
const lensPhilosophy = getLensPhilosophy(request.creative_lens);

const systemPrompt = `You are SignalOps — the creative intelligence engine of a world-class brand agency.
[... existing system prompt content ...]

${lensPhilosophy ? `\n---\n${lensPhilosophy}\n---` : ''}

OUTPUT RULES:
[... existing output rules ...]`;
```

The lens philosophy is injected as a named block between the base philosophy and the output rules. It overrides the "how to think" section while keeping the output structure unchanged.

---

## PHASE 4 — UI: LENS SELECTOR IN BRIEF STEP

**File:** `src/components/sm/CreativeBriefForm.tsx`

### 4A — Import lenses

```typescript
import { CREATIVE_LENSES } from '@/lib/sm/creative-lenses';
import type { SMCreativeLens } from '@/types/sm';
```

### 4B — Add lens state

```tsx
const [creativeLens, setCreativeLens] = useState<SMCreativeLens>('signalops');
```

### 4C — Add lens selector to form (after the Goal selector, before platforms)

```tsx
{/* Creative Approach */}
<div className="flex flex-col gap-2">
  <div className="flex items-center gap-2">
    <label className="text-sm text-zinc-400">Creative Approach</label>
    <span className="text-xs text-zinc-600">— optional, SignalOps default if not selected</span>
  </div>
  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
    {CREATIVE_LENSES.map(lens => (
      <button
        key={lens.id}
        type="button"
        onClick={() => setCreativeLens(lens.id)}
        className={`text-left rounded-lg border px-3 py-2.5 transition-all ${
          creativeLens === lens.id
            ? 'border-amber-500/60 bg-amber-500/10'
            : 'border-zinc-700 hover:border-zinc-600'
        }`}
      >
        <p className={`text-xs font-medium ${creativeLens === lens.id ? 'text-amber-300' : 'text-zinc-300'}`}>
          {lens.name}
        </p>
        <p className="text-xs text-zinc-500 mt-0.5 leading-tight">{lens.tagline}</p>
      </button>
    ))}
  </div>
  {creativeLens !== 'signalops' && (
    <p className="text-xs text-zinc-500 bg-zinc-800/40 rounded px-3 py-2 border border-zinc-700/50">
      {CREATIVE_LENSES.find(l => l.id === creativeLens)?.description}
    </p>
  )}
</div>
```

### 4D — Include lens in form submission

```tsx
body: JSON.stringify({
  client_id: client.id,
  brief_text: brief,
  goal,
  platforms,
  uploaded_image_urls: uploadedUrls,
  creative_lens: creativeLens,  // ← ADD
}),
```

---

## PHASE 5 — STORE + API

### 5A — Include creative_lens in creative request creation

**File:** `src/lib/sm/store.ts` — `createCreativeRequest` function:

```typescript
// In the INSERT query, add creative_lens:
.insert({
  client_id,
  brief_text,
  platforms,
  goal,
  uploaded_image_urls,
  creative_lens: creative_lens ?? 'signalops',  // ← ADD
})
```

### 5B — Include creative_lens in the SignalOps route

**File:** `src/app/api/sm/creative-requests/[id]/signalops/route.ts`

The `request` object loaded from DB will now include `creative_lens`. Pass it to the engine:

```typescript
const output = await runSignalOpsEngine(client, request); // creative_lens is on request already
```

The engine reads `request.creative_lens` — no other change needed.

---

## PHASE 6 — DISPLAY LENS ON STRATEGY SCREEN

**File:** `src/components/sm/SignalOpsInsightsCard.tsx`

Show which lens was used as a small badge next to "Strategic Brief Ready":

```tsx
import { CREATIVE_LENSES } from '@/lib/sm/creative-lenses';

// In the props:
lens?: SMCreativeLens;

// In the header:
<div className="flex items-center justify-between">
  <h2 className="text-lg font-semibold text-white">✦ SignalOps Creative Direction</h2>
  <div className="flex items-center gap-2">
    {lens && lens !== 'signalops' && (
      <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-full px-2.5 py-0.5">
        {CREATIVE_LENSES.find(l => l.id === lens)?.name}
      </span>
    )}
    <span className="text-xs text-violet-400 bg-violet-500/10 border border-violet-500/30 rounded-full px-3 py-1">
      Strategic Brief Ready
    </span>
  </div>
</div>
```

---

## WHAT THE OUTPUT LOOKS LIKE

Same brief: **"Fevicol + RCB's second IPL title win"**

**SignalOps (default):** "Some bonds take years to build. Some take 17 moves. Both don't break."
→ Balanced, insight-driven, brand-appropriate

**The Big Idea:** "18 years. One promise. Still standing."
→ Researched, credible, benefit-led. The bond = the human truth of loyalty.

**The Brave Take:** "The whole country told them to move on. They didn't listen. Fevicol didn't either."
→ Counter-cultural. Positions RCB fans' persistence as identity, not delusion.

**Category Breaker:** "We've been warning you since 1959. Some things don't let go."
→ Reframes Fevicol's entire brand history as a prophecy about this moment. Breaks the category (adhesive brand commenting on cricket) completely.

**Cultural Insider:** "Woh ek bar nahi jeeta. Woh baar baar nahi haara."
→ Conceived in Hindi. Specifically Indian emotional register — the respect for resilience, not just victory. Only lands because of cultural fluency.

**The Science Lens:** Applies loss aversion — "You almost stopped watching 16 seasons ago. Imagine if you had." → Makes the 18-year wait feel like the audience's own bond with the team, not just Fevicol's.

**Craft First:** Every word in "Unhone kaha chod do. Humne Fevicol lagaya tha." is load-bearing. The output direction focuses on how to make each element irreducible and specific.

---

## COMMIT SEQUENCE

```
feat(sm/lenses): create creative-lenses.ts with 6 agency philosophy encodings
feat(sm/lenses): add creative_lens field to SMCreativeRequest type
db: add creative_lens column to sm_creative_requests
feat(sm/lenses): inject lens philosophy into SignalOps system prompt
feat(sm/lenses): add lens selector UI in CreativeBriefForm
feat(sm/lenses): display active lens badge on SignalOpsInsightsCard
feat(sm/lenses): pass creative_lens through store and API routes
```
