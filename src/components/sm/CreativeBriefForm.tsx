"use client";

import { useEffect, useState } from "react";
import {
  buildMarketContextSummary,
  type MetaMarketAd,
} from "@/lib/sm/market-reference";
import { getSizesForFormat } from "@/lib/sm/ad-sizes";
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
  const needsAdSize = activeFormat === "print_ad" || activeFormat === "outdoor";
  const [selectedSizeId, setSelectedSizeId] = useState("");
  const [brief, setBrief] = useState("");
  const [mustInclude, setMustInclude] = useState("");
  const [mustExclude, setMustExclude] = useState("");
  const [goal, setGoal] = useState<SMGoal>("awareness");
  const [creativeLens, setCreativeLens] = useState<SMCreativeLens>("signalops");
  const [platforms, setPlatforms] = useState<SMPlatform[]>(["instagram"]);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [marketAds, setMarketAds] = useState<MetaMarketAd[]>([]);
  const [marketSource, setMarketSource] = useState<"meta" | "ai" | null>(null);
  const [loadingMarket, setLoadingMarket] = useState(false);
  const [marketSearched, setMarketSearched] = useState(false);

  const selectedLens = CREATIVE_LENSES.find((l) => l.id === creativeLens);

  async function searchMarketAds() {
    if (!client.name || marketSearched) return;
    setLoadingMarket(true);
    try {
      const params = new URLSearchParams({
        brand: client.name,
        category: client.usp ?? "",
      });
      const res = await fetch(`/api/sm/market-reference?${params}`);
      const data = (await res.json()) as {
        ads?: MetaMarketAd[];
        source?: "meta" | "ai";
      };
      setMarketAds(data.ads ?? []);
      setMarketSource(data.source ?? null);
      setMarketSearched(true);
    } catch {
      // silently fail
    } finally {
      setLoadingMarket(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (brief.length > 20 && !marketSearched) void searchMarketAds();
    }, 1500);
    return () => clearTimeout(timer);
  }, [brief, marketSearched, client.name]);

  useEffect(() => {
    setSelectedSizeId("");
  }, [activeFormat]);

  const togglePlatform = (p: SMPlatform) =>
    setPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (
      !brief.trim() ||
      (isSocial && platforms.length === 0) ||
      (needsAdSize && !selectedSizeId)
    )
      return;
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
          market_context:
            marketAds.length > 0
              ? buildMarketContextSummary(marketAds, marketSource ?? "meta")
              : undefined,
          ad_size_id: selectedSizeId || undefined,
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

      {needsAdSize && (
        <div className="flex flex-col gap-2">
          <span className={label}>
            {activeFormat === "print_ad" ? "Print size" : "Format / size"}
          </span>
          <div className="grid grid-cols-2 gap-2">
            {getSizesForFormat(activeFormat).map((size) => (
              <button
                key={size.id}
                type="button"
                onClick={() => setSelectedSizeId(size.id)}
                className={`rounded-lg border px-3 py-2.5 text-left transition-all ${
                  selectedSizeId === size.id
                    ? "border-violet-500 bg-violet-500/10"
                    : "border-zinc-700 hover:border-zinc-600"
                }`}
              >
                <p
                  className={`text-xs font-medium ${
                    selectedSizeId === size.id ? "text-violet-300" : "text-zinc-300"
                  }`}
                >
                  {size.label}
                </p>
                <p className="mt-0.5 text-xs text-zinc-600">{size.dimensions}</p>
                <p className="mt-0.5 truncate text-xs text-zinc-700">{size.common_use}</p>
              </button>
            ))}
          </div>
          {selectedSizeId && (
            <p className="text-xs text-zinc-600">
              ↳ {getSizesForFormat(activeFormat).find((s) => s.id === selectedSizeId)?.common_use}
            </p>
          )}
        </div>
      )}

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
        {loadingMarket && (
          <p className="text-xs text-zinc-600">Checking what&apos;s running in market…</p>
        )}
        {marketAds.length > 0 && (
          <div className="flex flex-col gap-2">
            {marketSource === "ai" && (
              <p className="mb-2 flex items-center gap-1 text-xs text-zinc-600">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500/60" />
                AI-generated market context (connect Meta Ad Library for live data)
              </p>
            )}
            {marketSource === "meta" && (
              <p className="mb-2 flex items-center gap-1 text-xs text-zinc-600">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500/60" />
                Live Meta Ad Library
              </p>
            )}
            <p className="text-xs text-zinc-500">
              What&apos;s currently running — SignalOps will differentiate from these
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {marketAds.slice(0, 6).map((ad) => (
                <div
                  key={ad.id}
                  className="flex-shrink-0 w-20 overflow-hidden rounded border border-zinc-700 bg-zinc-800"
                >
                  {ad.snapshot?.images?.[0]?.original_image_url && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={ad.snapshot.images[0].original_image_url}
                      alt=""
                      className="h-20 w-full object-cover"
                    />
                  )}
                  <p className="truncate px-1.5 py-1 text-xs text-zinc-500">{ad.page_name}</p>
                </div>
              ))}
            </div>
          </div>
        )}
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
        disabled={
          loading ||
          !brief.trim() ||
          (isSocial && platforms.length === 0) ||
          (needsAdSize && !selectedSizeId)
        }
        className={`${btnPrimary} w-fit`}
      >
        {loading ? "Analyzing…" : `Run ${SIGNALOPS_TM}`}
      </button>
    </form>
  );
}
