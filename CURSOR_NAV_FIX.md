# SM — Fix: Navigation & Back Button
## Cursor Brief

Two nav problems to fix:
1. No way to go back from Creatives step
2. No way to start completely over (change brand, clear everything)

---

## FIX 1 — MAKE STEP INDICATORS CLICKABLE

**File:** `src/app/page.tsx`

Find `SMStepIndicator`. Make each completed step clickable to go back:

```tsx
function SMStepIndicator({
  current,
  onStepClick,
}: {
  current: SMStep;
  onStepClick: (step: SMStep) => void;
}) {
  const steps: { key: SMStep; label: string }[] = [
    { key: "brand", label: "Brand" },
    { key: "brief", label: "Brief" },
    { key: "signalops", label: "Strategy" },
    { key: "assets", label: "Creatives" },
  ];

  const stepOrder: SMStep[] = ["brand", "brief", "signalops", "assets"];
  const currentIndex = stepOrder.indexOf(current);

  return (
    <div className="flex items-center gap-2">
      {steps.map((s, i) => {
        const isCompleted = i < currentIndex;
        const isCurrent = s.key === current;
        return (
          <div key={s.key} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => isCompleted && onStepClick(s.key)}
              disabled={!isCompleted}
              className={`text-sm font-medium transition-colors ${
                isCurrent
                  ? "text-white"
                  : isCompleted
                  ? "text-zinc-400 hover:text-white cursor-pointer underline underline-offset-2"
                  : "text-zinc-600 cursor-default"
              }`}
            >
              {i + 1}. {s.label}
            </button>
            {i < steps.length - 1 && <span className="text-zinc-700">→</span>}
          </div>
        );
      })}
    </div>
  );
}
```

Wire `onStepClick` in the main `Home` component:

```tsx
<SMStepIndicator
  current={step}
  onStepClick={(s) => setStep(s)}
/>
```

---

## FIX 2 — START OVER BUTTON (clears everything)

**File:** `src/app/page.tsx`

Add a `handleStartOver` function that resets ALL state:

```tsx
function handleStartOver() {
  setStep("brand");
  setActiveClient(null);
  setActiveRequest(null);
  setSignalOpsOutput(null);
  setGeneratedAssets([]);
  setError(null);
  setShowCreateForm(true);
}
```

Add a "Start over" link in the header, visible on all steps except `brand`:

```tsx
<header className="border-b border-zinc-800/80 pb-6">
  <div className="flex items-center justify-between">
    <Image
      src="/inventious-logo.png"
      alt="inventious"
      width={378}
      height={118}
      className="h-10 w-auto object-contain object-left sm:h-12"
      priority
    />
    {step !== "brand" && (
      <button
        type="button"
        onClick={handleStartOver}
        className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        ← Start over
      </button>
    )}
  </div>
</header>
```

---

## FIX 3 — BACK BUTTON ON CREATIVES STEP

**File:** `src/components/sm/CreativePreviewGrid.tsx`

The `+ New Post` button goes back to `brief`. Add a separate `← Change brand` link:

```tsx
<div className="flex items-center justify-between">
  <div className="flex items-center gap-4">
    <h2 className="text-lg font-semibold text-white">Generated Creatives</h2>
    <button
      type="button"
      onClick={onStartOver}
      className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
    >
      ← New brief
    </button>
  </div>
  <button
    type="button"
    onClick={onStartOver}
    className="text-sm border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 rounded px-3 py-1.5 transition-colors"
  >
    + New Post
  </button>
</div>
```

---

## FIX 4 — BACK BUTTON ON STRATEGY STEP

**File:** `src/components/sm/SignalOpsInsightsCard.tsx`

The `← Edit Brief` button already exists but confirm it's wired. Also add ability to go back to Brand:

The existing action row should look like:
```tsx
<div className="flex gap-3">
  <button onClick={onEdit}
    className="px-4 py-2 rounded text-sm border border-zinc-700 text-zinc-400 hover:text-white">
    ← Edit Brief
  </button>
  <button onClick={onRedo} ...>↻ Redo Strategy</button>
  <button onClick={() => onApprove(selectedHeadline)} ...>✦ Generate →</button>
</div>
```

---

## COMMIT

```
feat(sm/nav): make completed step indicators clickable — navigate back
feat(sm/nav): add Start over button in header — resets all state
feat(sm/nav): add New brief link in CreativePreviewGrid header
```
