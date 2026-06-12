"use client";

import { useState } from "react";
import {
  btnPrimary,
  chip,
  chipActive,
  field,
  label,
  sectionTitle,
} from "@/lib/sm/ui";
import type {
  SMClient,
  SMColorPalette,
  SMLogoSet,
  SMPhotoStyle,
  SMTone,
} from "@/types/sm";
import { LOGO_UPLOAD_HINT } from "@/lib/sm/logo-upload";
import LogoReadinessPanel from "./LogoReadinessPanel";
import LogoUploader from "./LogoUploader";
import LogoVariantUploader from "./LogoVariantUploader";

const TONES: SMTone[] = ["bold", "warm", "premium", "playful", "professional", "urgent"];
const PHOTO_STYLES: SMPhotoStyle[] = [
  "lifestyle",
  "product",
  "minimal",
  "documentary",
  "illustrated",
  "premium",
];
const COLOR_ROLES = ["primary", "secondary", "accent", "background", "text"] as const;
const LOGO_VARIANTS = ["primary", "white", "dark", "symbol"] as const;

export default function BrandProfileForm({
  onSave,
  onLogoUploaded,
  initial,
}: {
  onSave: (c: SMClient, options?: { includeLogo: boolean }) => void;
  onLogoUploaded?: () => void;
  initial?: Partial<SMClient>;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [tagline, setTagline] = useState(initial?.tagline ?? "");
  const [usp, setUsp] = useState(initial?.usp ?? "");
  const [tone, setTone] = useState<SMTone>(initial?.tone ?? "professional");
  const [colors, setColors] = useState(
    initial?.brand_colors ?? [{ hex: "#000000", label: "primary" }]
  );
  const [audienceLocation, setAudienceLocation] = useState(
    initial?.target_audience?.location ?? ""
  );
  const [hasBrandKit, setHasBrandKit] = useState(initial?.has_brand_kit ?? false);
  const [logos, setLogos] = useState<SMLogoSet>(initial?.logos ?? {});
  const [colorPalette, setColorPalette] = useState<SMColorPalette>(
    initial?.color_palette ?? {}
  );
  const [fontPrimary, setFontPrimary] = useState(initial?.font_primary ?? "");
  const [fontSecondary, setFontSecondary] = useState(initial?.font_secondary ?? "");
  const [photoStyle, setPhotoStyle] = useState<SMPhotoStyle | undefined>(
    initial?.photo_style
  );
  const [voiceDescription, setVoiceDescription] = useState(
    initial?.voice?.description ?? ""
  );
  const [savedClient, setSavedClient] = useState<SMClient | null>(
    initial?.id ? (initial as SMClient) : null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [includeLogo, setIncludeLogo] = useState(true);
  const [logoReady, setLogoReady] = useState(false);

  function buildPayload() {
    return {
      name,
      tagline,
      usp,
      tone,
      brand_colors: colors,
      target_audience: { location: audienceLocation || undefined },
      has_brand_kit: hasBrandKit,
      logos,
      color_palette: colorPalette,
      font_primary: fontPrimary || undefined,
      font_secondary: fontSecondary || undefined,
      photo_style: photoStyle,
      voice: {
        description: voiceDescription || undefined,
        do: initial?.voice?.do ?? [],
        dont: initial?.voice?.dont ?? [],
      },
    };
  }

  async function persistClient(clientId?: string) {
    const payload = buildPayload();
    const isUpdate = Boolean(clientId);
    const res = await fetch(isUpdate ? `/api/sm/clients/${clientId}` : "/api/sm/clients", {
      method: isUpdate ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const client = (await res.json()) as SMClient & { error?: string };
    if (!res.ok) throw new Error(client.error ?? "Save failed");
    setSavedClient(client);
    return client;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await persistClient(savedClient?.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogoVariantUpload(variant: keyof SMLogoSet, url: string) {
    if (!savedClient) return;
    const nextLogos = { ...logos, [variant]: url };
    setLogos(nextLogos);
    try {
      const res = await fetch(`/api/sm/clients/${savedClient.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logos: nextLogos }),
      });
      const updated = (await res.json()) as SMClient;
      if (res.ok) setSavedClient(updated);
    } catch {
      /* upload already saved via assets route */
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-6">
      <h2 className={sectionTitle}>Brand profile</h2>

      <div className="flex flex-col gap-2">
        <label htmlFor="brand-name" className={label}>
          Name
        </label>
        <input
          id="brand-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className={field}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="tagline" className={label}>
          Tagline
        </label>
        <input id="tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} className={field} />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="usp" className={label}>
          What makes you different
        </label>
        <textarea
          id="usp"
          value={usp}
          onChange={(e) => setUsp(e.target.value)}
          rows={2}
          className={`${field} resize-none`}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="location" className={label}>
          Target location
        </label>
        <input
          id="location"
          value={audienceLocation}
          onChange={(e) => setAudienceLocation(e.target.value)}
          className={field}
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className={label}>Tone</span>
        <div className="flex flex-wrap gap-2">
          {TONES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTone(t)}
              className={`${chip} capitalize ${tone === t ? chipActive : "hover:border-zinc-700"}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {!hasBrandKit && (
        <div className="flex flex-col gap-2">
          <label htmlFor="primary-color" className={label}>
            Primary color
          </label>
          <input
            id="primary-color"
            type="color"
            value={colors[0]?.hex ?? "#000000"}
            onChange={(e) =>
              setColors([{ hex: e.target.value, label: "primary" }, ...colors.slice(1)])
            }
            className="h-9 w-16 cursor-pointer rounded-lg border border-zinc-800 bg-transparent"
          />
        </div>
      )}

      <div className="rounded-xl border border-zinc-800/80 p-4">
        <div className="mb-1 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-100">Brand Kit</p>
            <p className="text-xs text-zinc-500">Logos, colours, typography, photo style</p>
          </div>
          <button
            type="button"
            onClick={() => setHasBrandKit((prev) => !prev)}
            className={`relative h-5 w-10 rounded-full transition-colors ${hasBrandKit ? "bg-violet-600" : "bg-zinc-700"}`}
            aria-pressed={hasBrandKit}
          >
            <span
              className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${hasBrandKit ? "translate-x-5" : ""}`}
            />
          </button>
        </div>

        {hasBrandKit && (
          <div className="mt-4 flex flex-col gap-4 border-t border-zinc-800/80 pt-4">
            {savedClient && (
              <div className="flex flex-col gap-2">
                <span className={label}>Logo variants</span>
                <p className="text-xs leading-relaxed text-zinc-600">{LOGO_UPLOAD_HINT}</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {LOGO_VARIANTS.map((variant) => (
                    <LogoVariantUploader
                      key={variant}
                      label={variant}
                      clientId={savedClient.id}
                      value={logos[variant]}
                      onUpload={(url) => void handleLogoVariantUpload(variant, url)}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <span className={label}>Colour palette</span>
              <div className="grid grid-cols-5 gap-2">
                {COLOR_ROLES.map((role) => (
                  <div key={role} className="flex flex-col items-center gap-1">
                    <input
                      type="color"
                      value={colorPalette[role] ?? "#000000"}
                      onChange={(e) =>
                        setColorPalette((prev) => ({ ...prev, [role]: e.target.value }))
                      }
                      className="h-8 w-8 cursor-pointer rounded border-0 bg-transparent"
                    />
                    <span className="text-[10px] capitalize text-zinc-500">{role}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-500">Headline font</label>
                <input
                  value={fontPrimary}
                  onChange={(e) => setFontPrimary(e.target.value)}
                  placeholder="e.g. Lora"
                  className={field}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-500">Body font</label>
                <input
                  value={fontSecondary}
                  onChange={(e) => setFontSecondary(e.target.value)}
                  placeholder="e.g. Lato"
                  className={field}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className={label}>Photography style</span>
              <div className="grid grid-cols-3 gap-2">
                {PHOTO_STYLES.map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => setPhotoStyle(style)}
                    className={`${chip} capitalize ${photoStyle === style ? chipActive : "hover:border-zinc-700"}`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className={label}>Brand voice</span>
              <textarea
                value={voiceDescription}
                onChange={(e) => setVoiceDescription(e.target.value)}
                placeholder="Describe how the brand speaks — warm but not sentimental, scientific but accessible…"
                rows={3}
                className={`${field} resize-none`}
              />
            </div>
          </div>
        )}
      </div>

      {savedClient && !hasBrandKit && (
        <LogoUploader
          clientId={savedClient.id}
          initialPreviewUrl={savedClient.logo_url ?? savedClient.logos?.primary}
          onUploaded={(url) => {
            setSavedClient((prev) =>
              prev ? { ...prev, logo_url: url, logos: { ...prev.logos, primary: url } } : prev
            );
            onLogoUploaded?.();
          }}
        />
      )}

      {savedClient && (
        <LogoReadinessPanel
          client={savedClient}
          includeLogo={includeLogo}
          onIncludeLogoChange={setIncludeLogo}
          onValidationChange={(state) => setLogoReady(state.ready)}
        />
      )}

      {error && <p className="text-sm text-red-400/90">{error}</p>}

      {!savedClient ? (
        <button type="submit" disabled={loading || !name} className={`${btnPrimary} w-fit`}>
          {loading ? "Saving…" : "Save brand"}
        </button>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-zinc-500">
            {initial?.id
              ? "Update brand kit fields, then continue."
              : "Brand saved. Add logos if needed, then continue."}
          </p>
          {includeLogo && !logoReady && (
            <p className="text-xs text-amber-400/90">
              Upload and verify a working logo, or uncheck &ldquo;Include logo&rdquo; to continue.
            </p>
          )}
          <button
            type="button"
            onClick={() => {
              void (async () => {
                setLoading(true);
                try {
                  const client = await persistClient(savedClient.id);
                  onSave(client, { includeLogo });
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Save failed");
                } finally {
                  setLoading(false);
                }
              })();
            }}
            disabled={loading || (includeLogo && !logoReady)}
            className={`${btnPrimary} w-fit`}
          >
            {loading ? "Saving…" : "Continue"}
          </button>
        </div>
      )}
    </form>
  );
}
