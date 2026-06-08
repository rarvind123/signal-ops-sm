# SM — Creative Finalization Panel
## Cursor Brief

A lightweight "Finalize" editor panel below the generated creative. All edits are CSS overlays — no FLUX regeneration needed. The Download button composites everything using sharp server-side.

---

## PHASE 1 — OVERLAY STATE MODEL

**File:** `src/components/sm/AssetCard.tsx`

Add overlay customisation state:

```typescript
// Creative overlay options — all CSS, no regeneration
interface OverlayOptions {
  // Typography
  textPosition: 'bottom' | 'top';
  textSize: 'sm' | 'md' | 'lg' | 'xl';
  
  // Logo
  logoBg: 'pill' | 'none' | 'circle';
  
  // Extra text line (phone, website, tagline)
  extraText: string;
  extraTextPosition: 'bottom-left' | 'bottom-right' | 'bottom-center';
  showExtraText: boolean;
  
  // QR code
  qrUrl: string;
  qrPosition: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  showQr: boolean;
  
  // Picture in picture
  pipImageUrl: string | null;
  pipPosition: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  pipSize: 'sm' | 'md' | 'lg';
  showPip: boolean;
}

const [overlayOptions, setOverlayOptions] = useState<OverlayOptions>({
  textPosition: 'bottom',
  textSize: 'md',
  logoBg: 'pill',
  extraText: '',
  extraTextPosition: 'bottom-center',
  showExtraText: false,
  qrUrl: '',
  qrPosition: 'bottom-right',
  showQr: false,
  pipImageUrl: null,
  pipPosition: 'bottom-right',
  pipSize: 'sm',
  showPip: false,
});

const [showFinalizePanel, setShowFinalizePanel] = useState(false);
```

---

## PHASE 2 — APPLY OVERLAY OPTIONS TO THE CARD DISPLAY

### 2A — Logo background adapts to `logoBg`

```tsx
{logoUrl && localAsset.status === 'done' && (
  <div className={`absolute right-3 top-3 ${
    overlayOptions.logoBg === 'pill'   ? 'rounded-lg bg-white/80 backdrop-blur-sm px-2 py-1.5 shadow-md' :
    overlayOptions.logoBg === 'circle' ? 'rounded-full bg-white/80 backdrop-blur-sm p-1.5 shadow-md' :
    '' // none — no background
  }`}>
    <img src={logoUrl} alt={client.name} className="h-8 w-auto max-w-[110px] object-contain" />
  </div>
)}
```

### 2B — Text size and position

```tsx
// Text position: swap the gradient and container based on textPosition
const textAtTop = overlayOptions.textPosition === 'top';
const fontSizeMap = {
  sm: { setup: 'clamp(10px, 2.2cqi, 13px)', punch: 'clamp(12px, 3cqi, 16px)' },
  md: { setup: 'clamp(11px, 2.8cqi, 15px)', punch: 'clamp(14px, 4.5cqi, 24px)' },
  lg: { setup: 'clamp(13px, 3.5cqi, 18px)', punch: 'clamp(18px, 5.5cqi, 30px)' },
  xl: { setup: 'clamp(15px, 4cqi, 20px)', punch: 'clamp(22px, 7cqi, 38px)' },
};
const sizes = fontSizeMap[overlayOptions.textSize];
```

### 2C — Extra text overlay (phone, website, tagline)

```tsx
{overlayOptions.showExtraText && overlayOptions.extraText && (
  <div className={`absolute z-20 ${
    overlayOptions.extraTextPosition === 'bottom-left'   ? 'bottom-3 left-4' :
    overlayOptions.extraTextPosition === 'bottom-right'  ? 'bottom-3 right-4' :
    'bottom-3 left-0 right-0 text-center'
  }`}>
    <p
      style={{
        fontFamily: typo.fontFamily ?? 'inherit',
        fontSize: 'clamp(10px, 2.5cqi, 14px)',
        color: 'rgba(255,255,255,0.85)',
        textShadow: '0 1px 3px rgba(0,0,0,0.8)',
        fontWeight: 400,
        letterSpacing: '0.05em',
      }}
    >
      {overlayOptions.extraText}
    </p>
  </div>
)}
```

### 2D — QR code overlay

Install: `npm install qrcode`

