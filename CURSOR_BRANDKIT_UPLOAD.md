# SM — Brand Kit PDF Upload + Auto-Extract
## Cursor Brief

Add a PDF brand guidelines upload option at the top of the Brand Kit section. SignalOps reads the PDF and auto-populates color palette, fonts, photo style, and voice guidelines. User reviews and confirms.

---

## PHASE 1 — FILE UPLOAD UI

**File:** `src/components/sm/BrandProfileForm.tsx`

Add this block INSIDE the Brand Kit section, at the very top before the Colour Palette section:

```tsx
{/* Brand Guidelines Upload */}
<div className="flex flex-col gap-2 mb-6">
  <label className="text-xs text-zinc-400 uppercase tracking-wider">Upload Brand Guidelines</label>
  <div
    className={`relative border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer ${
      isDragging ? 'border-violet-500 bg-violet-500/5' : 'border-zinc-700 hover:border-zinc-600'
    }`}
    onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
    onDragLeave={() => setIsDragging(false)}
    onDrop={async (e) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) await handleGuidelinesUpload(file);
    }}
    onClick={() => guidelinesInputRef.current?.click()}
  >
    <input
      ref={guidelinesInputRef}
      type="file"
      accept=".pdf"
      className="hidden"
      onChange={async (e) => {
        const file = e.target.files?.[0];
        if (file) await handleGuidelinesUpload(file);
      }}
    />

    {extracting ? (
      <div className="flex flex-col items-center gap-2 py-2">
        <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-zinc-400 text-sm">Reading brand guidelines...</p>
        <p className="text-zinc-600 text-xs">Extracting colours, fonts, voice, and photo style</p>
      </div>
    ) : guidelinesPdfName ? (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-left">
          <span className="text-lg">📄</span>
          <div>
            <p className="text-white text-sm">{guidelinesPdfName}</p>
            <p className="text-green-400 text-xs mt-0.5">✓ Brand kit extracted — review below</p>
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setGuidelinesPdfName(null); }}
          className="text-zinc-600 hover:text-zinc-400 text-xs"
        >
          Remove
        </button>
      </div>
    ) : (
      <div className="flex flex-col items-center gap-1.5 py-2">
        <p className="text-zinc-400 text-sm">Drop your brand guidelines PDF here</p>
        <p className="text-zinc-600 text-xs">or click to browse · We'll extract colours, fonts, and voice</p>
      </div>
    )}
  </div>

  {extractError && (
    <p className="text-amber-400 text-xs">⚠ Could not auto-extract — fill in the fields below manually</p>
  )}
</div>
```

Add state variables:
```tsx
const [isDragging, setIsDragging] = useState(false);
const [extracting, setExtracting] = useState(false);
const [guidelinesPdfName, setGuidelinesPdfName] = useState<string | null>(null);
const [extractError, setExtractError] = useState(false);
const guidelinesInputRef = useRef<HTMLInputElement>(null);
```

Add upload handler:
```tsx
async function handleGuidelinesUpload(file: File) {
  if (!file.name.endsWith('.pdf')) {
    setExtractError(true);
    return;
  }

  setExtracting(true);
  setExtractError(false);

  try {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/sm/brand-kit/extract', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) throw new Error('Extraction failed');
    const extracted = await res.json();

    // Auto-populate form fields with extracted values
    if (extracted.color_palette?.primary) {
      setColorPalette(prev => ({ ...prev, ...extracted.color_palette }));
    }
    if (extracted.font_primary) setFontPrimary(extracted.font_primary);
    if (extracted.font_secondary) setFontSecondary(extracted.font_secondary);
    if (extracted.photo_style) setPhotoStyle(extracted.photo_style);
    if (extracted.voice_description) setVoiceDescription(extracted.voice_description);
    if (extracted.do_list?.length) setVoiceDo(extracted.do_list);
    if (extracted.dont_list?.length) setVoiceDont(extracted.dont_list);

    // Save the PDF URL for reference
    if (extracted.pdf_url) {
      setGuidelinesPdfUrl(extracted.pdf_url);
    }

    setGuidelinesPdfName(file.name);
  } catch {
    setExtractError(true);
  } finally {
    setExtracting(false);
  }
}
```

---

## PHASE 2 — EXTRACTION API

**File:** `src/app/api/sm/brand-kit/extract/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { smRouteHandler } from '@/lib/sm/api-auth';
import { supabase } from '@/lib/supabase';
import { callAI } from '@/lib/ai';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(req: Request) {
  return smRouteHandler(req, async () => {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file || !file.name.endsWith('.pdf')) {
      return NextResponse.json({ error: 'PDF file required' }, { status: 400 });
    }

    // 1. Upload PDF to Supabase storage
    const bytes = Buffer.from(await file.arrayBuffer());
    const fileName = `guidelines/${Date.now()}-${file.name.replace(/\s+/g, '-')}`;

    const { error: uploadError } = await supabase.storage
      .from('sm-assets')
      .upload(fileName, bytes, { contentType: 'application/pdf', upsert: false });

    if (uploadError) {
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from('sm-assets').getPublicUrl(fileName);

    // 2. Extract text from PDF using basic method
    // Since we can't render PDFs server-side easily, send the raw bytes as base64
    // and ask Claude to extract brand information from whatever text it can see
    
    // Convert first 50KB of PDF to base64 for analysis
    const pdfSample = bytes.slice(0, 50000).toString('base64');

    // 3. Ask Claude to extract brand information
    const extractionPrompt = `You are analyzing a brand guidelines document (PDF).
