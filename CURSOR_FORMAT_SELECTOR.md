# SM — Format Selector + UI Overhaul
## Cursor Brief

Redesigns the app entry point with an "I want to create" format selector, and adapts the entire workflow based on the chosen creative format. 4 live formats: Social Media Creatives, Print Ads, Outdoor Creatives, TV Script. 2 coming soon: Social Media Videos, Pitch Presentation.

---

## PHASE 1 — NEW TYPE + DB

### 1A — Add SMCreativeFormat to types

**File:** `src/types/sm.ts`

```typescript
export type SMCreativeFormat =
  | 'social_media'    // ✅ Live — current functionality
  | 'print_ad'        // ✅ Live — A4/A3 static print
  | 'outdoor'         // ✅ Live — OOH / billboard / transit
  | 'tv_script'       // ✅ Live — text-only script output
  | 'social_video'    // 🔜 Coming soon
  | 'pitch_deck';     // 🔜 Coming soon

export interface SMCreativeRequest {
  // ... existing fields ...
  creative_format?: SMCreativeFormat;  // ← ADD
  creative_lens?: SMCreativeLens;
}
```

### 1B — DB migration

```sql
ALTER TABLE sm_creative_requests ADD COLUMN IF NOT EXISTS creative_format TEXT DEFAULT 'social_media';
```

Update `mapCreativeRequest` in `store.ts`:
```typescript
creative_format: (row.creative_format as SMCreativeRequest['creative_format']) ?? 'social_media',
```

---

## PHASE 2 — FORMAT DEFINITIONS FILE

**File:** `src/lib/sm/creative-formats.ts`

```typescript
import type { SMCreativeFormat } from '@/types/sm';

export interface CreativeFormat {
  id: SMCreativeFormat;
  label: string;
  description: string;
  icon: string;
  available: boolean;
  comingSoonLabel?: string;

  // How this format modifies SignalOps
  signalops_context: string;

  // Output type: 'image' generates a visual, 'text' generates script/copy only
  output_type: 'image' | 'text';

  // Aspect ratio for image generation
  default_aspect_ratio?: '1:1' | '9:16' | '16:9' | '4:5' | '3:4';

  // Copy constraints
  copy_constraints: {
    max_headline_words: number;
    max_body_words: number;
    note: string;
  };
}

export const CREATIVE_FORMATS: CreativeFormat[] = [
  {
    id: 'social_media',
    label: 'Social Media Creatives',
    description: 'Instagram, LinkedIn, Facebook, X — platform-native posts with copy.',
    icon: '📱',
    available: true,
    output_type: 'image',
    default_aspect_ratio: '4:5',
    copy_constraints: {
      max_headline_words: 12,
      max_body_words: 50,
      note: 'Platform-native length. Instagram favours brevity + emotion.',
    },
    signalops_context: `
FORMAT CONTEXT: SOCIAL MEDIA
You are creating for a social media feed — Instagram, LinkedIn, Facebook, or X.
Rules for this format:
- The audience is scrolling fast. The image must stop the scroll in 0.3 seconds.
- The headline must work without the image. The image must work without the headline. Together they create a third meaning.
- Copy is short. One idea per post. No sub-messages.
- Platform-native: Instagram = emotion + aspiration. LinkedIn = insight + authority. Facebook = community + accessibility.
- The visual should feel native to the feed — not like a banner ad that wandered in from 2010.
`,
  },

  {
    id: 'print_ad',
    label: 'Print Ad',
    description: 'Newspaper, magazine, or poster. Craft-first. Built to last on paper.',
    icon: '🗞️',
    available: true,
    output_type: 'image',
    default_aspect_ratio: '3:4',
    copy_constraints: {
      max_headline_words: 15,
      max_body_words: 120,
      note: 'Print allows longer copy. Headlines can be more considered. Body copy rewards the reader who stops.',
    },
    signalops_context: `