```tsx
import QRCode from 'qrcode';
const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

// Generate QR when URL changes
useEffect(() => {
  if (!overlayOptions.qrUrl || !overlayOptions.showQr) return;
  QRCode.toDataURL(overlayOptions.qrUrl, {
    width: 80,
    margin: 1,
    color: { dark: '#000000', light: '#ffffff' },
  }).then(setQrDataUrl).catch(() => {});
}, [overlayOptions.qrUrl, overlayOptions.showQr]);

{overlayOptions.showQr && qrDataUrl && (
  <div className={`absolute z-20 ${
    overlayOptions.qrPosition === 'bottom-right' ? 'bottom-10 right-3' :
    overlayOptions.qrPosition === 'bottom-left'  ? 'bottom-10 left-3' :
    overlayOptions.qrPosition === 'top-right'    ? 'top-12 right-3' :
    'top-12 left-3'
  }`}>
    <div className="bg-white rounded-lg p-1.5 shadow-md">
      <img src={qrDataUrl} alt="QR" className="w-14 h-14 block" />
    </div>
  </div>
)}
```

### 2E — Picture in picture

```tsx
const pipSizeMap = { sm: 'w-20 h-20', md: 'w-28 h-28', lg: 'w-36 h-36' };

{overlayOptions.showPip && overlayOptions.pipImageUrl && (
  <div className={`absolute z-20 ${
    overlayOptions.pipPosition === 'bottom-right' ? 'bottom-10 right-3' :
    overlayOptions.pipPosition === 'bottom-left'  ? 'bottom-10 left-3' :
    overlayOptions.pipPosition === 'top-right'    ? 'top-12 right-3' :
    'top-12 left-3'
  } ${pipSizeMap[overlayOptions.pipSize]} rounded-xl overflow-hidden shadow-lg border-2 border-white/30`}>
    <img
      src={overlayOptions.pipImageUrl}
      alt="Secondary image"
      className="w-full h-full object-cover"
    />
  </div>
)}
```

---

## PHASE 3 — FINALIZE PANEL UI

Add below the AssetCard image, collapsible when "Finalize" is clicked:

