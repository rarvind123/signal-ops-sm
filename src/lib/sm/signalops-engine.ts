import { completeText } from "@/lib/ai";
import { cleanJsonResponse } from "@/lib/json-sanitize";
import { supabase } from "@/lib/supabase";
import { getAdSize } from "@/lib/sm/ad-sizes";
import { getFormat } from "@/lib/sm/creative-formats";
import { getLensPhilosophy } from "@/lib/sm/creative-lenses";
import type {
  SMCopyDependency,
  SMCreativeAnalogy,
  SMClient,
  SMCreativeRequest,
  SMLayoutTemplate,
  SMSignalOpsOutput,
  SMProductPlacement,
  SMVisualApproach,
  SMVisualApproachMode,
} from "@/types/sm";

type SignalOpsPayload = Omit<SMSignalOpsOutput, "id" | "request_id" | "created_at">;

const LIONS_SCORE_THRESHOLD = 6.0;
const MAX_LIONS_RETRIES = 2;

type RawSignalOpsPayload = Partial<SignalOpsPayload> & {
  headlines?: Array<{
    text?: string;
    setup?: string;
    punch?: string;
    emphasis_word?: string;
    rationale?: string;
    be_trigger?: string;
  }>;
};

export async function runSignalOpsEngine(
  client: SMClient,
  request: SMCreativeRequest
): Promise<SignalOpsPayload> {
  let lastOutput: SignalOpsPayload | null = null;

  for (let attempt = 0; attempt <= MAX_LIONS_RETRIES; attempt += 1) {
    const parsed = await callSignalOpsModel(client, request, attempt);
    lastOutput = normalizeSignalOpsOutput(parsed);

    if (!validateUnstockable(lastOutput.visual_approach)) {
      console.warn(
        "[SignalOps] Output failed un-stockable validation — proceeding with warning"
      );
    }

    if (lastOutput.lions_score.overall >= LIONS_SCORE_THRESHOLD) {
      return lastOutput;
    }

    console.warn(
      `[SignalOps] Score ${lastOutput.lions_score.overall} below threshold — retrying (${attempt + 1}/${MAX_LIONS_RETRIES})`
    );
  }

  if (!lastOutput) {
    throw new Error("SignalOps engine returned no output");
  }

  return lastOutput;
}

async function getRecentCreativeSignatures(clientId: string): Promise<string> {
  const { data: requests } = await supabase
    .from("sm_creative_requests")
    .select("id")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(20);

  const requestIds = (requests ?? []).map((row) => String(row.id));
  if (requestIds.length === 0) return "";

  const { data: signalopsData } = await supabase
    .from("sm_signalops_outputs")
    .select("visual_approach, color_recommendation, theme, layout_template")
    .in("request_id", requestIds)
    .order("created_at", { ascending: false })
    .limit(5);

  if (!signalopsData?.length) return "";

  const modes = [
    ...new Set(
      signalopsData
        .map((s) => {
          const approach = s.visual_approach as { mode?: string } | null;
          return approach?.mode;
        })
        .filter(Boolean)
    ),
  ];
  const colors = signalopsData
    .map((s) => s.color_recommendation)
    .filter(Boolean)
    .slice(0, 3);
  const themes = signalopsData
    .map((s) => s.theme)
    .filter(Boolean)
    .slice(0, 3);
  const layouts = [
    ...new Set(
      signalopsData
        .map((s) => s.layout_template as string | null)
        .filter(Boolean)
    ),
  ];

  return `
RECENT CREATIVE HISTORY FOR THIS CLIENT (do NOT repeat these):
Visual approach modes used recently: ${modes.join(", ")}
Layout templates used recently: ${layouts.length ? layouts.join(", ") : "none yet"}
Color palettes used recently: ${colors.join(" | ")}
Campaign themes used recently: ${themes.join(" | ")}

Your output MUST use a DIFFERENT visual approach mode from the ones listed above.
Your layout_template MUST differ from the most recently used layout.
Your color direction MUST feel distinct from the recent palettes.
Your theme MUST offer a fresh angle — not a variation of recent themes.
If all 5 modes have been used recently, pick the one least recently used.`;
}