FORMAT CONTEXT: PRINT ADVERTISEMENT
You are creating for print — newspaper, magazine, or poster format.
Rules for this format:
- Print is a permanent medium. The reader chose to look at this page. They will give it more than 0.3 seconds.
- Headlines can be more considered and craft-driven — up to 15 words if every word earns its place.
- Body copy is permitted and rewards readers who engage. Write for someone who will read it twice.
- The visual composition must work in high contrast and at full bleed. No digital gradients or motion implied — think still, architectural, considered.
- Print is where the Big Idea lives at its fullest expression. No compromises for algorithm.
- White space is not empty. It is part of the design.
`,
  },

  {
    id: 'outdoor',
    label: 'Outdoor Creatives',
    description: 'Billboards, transit, OOH. One idea. Read in 3 seconds at 60km/h.',
    icon: '🪧',
    available: true,
    output_type: 'image',
    default_aspect_ratio: '16:9',
    copy_constraints: {
      max_headline_words: 7,
      max_body_words: 0,
      note: 'Outdoor = 7 words maximum. Often fewer. No body copy. The visual IS the message.',
    },
    signalops_context: `
FORMAT CONTEXT: OUTDOOR / OUT-OF-HOME (OOH)
You are creating for outdoor advertising — billboards, transit shelters, hoardings, bus wraps.
This is the most demanding creative format. The constraints are absolute:
- THE 3-SECOND RULE: A driver at 60km/h has 3 seconds to receive the full message. This is not a guideline. It is physics.
- MAXIMUM 7 WORDS IN THE HEADLINE. Fewer is better. The best outdoor ads have 3-5 words or zero words.
- NO BODY COPY. If it cannot be read from a moving vehicle, it does not belong on this medium.
- ONE IDEA ONLY. No sub-messages. No multiple benefits. One thought, communicated with maximum efficiency.
- THE VISUAL CARRIES THE WEIGHT: The image must communicate the full idea with zero words if possible. The headline is reinforcement, not explanation.
- BIG, BOLD, UNMISSABLE: Composition must work at billboard scale — large subject, high contrast, no small detail that disappears at distance.
- LOCATION AWARENESS: The best OOH is contextually aware of where it will be seen. A gym ad near a fast food restaurant. A coffee brand near the morning commute.
Headlines for this format must be punishing in their brevity. If the direction suggests 8 words, cut 2 more.
`,
  },

  {
    id: 'tv_script',
    label: 'TV Script',
    description: '30 or 60 second scripts with scene direction, dialogue, and SFX notes.',
    icon: '🎬',
    available: true,
    output_type: 'text',
    copy_constraints: {
      max_headline_words: 0,
      max_body_words: 300,
      note: 'TV script = 30 seconds (75 words spoken) or 60 seconds (150 words spoken). Include scene directions, dialogue, VO, SFX.',
    },
    signalops_context: `
FORMAT CONTEXT: TV / VIDEO SCRIPT
You are creating a TV or digital video advertisement — 30 or 60 seconds.
Rules for this format:
- TV is the most emotionally powerful advertising medium. It has time, sound, motion, and narrative.
- SCENE BY SCENE: Structure the script as distinct scenes. Each scene has a visual description, dialogue or VO, and SFX/music note.
- TIMING IS EVERYTHING: A 30-second TV ad has approximately 75 spoken words. A 60-second has 150. Every word costs airtime.
- SHOW, DON'T TELL: The visual must do the work. The VO reinforces — it does not explain what the viewer can already see.
- THE EMOTIONAL ARC: Even a 30-second ad needs a beginning, middle, and end. Setup, tension, release.
- THE FINAL 5 SECONDS: The last 5 seconds is the brand moment. Logo + tagline + endline. This is earned by what came before.
- FORMAT FOR PRODUCTION: Output must be formatted as a production-ready script that a director can take to set.
`,
  },

  {
    id: 'social_video',
    label: 'Social Media Videos',
    description: 'Reels, Shorts, TikTok. Motion-first creative.',
    icon: '🎥',
    available: false,
    comingSoonLabel: 'Coming soon',
    output_type: 'text',
    copy_constraints: { max_headline_words: 0, max_body_words: 0, note: '' },
    signalops_context: '',
  },

  {
    id: 'pitch_deck',
    label: 'Pitch Presentation',
    description: 'Investor and client presentations powered by SignalOps.',
    icon: '📊',
    available: false,
    comingSoonLabel: 'Coming soon',
    output_type: 'text',
    copy_constraints: { max_headline_words: 0, max_body_words: 0, note: '' },
    signalops_context: '',
  },
];

export function getFormat(id: SMCreativeFormat | undefined): CreativeFormat {
  return CREATIVE_FORMATS.find(f => f.id === (id ?? 'social_media')) ?? CREATIVE_FORMATS[0];
}
```