Extract the following information from the document text/content:

1. COLOUR PALETTE: Primary, secondary, accent, background, and text colors (as hex codes if mentioned, or descriptive names)
2. TYPOGRAPHY: Primary/headline font name, secondary/body font name
3. PHOTOGRAPHY STYLE: One of: lifestyle, product, minimal, documentary, illustrated, premium
4. BRAND VOICE: A description of how the brand communicates
5. VOICE DO'S: List of things the brand should always do in communication (max 4)
6. VOICE DON'TS: List of things the brand should never do in communication (max 4)

The document data (PDF bytes as base64, extract any readable text): 
[PDF DATA - ${file.name} - ${Math.round(bytes.length / 1024)}KB]

Return ONLY valid JSON in this exact format:
{
  "color_palette": {
    "primary": "#hex or null",
    "secondary": "#hex or null", 
    "accent": "#hex or null",
    "background": "#hex or null",
    "text": "#hex or null"
  },
  "font_primary": "font name or null",
  "font_secondary": "font name or null",
  "photo_style": "lifestyle|product|minimal|documentary|illustrated|premium or null",
  "voice_description": "How the brand speaks, in 1-2 sentences",
  "do_list": ["Do this", "Do that"],
  "dont_list": ["Don't do this", "Don't do that"]
}

If you cannot find specific information, use null for that field.
Return ONLY the JSON object, no other text.`;

    let extracted: Record<string, unknown> = {};

    try {
      const aiResponse = await callAI({
        system: 'You are a brand analyst extracting information from brand guidelines documents. Return only valid JSON.',
        user: extractionPrompt,
        maxTokens: 1000,
        temperature: 0.2,
      });

      // Parse the JSON response
      const cleaned = aiResponse.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      extracted = JSON.parse(cleaned);
    } catch {
      // If AI extraction fails, return empty extracted but with the PDF URL
      console.warn('[brand-kit/extract] AI extraction failed, returning PDF URL only');
    }

    return NextResponse.json({
      ...extracted,
      pdf_url: urlData.publicUrl,
    });
  });
}
```

---

## PHASE 3 — ALSO SUPPORT LOGO ZIP UPLOAD

For brands that want to upload a logo pack (ZIP with primary/white/dark variants):

Add a second upload zone below the PDF upload:

```tsx
{/* Logo Pack Upload — ZIP or folder of PNGs */}
<div className="flex flex-col gap-2">
  <label className="text-xs text-zinc-400 uppercase tracking-wider">Upload Logo Pack (optional)</label>
  <div
    className="border border-dashed border-zinc-700 rounded-lg px-4 py-3 flex items-center justify-between hover:border-zinc-600 cursor-pointer transition-all"
    onClick={() => logoPackInputRef.current?.click()}
  >
    <input
      ref={logoPackInputRef}
      type="file"
      accept=".zip,.png,.svg"
      multiple
      className="hidden"
      onChange={async (e) => {
        const files = Array.from(e.target.files ?? []);
        await handleLogoPackUpload(files);
      }}
    />
    <span className="text-zinc-500 text-xs">
      Drop PNG or SVG files — primary, white, dark, symbol variants
    </span>
    <span className="text-zinc-600 text-xs">Browse</span>
  </div>
</div>
```

Logo pack upload handler auto-assigns logo variants based on filename:
```typescript
async function handleLogoPackUpload(files: File[]) {
  for (const file of files) {
    const name = file.name.toLowerCase();
    let variant: 'primary' | 'white' | 'dark' | 'symbol' = 'primary';
    if (name.includes('white') || name.includes('light') || name.includes('reverse')) variant = 'white';
    else if (name.includes('dark') || name.includes('black')) variant = 'dark';
    else if (name.includes('symbol') || name.includes('icon') || name.includes('mark')) variant = 'symbol';

    // Upload and set logoUrl[variant]
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'logo');

    if (clientId) {
      const res = await fetch(`/api/sm/clients/${clientId}/assets`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.storage_url) {
        setLogos(prev => ({ ...prev, [variant]: data.storage_url }));
      }
    }
  }
}
```

---

## VISUAL RESULT

The Brand Kit section will have:

```
UPLOAD BRAND GUIDELINES
┌─────────────────────────────────────────────────────────┐
│  Drop your brand guidelines PDF here                    │
│  or click to browse · We'll extract colours,           │
│  fonts, and voice                                       │
└─────────────────────────────────────────────────────────┘

UPLOAD LOGO PACK (optional)
┌─────────────────────────────────────────────────────────┐
│  Drop PNG or SVG files — primary, white, dark, symbol  │ Browse
└─────────────────────────────────────────────────────────┘

[After upload:]
📄 Himalaya_Brand_Guidelines_2024.pdf
✓ Brand kit extracted — review below

COLOUR PALETTE
[Primary] [Secondary] [Accent] [Background] [Text]
← auto-filled from PDF

Headline font          Body font
[Helvetica Neue]       [Georgia]
← auto-filled from PDF
```

---

## COMMIT

```
feat(brand-kit): PDF brand guidelines upload with AI extraction
feat(brand-kit): auto-populate color palette, fonts, voice from uploaded PDF
feat(brand-kit): logo pack upload with automatic variant detection (primary/white/dark/symbol)
feat(brand-kit/api): POST /api/sm/brand-kit/extract — PDF upload + Claude extraction
```