async function callSignalOpsModel(
  client: SMClient,
  request: SMCreativeRequest,
  attempt: number
): Promise<RawSignalOpsPayload> {
  const brandContext = buildBrandContext(client);
  const briefContext = buildBriefContext(request);
  const beMenu = buildBEMenu(request.goal);
  const recentHistory = await getRecentCreativeSignatures(client.id);
  const retryNote =
    attempt > 0
      ? `\n\nRETRY ${attempt}: Your previous direction scored below ${LIONS_SCORE_THRESHOLD}/10 on Lions quality. Rewrite with a sharper insight bridge, a braver headline option, and more specific visual direction.`
      : "";

  const format = getFormat(request.creative_format);
  const formatContext = format.signalops_context;
  const lensPhilosophy = getLensPhilosophy(request.creative_lens);
  const contextBlock = [formatContext, lensPhilosophy].filter(Boolean).join("\n\n---\n\n");

  const systemPrompt = `You are SignalOps — the creative intelligence engine of a world-class brand agency.
You operate with the rigour of a Cannes Lions jury combined with the instinct of a senior creative director.

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

The scene_description is a director's shot note, not a mood board caption.
It describes what physically exists in the frame — not what it "feels like", "evokes", or is "reminiscent of".
If scene_description contains "inspired by", "evoking", "reminiscent of", or "feeling of" — it has failed. Rewrite it.

Your philosophy has seven pillars (sourced from Cannes Lions):

PILLAR 1 — THE INSIGHT BRIDGE
Before writing any creative direction, you must articulate:
- The HUMAN TRUTH: a universal feeling, fear, desire or tension that the target audience experiences. Not about the brand. About being human.
- The BRAND TRUTH: what is uniquely and credibly true about this specific brand that connects to that human truth.
- The CREATIVE TENSION: the friction or gap between the human truth and the brand truth. This tension IS the idea. Great campaigns live in this gap.

Example:
Brief: "Promote our free yoga class this Saturday."
Human truth: Working professionals feel time is being stolen from them — weekends disappear before they start.
Brand truth: This class costs nothing and lasts only 60 minutes.
Creative tension: In a world that takes your time, here is something that gives it back.
→ That tension drives every creative decision downstream.

PILLAR 2 — BEHAVIOURAL ECONOMICS TRIGGER
Every brief has a dominant psychological lever. You must identify and name it explicitly.
Your toolkit (from Cannes Lions / Rory Sutherland, Ogilvy):
- nudge: Gentle direction that preserves choice. "Put the fruit at eye level." Use for behaviour change, awareness.
- loss_aversion: Losses loom larger than gains. What does the audience lose by NOT acting? Use for offers, CTAs, urgency.
- scarcity_urgency: Limited availability triggers immediate action. Use for offers, events, launches.
- social_proof: Peer behaviour reduces risk. Use for testimonials, trust-building, brand awareness.
- anchoring: Perception of value is relative. Use for pricing, premium positioning.
- endowment_effect: People overvalue what they own or identify with. Use for loyalty, community, identity brands.
- status_quo_bias: Remind people what they already love to prevent switching. Use for retention campaigns.
- framing: The same thing described differently drives different responses. Use for repositioning, reframing offers.
- identity_resonance: People buy to express who they are (Dr Marcus Collins, Cannes Lions 2023). Use for cultural/community brands.

Pick ONE primary trigger. Then explain exactly how to apply it in copy and visual direction.

PILLAR 3 — CULTURAL RESONANCE LEVEL
Before generating the direction, determine which level of cultural resonance this brief is asking for.
The 4 pillars (sourced from The Marketing Arm, as presented at Cannes Lions):
- recognition: The audience sees themselves reflected in the brand's world. Required baseline for any campaign.
- alliance: The brand's values are meaningful and aligned with the audience's own values. Used for brand building.
- engagement: The audience interacts with, shares, or participates in the brand's story. Used for social/viral goals.
- advocacy: The audience actively amplifies the brand. Used for community campaigns and loyalty.

State which pillar this brief is targeting. Also flag any cultural sensitivity considerations — especially if the brief touches religion, ethnicity, gender, class, disability, or local custom. A missed sensitivity kills the campaign.

PILLAR 4 — LIONS QUALITY SELF-SCORE
After generating your direction, you will score it on four dimensions used by Cannes Lions juries:
- Distinct (1–10): Is the idea original? Does it break category conventions? A score of 8+ means a brand might reject it for being too bold.
- Truthful (1–10): Is it anchored in a genuine human or brand truth? Generic ideas score below 5.
- Brave (1–10): Does it take a creative risk? Could a conservative client refuse it? Bravery requires tension.
- Crafted (1–10): Is the execution concept tight, specific, and visually clear? Vague direction scores below 5.
Be honest. If your overall score is below 6, rewrite the direction before returning it.

PILLAR 5 — VISUAL APPROACH (The Execution Decision)

The most important creative decision after the insight is: how should the image be constructed?
Most advertising defaults to showing the product. Most award-winning advertising does not.

You must decide which of these 5 visual execution modes is right for this brand + brief:

VISUAL APPROACH MODES — IMPOSSIBLE ELEMENT GUIDE (choose ONE):

concept_first:
The image IS the ad. No text overlay needed. The impossible element is so self-evident that the brand promise communicates in under 2 seconds without copy.
copy_dependency: 1 | image_is_the_ad: true
Your impossible element must be embedded in a completely mundane, everyday scene. The more ordinary the context, the more powerful the twist.
Examples: a note that arrived before its sender (FedEx), shadows of trees that no longer exist (WWF).
BRAVE SCORE: 8-10.

visual_tension:
Two elements in the frame that should never coexist — but do. The impossibility IS the tension.
copy_dependency: 1-2 | image_is_the_ad: true
The tension must be immediately readable. The viewer feels something is wrong before they understand why.
Examples: a thief choosing the cheaper car over the Lamborghini, incompatible elements forced together.
BRAVE SCORE: 9-10.

product_transformed:
The effect of the product is shown — never the product itself. FLUX cannot render real brand packaging.
copy_dependency: 2-3
Describe only the physical effect (burn holes, fused materials, impossible residue). Set product_placement to "corner_stamp" so the real brand asset is overlaid after generation.
Examples: acid-burn holes through a dress shirt where chilli sauce was spilled — no bottle, no tube, no packaging in frame.

product_hero:
The scene proves the product's power through context — never by showing the product in FLUX.
copy_dependency: 3-4
The environment makes the claim obvious without words. The real product/logo PNG is overlaid as a corner stamp from the brand kit.
Use only when product visibility is required. Set product_placement to "corner_stamp".
BRAVE SCORE: 2-5.

effects_visible:
The effect of the product is shown as a physical, impossible change to an ordinary object or person.
copy_dependency: 2
The effect must be exaggerated to the point of impossibility — but remain photorealistic.
Examples: chilli sauce burning acid holes through a dress shirt, vitamins turning a cricket ball into a jet.
BRAVE SCORE: 5-7.

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

CATEGORY CLICHÉ BLOCKLIST:

Certain subject categories are so overused in specific brand contexts that they need an explicit block.

HANDS — The universal cliché of care, wellness, beauty, baby, and natural brands.
If the brief is for any of: baby care, skincare, wellness, natural products, healthcare, maternal, gentle, soft, pure, clean, organic:
- "Hands holding something" is always cliché. Always.
- "A hand reaching toward something" is always cliché.
- "Cupped hands" is always cliché.
- Even if your three rejected ideas did not feature hands, check your chosen scene: does it feature hands as the primary subject? If yes — try again.

BLOCKED subjects by brand category (only override if user explicitly requests them in must_include):
- Baby/maternal brands: hands, feet, cuddling, cradle
- Skincare/beauty: mirrors, before/after, glowing skin close-up, hand applying product
- Food brands: steam rising from fork, family at table, overhead flat-lay
- Fitness: weights, running shoes, sweat, determination face
- Finance/insurance: family umbrella, handshake, piggy bank
- Tech: person on laptop, blue abstract network, lock icon

PATTERN CHECK: After writing the scene_description, re-read it and identify the primary subject noun.
Look it up against the blocklist above for this brand's category.
If it matches — find a different subject that is NOT on the blocklist.

The goal: the viewer should not be able to guess what category the brand is in from the image alone,
before reading the copy. Category-breaking images win awards. Category-confirming images win nothing.

MAXIMUM ECONOMY RULE (applies after the three rejections):

Award-winning print and social advertising has ONE idea expressed with maximum economy.
Not two. Not three. One.

Before writing the scene_description, count the number of distinct visual elements:
- ONE subject or object: correct
- TWO subjects or objects with separate narrative purposes: too many

The CRACK IN THE CHAIR is one idea.
The FAMILY PHOTO ON THE CHAIR SEAT is a second idea.
Choose one. The one that works hardest alone.

The test: "Can the copy line be understood from the image alone, with zero other visual information?"
If no — simplify the image until yes.

MAXIMUM ECONOMY EXAMPLES:
- One old chair, cracked but standing. (Idea: things that survive.) ONE element.
- One pair of scissors, cutting through everything except a single thread. ONE element.
- One empty chair in afternoon light. (Idea: presence through absence.) ONE element.

NOT:
- A chair WITH a photo WITH a crack WITH warm light. (Four elements, three ideas.)
- Two hands WITH a baby WITH product nearby. (Two subjects, split attention.)

The scene_description must describe exactly ONE primary subject.
Supporting elements (light, background, shadow) are not subjects — they serve the subject.
The subject itself must tell the entire story.

After writing the scene_description, verify it by underlining every noun.
Count the nouns that are primary subjects (things the eye goes to first).
If more than one — remove the weakest.

PORTRAIT COMPOSITION RULES (applies to all social media creatives):

Instagram and social media posts are vertical (4:5 or 9:16 ratio). You are always generating for a vertical portrait frame.

VERTICAL COMPOSITION REQUIREMENTS — your scene_description must follow these:

1. SUBJECT PLACEMENT: The main subject must be positioned in the CENTER or LOWER-CENTER of the vertical frame. Never describe a subject "in the distance" or "small in the frame" — they will disappear in portrait crop.

2. UPPER THIRD: The upper third of the frame should be intentionally described. Options:
   - Open sky (warm, cool, dramatic — specific)
   - Architectural element (doorway top, ceiling, wall)
   - Natural canopy (branches, leaves, light through trees)
   - Clean gradient background
   Avoid: putting important visual elements in the upper third (they may be cropped)

3. LOWER THIRD: This is where text will sit. Always describe the lower portion of the scene as having natural breathing room — not the most detailed or busy part of the image.

4. DEPTH: Describe foreground-to-background depth. A subject in the mid-ground with a soft background creates better portrait compositions than a subject far in the background.

5. COMPOSITION WORDS TO USE: "fills the center of the frame", "positioned in the lower-center", "close portrait crop", "subject is primary focus from shoulder height", "vertical composition"

COMPOSITION TEST: Read your scene_description aloud. Could a photographer understand exactly where to stand, where to aim, and what the vertical crop would capture? If not, add positional specificity.

DECISION RULES:
1. DEFAULT BIAS: Always consider CONCEPT FIRST or VISUAL TENSION before defaulting to PRODUCT HERO.
   If the brand's USP is intangible (bonds, protection, freshness, energy, trust), PRODUCT HERO is usually the wrong choice.
2. If the brief involves a cultural moment, newsjacking, or an emotional occasion — CONCEPT FIRST or VISUAL TENSION.
3. Only choose PRODUCT HERO if: the brief explicitly requires product visibility (e.g. a launch, a new variant). Always set product_placement to "corner_stamp" — FLUX never renders the product.
4. Rate the brave_score honestly — if it's below 5, the mode is safe. Ask: would a conservative client accept this immediately? If yes, score ≤4.

Your output must include a CONCRETE scene_description built from impossible_element: a director's shot note describing what physically exists in the frame. Format: [Camera angle and distance]. [Subject and exact position]. [The impossible element, exactly described]. [Light source and quality]. [What is NOT in the frame]. Not abstract. Not lifestyle language.

PRODUCT PLACEMENT — STRICT RULE:

NEVER describe a product in the scene_description.
NEVER include product packaging, tubes, tins, bottles, or containers in the FLUX prompt.
FLUX does not know what the brand's product looks like. Any product it generates is wrong.

product_placement must always be one of:
- "corner_stamp": the real product/logo PNG from the brand kit is overlaid by the app after generation
- "none": no product appears anywhere

product_placement: "in_scene" is DISABLED. Never use it.

If the concept requires a product to be physically present (e.g. a chilli sauce burning holes in a shirt), describe ONLY the effect (the burn holes), never the product itself. The product stamp is applied separately from the brand kit.

PILLAR 6 — LAYOUT SELECTION

Every creative has a compositional structure. You must choose one — and vary it across creatives for the same brand.

LAYOUT OPTIONS:

FULL BLEED GRADIENT — Image fills the entire frame. Text overlaid in the lower third with a gradient. Logo top-right. Best for: concept-first, effects-visible, emotional scenes. Most versatile.

BRAND BAND BOTTOM — Image fills top 65% of frame. Brand's primary color as a solid band in the bottom 35%. White text in the band. Logo in the band. Best for: product-adjacent content, campaigns with strong color identity, warm/premium brands.

BRAND BAND LEFT — Image fills the right 60% of frame. Brand's primary color as a vertical column on the left 40%. Text in the left column, stacked vertically. Logo at bottom-left. Best for: documentary, professional, LinkedIn-first content.

TYPE FORWARD — Large headline dominates the top 50% of the frame (over a clean/minimal background). Small supporting image in the bottom 50%. Best for: text-heavy concept, bold/urgent brands, when the headline IS the idea.

FULL BLEED TOP TEXT — Image fills the entire frame. Text anchored at the top with a reversed gradient (dark from top, fades down). Logo bottom-right. Best for: when the image's lower half is the strongest visual element, outdoor-inspired.

SELECTION RULES:
1. Never select the same layout twice in a row for the same client
2. brand_band_bottom should use the brand's actual primary color — not white
3. brand_band_left is the most "magazine" and differentiating — use it more than expected
4. type_forward should only be chosen when the headline is 7 words or fewer and very strong
5. Check what layouts were recently used for this client and pick an underused one

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
${contextBlock ? `\n---\n${contextBlock}\n---` : ""}

OUTPUT RULES:
- Every word should be specific and actionable, not generic. "Warm sunrise tones" beats "make it feel warm".
- Headlines must read like real ads that could run tomorrow — not placeholders.
- The insight bridge is the most important output. If it is weak, everything else fails.
- Return ONLY valid JSON. No markdown. No preamble.`;

  const photoStyleNote = client.photo_style
    ? `\nPHOTOGRAPHY STYLE: This brand uses ${client.photo_style} photography. All scene descriptions must align with this style.`
    : "";

  const userPrompt = `
BRAND DNA:
${brandContext}

TODAY'S BRIEF:
${briefContext}
${photoStyleNote}
${recentHistory}

BEHAVIOURAL ECONOMICS MENU (pre-matched to brief goal "${request.goal ?? "awareness"}"):
${beMenu}
${
  format.copy_constraints.note
    ? `\nCOPY CONSTRAINTS: ${format.copy_constraints.note}\nMax headline: ${format.copy_constraints.max_headline_words} words. Max body: ${format.copy_constraints.max_body_words} words.`
    : ""
}

Generate a complete SignalOps creative direction in this exact JSON structure:

{
  "theme": "One sentence — the campaign concept or emotional hook that drives all creative decisions",

  "insight_bridge": {
    "human_truth": "The universal human feeling, fear, or desire this brief taps into — written from the audience's perspective, not the brand's",
    "brand_truth": "What is credibly and uniquely true about ${client.name} that connects to this human truth",
    "creative_tension": "The gap between the two — the friction that becomes the idea. This should feel like a small revelation."
  },

  "be_trigger": {
    "primary": "one of: nudge | loss_aversion | scarcity_urgency | social_proof | anchoring | endowment_effect | status_quo_bias | framing | identity_resonance",
    "label": "Human-readable name of the trigger",
    "rationale": "Why this specific trigger fits this brief and this audience",
    "application": "Exactly how to apply it — what word, image, or structural choice activates the trigger"
  },

  "cultural_resonance": {
    "target_pillar": "recognition | alliance | engagement | advocacy",
    "rationale": "Why this pillar is the right ambition for this brief",
    "sensitivity_flags": ["Any cultural, religious, social, or regional sensitivity that must be considered — empty array if none"]
  },

  "creative_analogy": {
    "brand_truth_distilled": "...",
    "analogies_considered": ["...", "...", "..."],
    "chosen_analogy": "...",
    "analogy_domain": "nature | human_biology | sport | science | history | art | mathematics",
    "no_explanation_test": "..."
  },

  "visual_direction": "Describe the SCENE in concrete visual terms that an image generation model can render directly. Name: the main subject/object, its position, lighting direction, background description, color treatment, and mood. Do NOT use abstract words like 'aspirational' or 'premium' — name specific visual elements instead. Example: 'A single vintage leather football resting on cracked dry earth, warm amber side-lighting from the left, dusty ochre background, shallow depth of field, the ball shows wear and age — it has history'.",

  "visual_approach": {
    "mode": "concept_first | visual_tension | product_transformed | effects_visible | product_hero",
    "rationale": "Why this mode serves the impossible element",
    "obvious_ideas_rejected": [
      "Idea rejected — reason (stock photo version)",
      "Idea rejected — reason (junior designer version)",
      "Idea rejected — reason (category cliché)"
    ],
    "impossible_element": "The ONE thing in this scene that cannot physically exist — stated as a single sentence",
    "scene_description": "Build this from impossible_element. Do NOT write a lifestyle description. Write exactly what is physically present in the frame, including the impossible element as a real object. Format: [Camera angle and distance]. [Subject and their exact position]. [The impossible element, exactly described]. [Light source and quality]. [What is NOT in the frame — no product packaging, tubes, tins, bottles, or containers ever, no text on surfaces, no brand logos in the scene itself].",
    "copy_dependency": 1,
    "image_is_the_ad": true,
    "product_placement": "corner_stamp | none",
    "product_visible": false,
    "brave_score": 9,
    "unstockable_test": "A Getty Images search for [realistic scene keywords] would never return this image because [the impossible element]."
  },

  "headlines": [
    {
      "text": "The complete headline — setup and punch combined as one line",
      "setup": "The lighter setup line — context, contrast, or tension builder",
      "punch": "The bold punch line — the payoff the viewer remembers",
      "emphasis_word": "single word in the punch to accent with brand colour",
      "rationale": "Why this works for this brand, this audience, this moment",
      "be_trigger": "Which BE trigger this headline specifically activates"
    },
    {
      "text": "Headline option 2",
      "setup": "...",
      "punch": "...",
      "emphasis_word": "...",
      "rationale": "...",
      "be_trigger": "..."
    },
    {
      "text": "Headline option 3 — make this the brave option: the one that might scare a cautious client but would win an award",
      "setup": "...",
      "punch": "...",
      "emphasis_word": "...",
      "rationale": "...",
      "be_trigger": "..."
    }
  ],

  "color_recommendation": "Specific palette tied to brand colours and the emotional mood. Name actual hex codes or colour descriptions, not just 'warm tones'.",

  "layout_template": "full_bleed_gradient | brand_band_bottom | brand_band_left | type_forward | full_bleed_top_text",
  "layout_rationale": "Why this layout fits this brief and brand — reference the visual strength of the scene and headline",

  "creative_notes": "2–3 strategic notes. Include: one thing NOT to do (the tempting generic version of this idea), one cultural or audience nuance to respect, one craft principle that would elevate this specific execution.",

  "platform_adaptations": {
    "instagram": "How this concept adapts to Instagram's visual-first, aspiration-driven feed",
    "linkedin": "How this concept adapts to LinkedIn's professional context — same idea, different framing",
    "facebook": "How this concept adapts for Facebook's community-oriented, mixed-age audience"
  },

  "lions_score": {
    "distinct": 7,
    "truthful": 8,
    "brave": 6,
    "crafted": 8,
    "overall": 7.3,
    "improvement_note": "The single most specific change that would push this toward a 9+. Be concrete."
  }
}

IMPORTANT: If your lions_score.overall is below 6.0, do NOT return that output. Rewrite the creative direction until it scores 6.5 or higher. A score below 6 means the insight is too generic or the idea is not distinct enough.

Return ONLY valid JSON.${retryNote}`;

  const response = await completeText(systemPrompt, userPrompt, "claude-sonnet-4-6", {
    maxTokens: 8192,
    temperature: 0.92,
  });

  console.log("[SignalOps] Raw AI response length:", response.length);
  console.log("[SignalOps] Raw AI response (first 500 chars):", response.slice(0, 500));
  console.log("[SignalOps] Raw AI response (last 200 chars):", response.slice(-200));

  return parseSignalOpsResponse(response);
}

