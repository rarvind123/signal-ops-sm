# SM — Visual Constraints Field + Anti-Hands Rule
## Cursor Brief

Two fixes: add mandatory/excluded visual elements to the brief form, and add a category-cliché blocklist to SignalOps that catches persistent patterns like "hands" for baby/care brands.

---

## FIX 1 — VISUAL CONSTRAINTS IN BRIEF FORM

### 1A — Update SMCreativeRequest type

**File:** `src/types/sm.ts`

```typescript
export interface SMCreativeRequest {
  // ... existing fields ...
  must_include?: string;    // ← ADD: what must visually appear
  must_exclude?: string;    // ← ADD: what must not appear
}
```

### 1B — DB migration

```sql
ALTER TABLE sm_creative_requests
  ADD COLUMN IF NOT EXISTS must_include TEXT,
  ADD COLUMN IF NOT EXISTS must_exclude TEXT;
```

Update `mapCreativeRequest` in `store.ts`:
```typescript
must_include: row.must_include ? String(row.must_include) : undefined,
must_exclude: row.must_exclude ? String(row.must_exclude) : undefined,
```

### 1C — Add to CreativeBriefForm

**File:** `src/components/sm/CreativeBriefForm.tsx`

Add these two fields BELOW the main brief textarea, ABOVE the Goal selector:

```tsx
{/* Visual constraints */}
<div className="grid grid-cols-2 gap-3">
  <div className="flex flex-col gap-1">
    <label className="text-sm text-zinc-400">
      Must include <span className="text-zinc-600 text-xs">(optional)</span>
    </label>
    <textarea
      value={mustInclude}
      onChange={e => setMustInclude(e.target.value)}
      placeholder="e.g. a baby's face, forest background, product bottle, specific colour..."
      rows={2}
      className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white text-sm resize-none placeholder:text-zinc-600"
    />
  </div>
  <div className="flex flex-col gap-1">
    <label className="text-sm text-zinc-400">
      Must not show <span className="text-zinc-600 text-xs">(optional)</span>
    </label>
    <textarea
      value={mustExclude}
      onChange={e => setMustExclude(e.target.value)}
      placeholder="e.g. hands, people, stock photo feel, chess pieces, corporate look..."
      rows={2}
      className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white text-sm resize-none placeholder:text-zinc-600"
    />
  </div>
</div>
```

Include in form submission:
```typescript
body: JSON.stringify({
  // ... existing fields ...
  must_include: mustInclude.trim() || undefined,
  must_exclude: mustExclude.trim() || undefined,
}),
```

### 1D — Feed into SignalOps

**File:** `src/lib/sm/signalops-engine.ts`

Add to `buildBriefContext`:

```typescript
function buildBriefContext(request: SMCreativeRequest): string {
  const lines = [
    `Brief: ${request.brief_text}`,
    `Goal: ${request.goal ?? 'general'}`,
    `Platforms: ${request.platforms.join(', ')}`,
    request.must_include
      ? `MANDATORY VISUAL ELEMENTS — must appear in the image: ${request.must_include}`
      : null,
    request.must_exclude
      ? `FORBIDDEN VISUAL ELEMENTS — must NOT appear in the image under any circumstances: ${request.must_exclude}`
      : null,
    request.uploaded_image_urls.length > 0
      ? `Uploaded images: ${request.uploaded_image_urls.join(', ')}`
      : null,
  ];
  return lines.filter(Boolean).join('\n');
}
```

### 1E — Feed into FLUX prompt

**File:** `src/lib/sm/asset-generator.ts`

In `buildImageGenerationPrompt`, add user constraints as hard rules:

```typescript
// Add after the mode-specific instructions:
const userConstraints = [
  request?.must_include ? `MUST INCLUDE: ${request.must_include}` : null,
  request?.must_exclude
    ? [request.must_exclude, 'no hands (unless explicitly required above)'].join(', ')
    : 'no hands (unless explicitly required by the brief)',
].filter(Boolean).join(', ');
```

---

## FIX 2 — ANTI-HANDS RULE IN SIGNALOPS

**File:** `src/lib/sm/signalops-engine.ts`

Add this section to the system prompt inside the ANTI-CLICHÉ MANDATE, after the three-rejection rule:

```
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
```

---

## COMMIT

```
feat(brief): add must_include and must_exclude visual constraints fields to CreativeBriefForm
feat(brief): visual constraints feed into SignalOps and FLUX prompt as hard rules
db: add must_include, must_exclude columns to sm_creative_requests
feat(signalops): add category cliché blocklist — hands and category-default subjects are blocked
feat(signalops): pattern check — scene_description subject validated against blocklist before returning
```
