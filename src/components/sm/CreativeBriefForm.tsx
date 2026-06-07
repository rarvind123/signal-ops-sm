"use client";

import { useState } from "react";
import { CREATIVE_LENSES } from "@/lib/sm/creative-lenses-ui";
import {
  btnPrimary,
  chip,
  chipActive,
  field,
  label,
  sectionSub,
  sectionTitle,
  select,
  SIGNALOPS_TM,
} from "@/lib/sm/ui";
import type {
  SMClient,
  SMCreativeFormat,
  SMCreativeLens,
  SMGoal,
  SMPlatform,
  SMCreativeRequest,
} from "@/types/sm";
import ImageUploader from "./ImageUploader";

const GOALS: { key: SMGoal; label: string }[] = [
  { key: "offer", label: "Promote offer" },
  { key: "launch", label: "Product launch" },
  { key: "awareness", label: "Brand awareness" },
  { key: "event", label: "Event" },
  { key: "cta", label: "Drive action" },
  { key: "testimonial", label: "Testimonial" },
];

const PLATFORMS: { key: SMPlatform; label: string }[] = [
  { key: "instagram", label: "Instagram" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "facebook", label: "Facebook" },
  { key: "twitter", label: "X" },
];

export default function CreativeBriefForm({
  client,
  activeFormat,
  onSubmit,
}: {
  client: SMClient;
  activeFormat: SMCreativeFormat;
  onSubmit: (request: SMCreativeRequest) => Promise<void>;
}) {
  const isSocial = activeFormat === "social_media";
  const [brief, setBrief] = useState("");
  const [mustInclude, setMustInclude] = useState("");
  const [mustExclude, setMustExclude] = useState("");
  const [goal, setGoal] = useState<SMGoal>("awareness");
  const [creativeLens, setCreativeLens] = useState<SMCreativeLens>("signalops");
  const [platforms, setPlatforms] = useState<SMPlatform[]>(["instagram"]);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedLens = CREATIVE_LENSES.find((l) => l.id === creativeLens);

  const togglePlatform = (p: SMPlatform) =>
    setPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!brief.trim() || (isSocial && platforms.length === 0)) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sm/creative-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: client.id,
          brief_text: brief,
          goal,
          platforms: isSocial ? platforms : ["instagram"],
          uploaded_image_urls: uploadedUrls,
          must_include: mustInclude.trim() || undefined,
          must_exclude: mustExclude.trim() || undefined,
          creative_lens: creativeLens,
          creative_format: activeFormat,
        }),
      });
      const request = (await res.json()) as SMCreativeRequest & { error?: string };
      if (!res.ok) throw new Error(request.error ?? "Request failed");
      await onSubmit(request);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-8">
      <div>
        <h2 className={sectionTitle}>Brief</h2>
        <p className={`${sectionSub} mt-1`}>{client.name}</p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="brief-text" className={label}>
          What do you want to create?
        </label>
        <textarea
          id="brief-text"
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder="e.g. Promote our free yoga class happening this Saturday..."
          rows={4}
          required
          className={`${field} resize-none`}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="must-include" className={label}>
            Must include <span className="normal-case tracking-normal text-zinc-600">(optional)</span>
          </label>
          <textarea
            id="must-include"
            value={mustInclude}
            onChange={(e) => setMustInclude(e.target.value)}
            placeholder="e.g. baby's face, forest background, product bottle, specific colour…"
            rows={2}
            className={`${field} resize-none`}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="must-exclude" className={label}>
            Must not show <span className="normal-case tracking-normal text-zinc-600">(optional)</span>
          </label>
          <textarea
            id="must-exclude"
            value={mustExclude}
            onChange={(e) => setMustExclude(e.target.value)}
            placeholder="e.g. hands, people, stock photo feel, chess pieces, corporate look…"
            rows={2}
            className={`${field} resize-none`}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="goal" className={label}>
          Goal
        </label>
        <div className="relative">
          <select
            id="goal"
            value={goal}
            onChange={(e) => setGoal(e.target.value as SMGoal)}
            className={`${select} pr-10`}
          >
            {GOALS.map((g) => (
              <option key={g.key} value={g.key} className="bg-zinc-950">
                {g.label}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-600">
            ▾
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="creative-lens" className={label}>
          Creative approach
        </label>
        <div className="relative">
          <select
            id="creative-lens"
            value={creativeLens}
            onChange={(e) => setCreativeLens(e.target.value as SMCreativeLens)}
            className={`${select} pr-10`}
          >
            {CREATIVE_LENSES.map((lens) => (
              <option key={lens.id} value={lens.id} className="bg-zinc-950">
                {lens.name}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-600">
            ▾
          </span>
        </div>
        {selectedLens && creativeLens !== "signalops" && (
          <p className="text-sm leading-relaxed text-zinc-500">{selectedLens.description}</p>
        )}
      </div>

      {isSocial && (
        <div className="flex flex-col gap-2">
          <span className={label}>Platforms</span>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => togglePlatform(p.key)}
                className={`${chip} ${platforms.includes(p.key) ? chipActive : "hover:border-zinc-700"}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <ImageUploader
        clientId={client.id}
        onUpload={(urls) => setUploadedUrls(urls)}
      />

      {error && <p className="text-sm text-red-400/90">{error}</p>}

      <button
        type="submit"
        disabled={loading || !brief.trim() || (isSocial && platforms.length === 0)}
        className={`${btnPrimary} w-fit`}
      >
        {loading ? "Analyzing…" : `Run ${SIGNALOPS_TM}`}
      </button>
    </form>
  );
}