---

## PHASE 3 — NEW LANDING SCREEN (Entry Point)

### 3A — Replace the Brand step as the very first screen

The new flow is: **Format Selection → Brand → Brief → Strategy → Creatives**

Add `format` as a new step to `SMStep` in `page.tsx`:

```typescript
type SMStep = 'format' | 'brand' | 'brief' | 'signalops' | 'assets';
```

Default step is now `'format'`.

### 3B — Create the FormatSelector component

**File:** `src/components/sm/FormatSelector.tsx`

```tsx
'use client';

import { CREATIVE_FORMATS } from '@/lib/sm/creative-formats';
import type { SMCreativeFormat } from '@/types/sm';
import { useState } from 'react';

export default function FormatSelector({
  onSelect,
}: {
  onSelect: (format: SMCreativeFormat) => void;
}) {
  const [selected, setSelected] = useState<SMCreativeFormat>('social_media');

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-10">

      {/* Hero text */}
      <div className="text-center">
        <p className="text-zinc-500 text-sm uppercase tracking-widest mb-3">
          ✦ SignalOps Creative Engine
        </p>
        <h1 className="text-4xl sm:text-5xl font-semibold text-white tracking-tight">
          I want to create
        </h1>
      </div>

      {/* Format grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-2xl">
        {CREATIVE_FORMATS.map(format => (
          <button
            key={format.id}
            type="button"
            disabled={!format.available}
            onClick={() => format.available && setSelected(format.id)}
            className={`relative text-left rounded-xl border px-4 py-4 transition-all ${
              !format.available
                ? 'border-zinc-800 opacity-40 cursor-not-allowed'
                : selected === format.id
                ? 'border-violet-500 bg-violet-500/10'
                : 'border-zinc-700 hover:border-zinc-500 cursor-pointer'
            }`}
          >
            <span className="text-2xl mb-2 block">{format.icon}</span>
            <p className={`text-sm font-medium ${
              selected === format.id ? 'text-white' : 'text-zinc-300'
            }`}>
              {format.label}
            </p>
            <p className="text-xs text-zinc-500 mt-0.5 leading-snug">{format.description}</p>
            {!format.available && format.comingSoonLabel && (
              <span className="absolute top-2 right-2 text-xs text-zinc-600 bg-zinc-800 rounded-full px-2 py-0.5">
                {format.comingSoonLabel}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Continue button */}
      <button
        type="button"
        onClick={() => onSelect(selected)}
        className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl px-8 py-3 text-sm font-medium transition-colors"
      >
        Continue with {CREATIVE_FORMATS.find(f => f.id === selected)?.label} →
      </button>
    </div>
  );
}
```

### 3C — Update page.tsx to include format step

