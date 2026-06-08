# SM — Minimal Professional Footer
## Cursor Brief

Add a clean, minimal footer to the app. Professional but not detailed. Two rows: a light separator, then content.

---

## IMPLEMENTATION

**File:** `src/app/page.tsx`

Add the footer at the very bottom of the page, outside the main content `div`, before the closing `</div>` of the root:

```tsx
{/* Footer */}
<footer className="mt-auto border-t border-zinc-800/60 px-6 py-5">
  <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">

    {/* Left — brand */}
    <div className="flex items-center gap-3">
      <img
        src="/inventious-logo.png"
        alt="inventious"
        className="h-5 w-auto object-contain object-left opacity-60"
      />
      <span className="text-zinc-700 text-xs">·</span>
      <span className="text-zinc-600 text-xs">SignalOps Creative Engine</span>
    </div>

    {/* Center — links */}
    <nav className="flex items-center gap-5">
      {[
        { label: 'Feedback', href: 'mailto:hello@inventious.in?subject=SignalOps Feedback' },
        { label: 'Support', href: 'mailto:hello@inventious.in' },
        { label: 'Privacy', href: '#' },
      ].map(link => (
        <a
          key={link.label}
          href={link.href}
          className="text-zinc-600 hover:text-zinc-400 text-xs transition-colors"
        >
          {link.label}
        </a>
      ))}
    </nav>

    {/* Right — status + copyright */}
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
        <span className="text-zinc-600 text-xs">All systems operational</span>
      </div>
      <span className="text-zinc-700 text-xs">© 2026 Inventious</span>
    </div>

  </div>
</footer>
```

**Also update the root layout** to ensure the page is full-height so the footer sits at the bottom:

**File:** `src/app/page.tsx` — wrap the main content in a flex-col min-h-screen container:

```tsx
// The outermost div should be:
<div className="min-h-screen bg-[#060608] flex flex-col">
  {/* ... existing content ... */}
  <footer ...>...</footer>
</div>
```

---

## RESULT

```
[inventious logo] · SignalOps Creative Engine    Feedback  Support  Privacy    ● All systems operational  © 2026 Inventious
```

One clean line. Dark, minimal, professional. Matches the existing dark aesthetic.

---

## COMMIT

```
feat(footer): add minimal professional footer — brand, links, status, copyright
```