const SIGNALOPS_WRAPPER_KEYS = [
  "output",
  "data",
  "result",
  "creative_direction",
  "signalops",
  "response",
] as const;

function parseSignalOpsResponse(response: string): RawSignalOpsPayload {
  let parsed: RawSignalOpsPayload;

  try {
    const cleaned = cleanJsonResponse(response)
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    let rawParsed = JSON.parse(cleaned) as Record<string, unknown>;

    if (rawParsed && typeof rawParsed === "object" && !rawParsed.theme) {
      for (const key of SIGNALOPS_WRAPPER_KEYS) {
        const wrapped = rawParsed[key];
        if (
          wrapped &&
          typeof wrapped === "object" &&
          wrapped !== null &&
          "theme" in wrapped
        ) {
          rawParsed = wrapped as Record<string, unknown>;
          console.log(`[SignalOps] Unwrapped from key: "${key}"`);
          break;
        }
      }
    }

    parsed = rawParsed as RawSignalOpsPayload;
  } catch (parseError) {
    const message = parseError instanceof Error ? parseError.message : "JSON parse failed";
    console.error("[SignalOps] JSON parse failed:", message);
    console.error("[SignalOps] Response that failed to parse:", response.slice(0, 1000));
    throw new Error(`SignalOps engine returned invalid JSON: ${message}`);
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error(
      `SignalOps engine returned null or non-object. Response: ${response.slice(0, 200)}`
    );
  }

  return parsed;
}