```tsx
// Add format state:
const [activeFormat, setActiveFormat] = useState<SMCreativeFormat>('social_media');

// Step indicator — add 'format' as step 0 (not shown in the 1-4 breadcrumb):
// The format step is a full-screen entry point — no step indicator shown.
// Once format is selected, the 1. Brand → 2. Brief → 3. Strategy → 4. Creatives indicator appears.

// Render:
{step === 'format' && (
  <FormatSelector
    onSelect={(format) => {
      setActiveFormat(format);
      setStep('brand');
    }}
  />
)}

// Show step indicator only when past format selection:
{step !== 'format' && (
  <>
    {/* Format badge in header */}
    <div className="flex items-center gap-2 text-xs text-zinc-500">
      <span>{CREATIVE_FORMATS.find(f => f.id === activeFormat)?.icon}</span>
      <span>{CREATIVE_FORMATS.find(f => f.id === activeFormat)?.label}</span>
      <button
        type="button"
        onClick={() => { setStep('format'); setActiveFormat('social_media'); handleStartOver(); }}
        className="text-zinc-600 hover:text-zinc-400 ml-1"
      >
        ↩ change
      </button>
    </div>
    <SMStepIndicator current={step} onStepClick={setStep} />
  </>
)}
```

### 3D — Pass activeFormat to CreativeBriefForm and into the request creation

In the brief submission body:
```typescript
body: JSON.stringify({
  client_id: client.id,
  brief_text: brief,
  goal,
  platforms,
  uploaded_image_urls: uploadedUrls,
  creative_lens: creativeLens,
  creative_format: activeFormat,  // ← ADD
}),
```

---

## PHASE 4 — FORMAT-AWARE SIGNALOPS

**File:** `src/lib/sm/signalops-engine.ts`

Import format:
```typescript
import { getFormat } from '@/lib/sm/creative-formats';
```

Inject format context alongside lens:
```typescript
const formatContext = getFormat(request.creative_format).signalops_context;
const lensPhilosophy = getLensPhilosophy(request.creative_lens);

// Inject BOTH into system prompt:
const contextBlock = [formatContext, lensPhilosophy].filter(Boolean).join('\n\n---\n\n');
```

Also inject copy constraints into the user prompt:
```typescript
const format = getFormat(request.creative_format);
const copyNote = format.copy_constraints.note
  ? `\nCOPY CONSTRAINTS: ${format.copy_constraints.note}\nMax headline: ${format.copy_constraints.max_headline_words} words. Max body: ${format.copy_constraints.max_body_words} words.`
  : '';
```

---

## PHASE 5 — FORMAT-AWARE GENERATION

**File:** `src/app/api/sm/creative-requests/[id]/generate/route.ts`

### 5A — For Print Ad: use portrait aspect ratio + print-specific prompt
```typescript
import { getFormat } from '@/lib/sm/creative-formats';

const format = getFormat(request.creative_format);
const aspectRatio = format.default_aspect_ratio ?? getAspectRatio(platform, assetType);
```

### 5B — For TV Script: skip image generation entirely

```typescript
if (format.output_type === 'text') {
  // TV Script: generate script text only, no image
  const script = await generateTVScript(client, signalops, request);
  return await updateGeneratedAsset(assetId, {
    copy: script,
    headline: signalops.headlines[headline_index]?.text ?? '',
    status: 'done',
    storage_url: null,  // no image
  });
}

// ... otherwise continue with image generation as normal
```

### 5C — TV Script generator

**File:** `src/lib/sm/tv-script.ts` (new file)

```typescript
import { completeText } from '@/lib/ai';
import type { SMClient, SMSignalOpsOutput, SMCreativeRequest } from '@/types/sm';

export async function generateTVScript(
  client: SMClient,
  signalops: SMSignalOpsOutput,
  request: SMCreativeRequest
): Promise<string> {
  const duration = '30'; // default 30s, could be user-selectable later

  const prompt = `Write a ${duration}-second TV advertisement script for ${client.name}.

CREATIVE DIRECTION:
Theme: ${signalops.theme}
Visual Direction: ${signalops.visual_direction}
Human Truth: ${signalops.insight_bridge.human_truth}
Creative Tension: ${signalops.insight_bridge.creative_tension}
Headline: ${signalops.headlines[0]?.text ?? ''}

