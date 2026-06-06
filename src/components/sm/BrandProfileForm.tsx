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
import type { SMClient, SMTone } from "@/types/sm";
import LogoUploader from "./LogoUploader";

const TONES: SMTone[] = ["bold", "warm", "premium", "playful", "professional", "urgent"];

export default function BrandProfileForm({
  onSave,
  onLogoUploaded,
  initial,
}: {
  onSave: (c: SMClient) => void;
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
  const [savedClient, setSavedClient] = useState<SMClient | null>(
    initial?.id ? (initial as SMClient) : null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sm/clients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          tagline,
          usp,
          tone,
          brand_colors: colors,
          target_audience: { location: audienceLocation || undefined },
        }),
      });
      const client = (await res.json()) as SMClient & { error?: string };
      if (!res.ok) throw new Error(client.error ?? "Save failed");
      setSavedClient(client);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setLoading(false);
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
        <input
          id="tagline"
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          className={field}
        />
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

      {savedClient && (
        <LogoUploader
          clientId={savedClient.id}
          onUploaded={(url) => {
            setSavedClient((prev) => (prev ? { ...prev, logo_url: url } : prev));
            onLogoUploaded?.();
          }}
        />
      )}

      {error && <p className="text-sm text-red-400/90">{error}</p>}

      {!savedClient ? (
        <button
          type="submit"
          disabled={loading || !name}
          className={`${btnPrimary} w-fit`}
        >
          {loading ? "Saving…" : "Save brand"}
        </button>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-zinc-500">
            {initial?.id
              ? "Upload or replace the logo, then continue."
              : "Brand saved. Add a logo if you like, then continue."}
          </p>
          <button
            type="button"
            onClick={() => onSave(savedClient)}
            className={`${btnPrimary} w-fit`}
          >
            Continue
          </button>
        </div>
      )}
    </form>
  );
}