function normalizeSignalOpsOutput(parsed: RawSignalOpsPayload): SignalOpsPayload {
  const theme = parsed.theme?.trim() || "Creative direction pending";
  if (!parsed.theme?.trim()) {
    console.warn(
      "[SignalOps] theme field missing from AI response — output may be incomplete"
    );
  }

  const distinct = Number(parsed.lions_score?.distinct ?? 0);
  const truthful = Number(parsed.lions_score?.truthful ?? 0);
  const brave = Number(parsed.lions_score?.brave ?? 0);
  const crafted = Number(parsed.lions_score?.crafted ?? 0);
  const overall =
    typeof parsed.lions_score?.overall === "number"
      ? parsed.lions_score.overall
      : Number(((distinct + truthful + brave + crafted) / 4).toFixed(1));

  return {
    theme,
    insight_bridge: {
      human_truth: parsed.insight_bridge?.human_truth ?? "",
      brand_truth: parsed.insight_bridge?.brand_truth ?? "",
      creative_tension: parsed.insight_bridge?.creative_tension ?? "",
    },
    be_trigger: {
      primary: parsed.be_trigger?.primary ?? "",
      label: parsed.be_trigger?.label ?? "",
      rationale: parsed.be_trigger?.rationale ?? "",
      application: parsed.be_trigger?.application ?? "",
    },
    cultural_resonance: {
      target_pillar: parsed.cultural_resonance?.target_pillar ?? "recognition",
      rationale: parsed.cultural_resonance?.rationale ?? "",
      sensitivity_flags: Array.isArray(parsed.cultural_resonance?.sensitivity_flags)
        ? parsed.cultural_resonance.sensitivity_flags
        : [],
    },
    visual_direction: parsed.visual_direction ?? "",
    creative_analogy: normalizeCreativeAnalogy(parsed.creative_analogy),
    visual_approach: normalizeVisualApproach(parsed.visual_approach, parsed.visual_direction),
    headlines: Array.isArray(parsed.headlines)
      ? parsed.headlines.map((h) => ({
          text: h.text ?? "",
          setup: h.setup?.trim() || undefined,
          punch: h.punch?.trim() || undefined,
          emphasis_word: h.emphasis_word?.trim() || undefined,
          rationale: h.rationale ?? "",
          be_trigger: h.be_trigger ?? "",
        }))
      : [],
    color_recommendation: parsed.color_recommendation ?? "",
    creative_notes: parsed.creative_notes ?? "",
    platform_adaptations: parsed.platform_adaptations ?? {},
    lions_score: {
      distinct,
      truthful,
      brave,
      crafted,
      overall,
      improvement_note: parsed.lions_score?.improvement_note ?? "",
    },
    layout_template: normalizeLayoutTemplate(parsed.layout_template),
    layout_rationale: parsed.layout_rationale?.trim() ?? "",
  };
}

