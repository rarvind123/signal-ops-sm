# SM — Strategy Protection + PPT Export (Premium Locked)
## Cursor Brief

Two changes: protect strategy content from copying/printing, and add a locked PPT download button for premium subscribers.

---

## FIX 0 — DB MIGRATION (run first in Supabase SQL Editor)

```sql
ALTER TABLE sm_campaigns
  ADD COLUMN IF NOT EXISTS review_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS review_token   TEXT;
```

---

## FIX 1 — NO COPYING ON STRATEGY SCREEN

**File:** `src/components/sm/SignalOpsInsightsCard.tsx` and any strategy display components

Add these CSS protections to the outermost wrapper of the strategy content:

```tsx
<div
  className="..."
  style={{
    userSelect: 'none',
    WebkitUserSelect: 'none',
    MozUserSelect: 'none',
  }}
  onContextMenu={e => e.preventDefault()}   // disable right-click
  onCopy={e => e.preventDefault()}          // disable Ctrl+C copy
  onCut={e => e.preventDefault()}           // disable Ctrl+X
>
  {/* strategy content */}
</div>
```

Also add to `globals.css` for the strategy route:

```css
/* Prevent printing of strategy content */
@media print {
  [data-strategy-protected] {
    display: none !important;
  }
}

/* Anti-screenshot watermark layer (CSS only — deters casual screenshots) */
[data-strategy-protected] {
  position: relative;
}
[data-strategy-protected]::after {
  content: 'inventious · SignalOps™ · Confidential';
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-30deg);
  font-size: 48px;
  color: rgba(255,255,255,0.03);
  white-space: nowrap;
  pointer-events: none;
  z-index: 9999;
  user-select: none;
}
```

Add `data-strategy-protected` attribute to the strategy card wrapper:

```tsx
<div data-strategy-protected className="...">
```

---

## FIX 2 — PPT DOWNLOAD BUTTON (premium locked)

Add a locked export button to the strategy screen. Shows as disabled with a premium badge. Does nothing when clicked — shows an upgrade prompt instead.

**File:** `src/components/sm/SignalOpsInsightsCard.tsx`

Add below the existing action buttons row:

```tsx
{/* Strategy export — premium locked */}
<div className="border-t border-zinc-800 pt-3 mt-1">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setShowPremiumModal(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-zinc-700 text-zinc-500 cursor-not-allowed opacity-60 text-sm"
        disabled
      >
        <span>📊</span>
        <span>Export strategy as .pptx</span>
        <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full px-2 py-0.5 ml-1">
          Premium
        </span>
      </button>
    </div>
    <p className="text-zinc-600 text-xs">Strategy content is view-only</p>
  </div>
</div>

{/* Premium modal */}
{showPremiumModal && (
  <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
    <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-80 flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-amber-400 text-xs uppercase tracking-wider">Premium feature</p>
        <h3 className="text-white font-semibold">Export Strategy as PowerPoint</h3>
        <p className="text-zinc-400 text-sm">
          Download your complete SignalOps strategy — narrative, pillars, content calendar, and creative briefs — as a branded .pptx presentation ready to share with clients.
        </p>
      </div>
      <div className="flex flex-col gap-2 text-sm text-zinc-400">
        <p>✓ Branded with your logo</p>
        <p>✓ Full campaign strategy deck</p>
        <p>✓ Content calendar slides</p>
        <p>✓ Creative brief per post</p>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setShowPremiumModal(false)}
          className="flex-1 border border-zinc-700 rounded py-2 text-xs text-zinc-400"
        >
          Close
        </button>
        <button
          type="button"
          onClick={() => {
            setShowPremiumModal(false);
            // TODO: link to upgrade page when billing is implemented
            window.open('mailto:hello@inventious.in?subject=SignalOps Premium Upgrade', '_blank');
          }}
          className="flex-1 bg-amber-600 hover:bg-amber-500 text-white rounded py-2 text-xs font-medium"
        >
          Contact us to upgrade
        </button>
      </div>
    </div>
  </div>
)}
```

Add state:
```tsx
const [showPremiumModal, setShowPremiumModal] = useState(false);
```

---

## FIX 3 — NO COPY ON CAMPAIGN STRATEGY PAGE TOO

For the campaign strategy display (narrative, pillars, calendar):

**File:** `src/app/campaign/[id]/strategy/page.tsx` (or wherever campaign strategy displays)

Wrap all content:
```tsx
<div
  data-strategy-protected
  style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
  onContextMenu={e => e.preventDefault()}
  onCopy={e => e.preventDefault()}
>
  {/* campaign strategy content */}
</div>
```

---

## IMPORTANT NOTES ON PRINT SCREEN LIMITATION

True print screen / screenshot prevention is **not possible in a web browser** — the OS handles screenshots, not the browser. What we CAN do:

1. ✅ `user-select: none` — prevents text selection and Ctrl+C
2. ✅ `@media print { display: none }` — prevents Ctrl+P printing
3. ✅ Disabled right-click context menu
4. ✅ Very faint watermark (deters casual screenshots)
5. ❌ Cannot prevent: OS screenshot (Cmd+Shift+3, Win+PrintScreen), screen recording, phone camera

The best protection for truly sensitive strategy is the client approval link (read-only, separate URL) — which is already built. The strategy in the app is visible to the logged-in user who created it, which is appropriate.

---

## COMMIT

```
fix(db): add missing review_enabled and review_token columns to sm_campaigns
feat(strategy): user-select-none and onCopy prevention on all strategy content
feat(strategy): @media print hide on strategy sections
feat(strategy): faint watermark overlay via CSS ::after
feat(strategy): PPT export button — locked, shows premium modal
feat(strategy): premium modal with feature list and upgrade contact CTA
```