```tsx
{/* Finalize toggle */}
{localAsset.status === 'done' && localAsset.storage_url && (
  <button
    type="button"
    onClick={() => setShowFinalizePanel(prev => !prev)}
    className={`w-full text-xs py-2 border-t transition-colors ${
      showFinalizePanel
        ? 'border-violet-500/30 text-violet-400 bg-violet-500/5'
        : 'border-zinc-800 text-zinc-600 hover:text-zinc-400'
    }`}
  >
    {showFinalizePanel ? '↑ Close editor' : '✦ Finalize creative'}
  </button>
)}

{showFinalizePanel && (
  <div className="flex flex-col gap-4 p-4 border-t border-zinc-800 bg-zinc-900/50">

    {/* TYPOGRAPHY */}
    <div className="flex flex-col gap-2">
      <p className="text-xs text-zinc-500 uppercase tracking-wider">Typography</p>
      <div className="grid grid-cols-2 gap-2">
        {/* Text position */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-600">Position</label>
          <div className="flex gap-1">
            {(['bottom', 'top'] as const).map(pos => (
              <button key={pos} type="button"
                onClick={() => setOverlayOptions(o => ({ ...o, textPosition: pos }))}
                className={`flex-1 py-1 rounded text-xs capitalize border ${
                  overlayOptions.textPosition === pos
                    ? 'border-violet-500 text-violet-300 bg-violet-500/10'
                    : 'border-zinc-700 text-zinc-500'
                }`}>
                {pos}
              </button>
            ))}
          </div>
        </div>
        {/* Font size */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-600">Size</label>
          <div className="flex gap-1">
            {(['sm', 'md', 'lg', 'xl'] as const).map(size => (
              <button key={size} type="button"
                onClick={() => setOverlayOptions(o => ({ ...o, textSize: size }))}
                className={`flex-1 py-1 rounded text-xs uppercase border ${
                  overlayOptions.textSize === size
                    ? 'border-violet-500 text-violet-300 bg-violet-500/10'
                    : 'border-zinc-700 text-zinc-500'
                }`}>
                {size}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>

    {/* LOGO BACKGROUND */}
    <div className="flex flex-col gap-2">
      <p className="text-xs text-zinc-500 uppercase tracking-wider">Logo background</p>
      <div className="flex gap-2">
        {([
          { key: 'pill', label: 'Pill' },
          { key: 'circle', label: 'Circle' },
          { key: 'none', label: 'None' },
        ] as const).map(opt => (
          <button key={opt.key} type="button"
            onClick={() => setOverlayOptions(o => ({ ...o, logoBg: opt.key }))}
            className={`flex-1 py-1.5 rounded text-xs border ${
              overlayOptions.logoBg === opt.key
                ? 'border-violet-500 text-violet-300 bg-violet-500/10'
                : 'border-zinc-700 text-zinc-500'
            }`}>
            {opt.label}
          </button>
        ))}
      </div>
    </div>

    {/* EXTRA TEXT */}
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500 uppercase tracking-wider">Extra text</p>
        <button type="button"
          onClick={() => setOverlayOptions(o => ({ ...o, showExtraText: !o.showExtraText }))}
          className={`text-xs px-2 py-0.5 rounded border ${
            overlayOptions.showExtraText ? 'border-green-500/40 text-green-400' : 'border-zinc-700 text-zinc-600'
          }`}>
          {overlayOptions.showExtraText ? 'On' : 'Off'}
        </button>
      </div>
      {overlayOptions.showExtraText && (
        <div className="flex flex-col gap-1.5">
          <input
            type="text"
            value={overlayOptions.extraText}
            onChange={e => setOverlayOptions(o => ({ ...o, extraText: e.target.value }))}
            placeholder="e.g. +91 98765 43210 · yourwebsite.com"
            className="bg-zinc-800 border border-zinc-700 rounded px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-zinc-500"
          />
          <div className="flex gap-1">
            {(['bottom-left', 'bottom-center', 'bottom-right'] as const).map(pos => (
              <button key={pos} type="button"
                onClick={() => setOverlayOptions(o => ({ ...o, extraTextPosition: pos }))}
                className={`flex-1 py-1 rounded text-xs border ${
                  overlayOptions.extraTextPosition === pos
                    ? 'border-violet-500 text-violet-300 bg-violet-500/10'
                    : 'border-zinc-700 text-zinc-500'
                }`}>
                {pos === 'bottom-left' ? '← Left' : pos === 'bottom-right' ? 'Right →' : 'Center'}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>

    {/* QR CODE */}
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500 uppercase tracking-wider">QR code</p>
        <button type="button"
          onClick={() => setOverlayOptions(o => ({ ...o, showQr: !o.showQr }))}
          className={`text-xs px-2 py-0.5 rounded border ${
            overlayOptions.showQr ? 'border-green-500/40 text-green-400' : 'border-zinc-700 text-zinc-600'
          }`}>
          {overlayOptions.showQr ? 'On' : 'Off'}
        </button>
      </div>
      {overlayOptions.showQr && (
        <div className="flex flex-col gap-1.5">
          <input
            type="url"
            value={overlayOptions.qrUrl}
            onChange={e => setOverlayOptions(o => ({ ...o, qrUrl: e.target.value }))}
            placeholder="https://yourwebsite.com or WhatsApp link"
            className="bg-zinc-800 border border-zinc-700 rounded px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-zinc-500"
          />
          <div className="flex gap-1">
            {(['bottom-right', 'bottom-left', 'top-right', 'top-left'] as const).map(pos => (
              <button key={pos} type="button"
                onClick={() => setOverlayOptions(o => ({ ...o, qrPosition: pos }))}
                className={`flex-1 py-1 rounded text-xs border ${
                  overlayOptions.qrPosition === pos
                    ? 'border-violet-500 text-violet-300 bg-violet-500/10'
                    : 'border-zinc-700 text-zinc-500'
                }`}>
                {pos.replace('bottom-', 'B-').replace('top-', 'T-').replace('right', 'R').replace('left', 'L')}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>

    {/* PICTURE IN PICTURE */}
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500 uppercase tracking-wider">Picture in picture</p>
        <button type="button"
          onClick={() => setOverlayOptions(o => ({ ...o, showPip: !o.showPip }))}
          className={`text-xs px-2 py-0.5 rounded border ${
            overlayOptions.showPip ? 'border-green-500/40 text-green-400' : 'border-zinc-700 text-zinc-600'
          }`}>
          {overlayOptions.showPip ? 'On' : 'Off'}
        </button>
      </div>
      {overlayOptions.showPip && (
        <div className="flex flex-col gap-1.5">
          {/* Upload secondary image */}
          <div
            className="border border-dashed border-zinc-700 rounded-lg px-3 py-2 text-center cursor-pointer hover:border-zinc-600"
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/*';
              input.onchange = async (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                  setOverlayOptions(o => ({ ...o, pipImageUrl: ev.target?.result as string }));
                };
                reader.readAsDataURL(file);
              };
              input.click();
            }}
          >
            {overlayOptions.pipImageUrl ? (
              <div className="flex items-center gap-2">
                <img src={overlayOptions.pipImageUrl} className="w-8 h-8 rounded object-cover" alt="" />
                <span className="text-zinc-400 text-xs">Image attached · Click to change</span>
              </div>
            ) : (
              <span className="text-zinc-600 text-xs">Click to upload showroom / product / team photo</span>
            )}
          </div>
          {/* Position + Size */}
          <div className="flex gap-2">
            <div className="flex gap-1 flex-1">
              {(['bottom-right', 'bottom-left', 'top-right', 'top-left'] as const).map(pos => (
                <button key={pos} type="button"
                  onClick={() => setOverlayOptions(o => ({ ...o, pipPosition: pos }))}
                  className={`flex-1 py-1 rounded text-xs border ${
                    overlayOptions.pipPosition === pos
                      ? 'border-violet-500 text-violet-300 bg-violet-500/10'
                      : 'border-zinc-700 text-zinc-500'
                  }`}>
                  {pos.replace('bottom-', 'B').replace('top-', 'T').replace('right', 'R').replace('left', 'L')}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              {(['sm', 'md', 'lg'] as const).map(size => (
                <button key={size} type="button"
                  onClick={() => setOverlayOptions(o => ({ ...o, pipSize: size }))}
                  className={`px-2 py-1 rounded text-xs border uppercase ${
                    overlayOptions.pipSize === size
                      ? 'border-violet-500 text-violet-300 bg-violet-500/10'
                      : 'border-zinc-700 text-zinc-500'
                  }`}>
                  {size}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>

  </div>
)}
```