const VALID_LAYOUT_TEMPLATES: SMLayoutTemplate[] = [
  "full_bleed_gradient",
  "brand_band_bottom",
  "brand_band_left",
  "type_forward",
  "full_bleed_top_text",
];

function normalizeLayoutTemplate(raw?: string): SMLayoutTemplate {
  if (raw && VALID_LAYOUT_TEMPLATES.includes(raw as SMLayoutTemplate)) {
    return raw as SMLayoutTemplate;
  }
  return "full_bleed_gradient";
}

const VALID_VISUAL_APPROACH_MODES: SMVisualApproachMode[] = [
  "concept_first",
  "product_transformed",
  "product_hero",
  "effects_visible",
  "visual_tension",
];

function normalizeCreativeAnalogy(
  raw: Partial<SMCreativeAnalogy> | undefined
): SMCreativeAnalogy {
  return {
    brand_truth_distilled: raw?.brand_truth_distilled?.trim() ?? "",
    analogies_considered: Array.isArray(raw?.analogies_considered)
      ? raw.analogies_considered
          .filter((a): a is string => typeof a === "string")
          .map((a) => a.trim())
          .filter(Boolean)
      : [],
    chosen_analogy: raw?.chosen_analogy?.trim() ?? "",
    analogy_domain: raw?.analogy_domain?.trim() ?? "",
    no_explanation_test: raw?.no_explanation_test?.trim() ?? "",
  };
}

