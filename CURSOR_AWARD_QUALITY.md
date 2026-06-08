# SM — Award Quality: Maximum Economy + UI Polish
## Cursor Brief

Two changes: add the "maximum economy" rule to SignalOps scene descriptions, and move the Aa toggle out of the image area.

---

## FIX 1 — MAXIMUM ECONOMY RULE IN SIGNALOPS

**File:** `src/lib/sm/signalops-engine.ts`

Find the ANTI-CLICHÉ MANDATE section in the system prompt. Add this rule immediately after the three-rejection mandate:

```
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
```

---

## FIX 2 — MOVE Aa TOGGLE OUT OF IMAGE

**File:** `src/components/sm/AssetCard.tsx`

Find the "Aa" toggle button. It's currently positioned inside the image container (`absolute` positioned within the `@container` div).

Remove it from inside the image entirely. Place it as a small subtle option in the card footer, between the action buttons:

```tsx
{/* REMOVE from inside image container - delete this block entirely: */}
{/* <button ... className="absolute top-2 ..." > Aa </button> */}

{/* ADD in the footer action row, as a tiny text toggle: */}
<div className="flex gap-2 px-3 pb-3 pt-1 items-center">
  {/* Text toggle — small, leftmost, subtle */}
  {localAsset.status === 'done' && localAsset.storage_url && localAsset.headline && (
    <button
      type="button"
      onClick={() => setShowTextOverlay(prev => !prev)}
      className={`text-xs rounded px-2 py-1.5 border transition-colors ${
        showTextOverlay
          ? 'border-zinc-600 text-zinc-400 hover:text-zinc-300'
          : 'border-zinc-700 text-zinc-600 hover:text-zinc-500 line-through'
      }`}
      title="Toggle headline overlay"
    >
      Tt
    </button>
  )}

  {/* Existing buttons */}
  <button onClick={() => void handleDownload()} className="flex-1 ...">↓ Download</button>
  <button onClick={...} className="flex-1 ...">↻ Redo</button>
  <button onClick={() => setShowPublish(true)} className="flex-1 ...">↑ Publish</button>
</div>
```

The toggle moves to the action row as a small `Tt` button (not `Aa` — `Tt` is the universal typography toggle icon). It's dimmed and struck-through when text is hidden, normal when visible. The image stays completely clean.

---

## COMMIT

```
feat(signalops): add maximum economy rule — one subject, one idea, no clutter
fix(ui): move Tt toggle out of image into action row — image renders as pure ad
```