---

## PHASE 4 — PASS OVERLAY OPTIONS TO DOWNLOAD

**File:** `src/app/api/sm/assets/[id]/download/route.ts`

The download endpoint needs to accept overlay options and composite them using sharp + SVG:

```typescript
// POST instead of GET, accepting overlay options in body
export async function POST(req: Request, context: RouteContext) {
  const body = await req.json();
  const overlayOptions = body.overlay_options as OverlayOptions | undefined;
  // ... existing download logic ...
  
  // After logo composite, add QR code if present
  if (overlayOptions?.showQr && overlayOptions.qrUrl) {
    const QRCode = await import('qrcode');
    const qrSvg = await QRCode.toString(overlayOptions.qrUrl, {
      type: 'svg', width: 80, margin: 1,
    });
    const qrBuffer = Buffer.from(qrSvg);
    const { width = 1080, height = 1080 } = await sharp(imageBuffer).metadata();
    const pad = 30;
    const qrSize = 90;
    const pos = overlayOptions.qrPosition;
    const top = pos.startsWith('bottom') ? height - qrSize - pad - 80 : pad + 50;
    const left = pos.endsWith('right') ? width - qrSize - pad : pad;
    
    imageBuffer = await sharp(imageBuffer)
      .composite([{
        input: await sharp(qrBuffer).resize(qrSize, qrSize).png().toBuffer(),
        top, left,
      }])
      .jpeg({ quality: 90 })
      .toBuffer();
  }

  // Add picture-in-picture if present
  if (overlayOptions?.showPip && overlayOptions.pipImageUrl) {
    const pipSizeMap = { sm: 120, md: 170, lg: 220 };
    const pipSize = pipSizeMap[overlayOptions.pipSize ?? 'sm'];
    const pipRes = await fetch(overlayOptions.pipImageUrl);
    const pipBytes = Buffer.from(await pipRes.arrayBuffer());
    const resizedPip = await sharp(pipBytes).resize(pipSize, pipSize, { fit: 'cover' }).jpeg().toBuffer();
    
    const { width = 1080, height = 1080 } = await sharp(imageBuffer).metadata();
    const pad = 30;
    const pos = overlayOptions.pipPosition ?? 'bottom-right';
    const top = pos.startsWith('bottom') ? height - pipSize - pad - 80 : pad + 50;
    const left = pos.endsWith('right') ? width - pipSize - pad : pad;
    
    imageBuffer = await sharp(imageBuffer)
      .composite([{ input: resizedPip, top, left }])
      .jpeg({ quality: 90 })
      .toBuffer();
  }
}
```

Update `handleDownload` in `AssetCard.tsx` to POST with overlay options:

```typescript
async function handleDownload() {
  const res = await fetch(`/api/sm/assets/${localAsset.id}/download`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ overlay_options: overlayOptions }),
  });
  // ... rest of download handling
}
```

---

## PHASE 5 — INSTALL QR LIBRARY

```bash
npm install qrcode
npm install --save-dev @types/qrcode
```

---

## COMMIT

```
feat(editor): creative finalization panel — text, logo, QR, phone, PiP
feat(editor): text position toggle (top/bottom) and 4 size options
feat(editor): logo background toggle — pill, circle, none
feat(editor): extra text overlay — phone number, website, tagline
feat(editor): QR code generation from URL, 4 corner positions
feat(editor): picture-in-picture upload, 4 positions, 3 sizes
feat(download): accept overlay_options in POST body — composites QR and PiP via sharp
```