function normalizeCopyDependency(
  raw: unknown,
  mode: SMVisualApproachMode
): SMCopyDependency {
  if (typeof raw === "number" && !Number.isNaN(raw)) {
    return Math.min(5, Math.max(1, Math.round(raw))) as SMCopyDependency;
  }
  if (typeof raw === "string") {
    const match = raw.match(/\d+/);
    if (match) {
      return Math.min(5, Math.max(1, parseInt(match[0], 10))) as SMCopyDependency;
    }
  }
  if (["concept_first", "visual_tension"].includes(mode)) return 1;
  if (mode === "effects_visible") return 2;
  if (mode === "product_transformed") return 3;
  return 4;
}

function normalizeProductPlacement(
  raw: unknown,
  mode: SMVisualApproachMode
): SMProductPlacement {
  if (raw === "corner_stamp" || raw === "none") {
    return raw;
  }
  // Legacy "in_scene" from older outputs → corner stamp (real PNG overlay, never FLUX)
  if (raw === "in_scene") return "corner_stamp";
  if (mode === "product_hero" || mode === "product_transformed") return "corner_stamp";
  if (mode === "concept_first" || mode === "visual_tension") return "none";
  return "corner_stamp";
}

export function validateUnstockable(visualApproach: SMVisualApproach): boolean {
  if (!visualApproach.impossible_element?.trim()) return false;
  if (!visualApproach.unstockable_test?.trim()) return false;
  if (
    ["concept_first", "visual_tension"].includes(visualApproach.mode) &&
    visualApproach.brave_score < 7
  ) {
    return false;
  }
  return true;
}

