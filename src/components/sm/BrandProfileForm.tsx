"use client";

import { useState } from "react";
import type { SMClient, SMTone } from "@/types/sm";
import LogoUploader from "./LogoUploader";

const TONES: SMTone[] = ["bold", "warm", "premium", "playful", "professional", "urgent"];

export default function BrandProfileForm({
  onSave,
  initial,
}: {
  onSave: (c: SMClient) => void;
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
    <form onSubmit={(e) => void handleSubmit(e)} className="flex max-w-xl flex-col gap-4">
      <h2 className="text-lg font-semibold text-white">Brand Profile</h2>

      <div className="flex flex-col gap-1">
        <label className="text-sm text-zinc-400">Brand Name *</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm text-zinc-400">Tagline</label>
        <input
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm text-zinc-400">USP / What makes you different</label>
        <textarea
          value={usp}
          onChange={(e) => setUsp(e.target.value)}
          rows={2}
          className="resize-none rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm text-zinc-400">Target location</label>
        <input
          value={audienceLocation}
          onChange={(e) => setAudienceLocation(e.target.value)}
          className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm text-zinc-400">Tone</label>
        <div className="flex flex-wrap gap-2">
          {TONES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTone(t)}
              className={`rounded-full border px-3 py-1 text-xs ${
                tone === t
                  ? "border-blue-500 bg-blue-500/10 text-blue-400"
                  : "border-zinc-700 text-zinc-400"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm text-zinc-400">Primary color</label>
        <input
          type="color"
          value={colors[0]?.hex ?? "#000000"}
          onChange={(e) =>
            setColors([{ hex: e.target.value, label: "primary" }, ...colors.slice(1)])
          }
          className="h-10 w-20 cursor-pointer rounded border border-zinc-700 bg-zinc-800"
        />
      </div>

      {savedClient && (
        <LogoUploader
          clientId={savedClient.id}
          onUploaded={(url) => setSavedClient((prev) => (prev ? { ...prev, logo_url: url } : prev))}
        />
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      {!savedClient ? (
        <button
          type="submit"
          disabled={loading || !name}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Brand Profile"}
        </button>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-emerald-400">Brand saved. Upload a logo (optional), then continue.</p>
          <button
            type="button"
            onClick={() => onSave(savedClient)}
            className="rounded bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
          >
            Continue to Brief →
          </button>
        </div>
      )}
    </form>
  );
}