FORMAT REQUIREMENTS:
- ${duration}-second script (~${duration === '30' ? '75' : '150'} spoken words)
- Format as: SCENE [number] | VISUAL: [description] | VO/DIALOGUE: [text] | SFX/MUSIC: [note]
- End with a brand endframe: Logo + tagline + pack shot (if applicable)
- Every scene must earn its airtime

Brand tone: ${client.tone ?? 'professional'}
USP: ${client.usp ?? 'not specified'}

Write the complete production-ready script:`;

  return completeText(
    'You are a senior TV copywriter. Write production-ready scripts that directors can take straight to set.',
    prompt
  );
}
```

---

## PHASE 6 — TV SCRIPT OUTPUT IN ASSETCARD

**File:** `src/components/sm/AssetCard.tsx`

When `asset.storage_url` is null but `asset.copy` has the script text, show the script instead of the image:

```tsx
{/* TV Script output — no image, show formatted script */}
{localAsset.status === 'done' && !localAsset.storage_url && localAsset.copy && (
  <div className="bg-zinc-950 p-4 text-xs font-mono text-zinc-300 leading-relaxed overflow-y-auto max-h-[400px] whitespace-pre-wrap">
    {localAsset.copy}
  </div>
)}
```

For TV Script download, download as a `.txt` file:
```typescript
if (!localAsset.storage_url && localAsset.copy) {
  const blob = new Blob([localAsset.copy], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${client.name}-tv-script-30s.txt`;
  a.click();
  URL.revokeObjectURL(url);
  return;
}
```

---

## PHASE 7 — UI POLISH (promo-os inspired)

### 7A — Header redesign

**File:** `src/app/page.tsx`

Replace the current header with a cleaner two-line structure matching promo-os:

```tsx
<header className="border-b border-zinc-800/60 pb-5 mb-2">
  <div className="flex items-center justify-between">
    <div className="flex flex-col gap-0.5">
      <img src="/inventious-logo.png" alt="inventious" className="h-9 w-auto object-contain object-left" />
      <p className="text-xs text-zinc-600 mt-1">
        SignalOps → {CREATIVE_FORMATS.find(f => f.id === activeFormat)?.label ?? 'Creative Engine'}
      </p>
    </div>
    {step !== 'format' && (
      <button
        type="button"
        onClick={handleStartOver}
        className="text-xs text-zinc-600 hover:text-zinc-400"
      >
        ← Start over
      </button>
    )}
  </div>
</header>
```

### 7B — Step indicator update (include Format as step 0, display only steps 1-4)

Keep the existing step indicator but add a small "Format: [icon] [label]" chip before the steps:

```tsx
<div className="flex items-center gap-3">
  {step !== 'format' && (
    <span className="text-xs bg-zinc-800 border border-zinc-700 rounded-full px-2.5 py-1 text-zinc-400">
      {CREATIVE_FORMATS.find(f => f.id === activeFormat)?.icon}{' '}
      {CREATIVE_FORMATS.find(f => f.id === activeFormat)?.label}
    </span>
  )}
  <SMStepIndicator current={step} onStepClick={setStep} />
</div>
```

---

## COMMIT SEQUENCE

```
feat(sm/formats): add SMCreativeFormat type + creative-formats.ts with 4 live + 2 coming soon
db: add creative_format column to sm_creative_requests
feat(sm/entry): add FormatSelector landing screen — "I want to create"
feat(sm/flow): format selection becomes step 0 before brand/brief/strategy/creatives
feat(sm/signalops): inject format context into SignalOps system prompt alongside lens
feat(sm/generate): format-aware aspect ratio selection for print and OOH
feat(sm/tv): add TV script generator — text-only output, no image generation
feat(sm/ui): show TV script in AssetCard monospace format + download as .txt
feat(sm/ui): header redesign — promo-os inspired with format badge
feat(sm/ui): format chip in step indicator breadcrumb
```