function normalizeVisualApproach(
  raw: Partial<SMVisualApproach> | undefined,
  visualDirection?: string
): SMVisualApproach {
  const mode = VALID_VISUAL_APPROACH_MODES.includes(raw?.mode as SMVisualApproachMode)
    ? (raw!.mode as SMVisualApproachMode)
    : "concept_first";
  const copyDependency = normalizeCopyDependency(raw?.copy_dependency, mode);

  return {
    mode,
    rationale: raw?.rationale?.trim() ?? "",
    obvious_ideas_rejected: Array.isArray(raw?.obvious_ideas_rejected)
      ? raw.obvious_ideas_rejected
          .filter((idea): idea is string => typeof idea === "string")
          .map((idea) => idea.trim())
          .filter(Boolean)
      : [],
    scene_description:
      raw?.scene_description?.trim() || visualDirection?.trim() || "",
    product_visible: false,
    brave_score:
      typeof raw?.brave_score === "number"
        ? Math.min(10, Math.max(1, Math.round(raw.brave_score)))
        : 5,
    impossible_element: raw?.impossible_element?.trim() ?? "",
    copy_dependency: copyDependency,
    image_is_the_ad:
      typeof raw?.image_is_the_ad === "boolean"
        ? raw.image_is_the_ad
        : copyDependency <= 2,
    product_placement: normalizeProductPlacement(raw?.product_placement, mode),
    unstockable_test: raw?.unstockable_test?.trim() ?? "",
  };
}

function buildBEMenu(goal?: string): string {
  const menus: Record<string, string[]> = {
    offer: ["loss_aversion", "scarcity_urgency", "anchoring", "framing"],
    launch: ["social_proof", "scarcity_urgency", "identity_resonance", "framing"],
    awareness: ["identity_resonance", "nudge", "social_proof", "endowment_effect"],
    event: ["scarcity_urgency", "loss_aversion", "social_proof", "nudge"],
    cta: ["loss_aversion", "scarcity_urgency", "framing", "nudge"],
    testimonial: ["social_proof", "endowment_effect", "identity_resonance", "framing"],
  };

  const relevant = menus[goal ?? "awareness"] ?? menus.awareness;
  return `Most relevant triggers for goal "${goal ?? "awareness"}": ${relevant.join(", ")}. Consider these first, but override if a different trigger is more fitting.`;
}

function buildBrandContext(client: SMClient): string {
  const lines = [
    `Brand: ${client.name}`,
    client.tagline ? `Tagline: ${client.tagline}` : null,
    client.usp ? `USP: ${client.usp}` : null,
    `Tone: ${client.tone ?? "professional"}`,
    client.voice?.description ? `Voice: ${client.voice.description}` : null,
    client.voice?.do?.length ? `Voice Do's: ${client.voice.do.join(", ")}` : null,
    client.voice?.dont?.length ? `Voice Don'ts: ${client.voice.dont.join(", ")}` : null,
    `Audience: ${JSON.stringify(client.target_audience)}`,
  ];

  const palette = client.color_palette ?? {};
  const colorLines = Object.entries(palette)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`);
  if (colorLines.length) {
    lines.push(`Brand colours: ${colorLines.join(", ")}`);
  } else if (client.brand_colors?.length) {
    lines.push(
      `Brand colours: ${client.brand_colors.map((c) => `${c.label}: ${c.hex}`).join(", ")}`
    );
  }

  if (client.photo_style) {
    lines.push(`Photography style: ${client.photo_style}`);
  }

  if (client.font_primary) {
    lines.push(
      `Brand font: ${client.font_primary} — respect this typographic character in the visual direction`
    );
  }

  return lines.filter(Boolean).join("\n");
}

function buildBriefContext(request: SMCreativeRequest): string {
  const lines = [
    `Brief: ${request.brief_text}`,
    `Goal: ${request.goal ?? "general"}`,
    `Platforms: ${request.platforms.join(", ")}`,
    request.must_include
      ? `MANDATORY VISUAL ELEMENTS — must appear in the image: ${request.must_include}`
      : null,
    request.must_exclude
      ? `FORBIDDEN VISUAL ELEMENTS — must NOT appear in the image under any circumstances: ${request.must_exclude}`
      : null,
    request.uploaded_image_urls.length > 0
      ? `Uploaded images: ${request.uploaded_image_urls.join(", ")}`
      : null,
    request.market_context
      ? `\nMARKET REFERENCE — What competitors are currently running in India (differentiate from these):\n${request.market_context}`
      : null,
  ];

  if (request.ad_size_id && request.creative_format) {
    const size = getAdSize(request.creative_format, request.ad_size_id);
    if (size) {
      lines.push(`\nAD SIZE: ${size.label} (${size.dimensions})`);
      lines.push(`COMPOSITION REQUIREMENT: ${size.composition_note}`);
    }
  }

  return lines.filter(Boolean).join("\n");
}
