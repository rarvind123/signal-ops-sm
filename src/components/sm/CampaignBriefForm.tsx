"use client";

import { useEffect, useState } from "react";
import {
  btnPrimary,
  chip,
  chipActive,
  field,
  label,
  sectionSub,
  sectionTitle,
} from "@/lib/sm/ui";
import type { SMCampaign, SMCampaignObjective, SMClient, SMPlatform } from "@/types/sm";
import { apiUrl } from "@/lib/base-path";

const OBJECTIVES: { key: SMCampaignObjective; label: string }[] = [
  { key: "awareness", label: "Brand awareness" },
  { key: "engagement", label: "Engagement" },
  { key: "conversion", label: "Conversions" },
  { key: "launch", label: "Product launch" },
  { key: "retention", label: "Retention" },
  { key: "event", label: "Event" },
];

const DURATIONS = [
  { days: 7, label: "1 week" },
  { days: 14, label: "2 weeks" },
  { days: 30, label: "30 days" },
  { days: 60, label: "60 days" },
  { days: 90, label: "90 days" },
];

const PLATFORMS: { key: SMPlatform; label: string }[] = [
  { key: "instagram", label: "Instagram" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "facebook", label: "Facebook" },
  { key: "twitter", label: "X" },
];

export default function CampaignBriefForm({
  client,
  onSubmit,
}: {
  client: SMClient;
  onSubmit: (campaign: SMCampaign) => void;
}) {
  const [name, setName] = useState("");
  const [objective, setObjective] = useState<SMCampaignObjective>("awareness");
  const [duration, setDuration] = useState(30);
  const [productService, setProductService] = useState("");
  const [keyMessage, setKeyMessage] = useState("");
  const [offer, setOffer] = useState("");
  const [notes, setNotes] = useState("");
  const [platforms, setPlatforms] = useState<SMPlatform[]>(["instagram"]);
  const [loading, setLoading] = useState(false);
  const [lastCampaignLoaded, setLastCampaignLoaded] = useState(false);
  const [lastCampaign, setLastCampaign] = useState<SMCampaign | null>(null);
  const [restoredFromLast, setRestoredFromLast] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!client.id || lastCampaignLoaded) return;

    async function prefill() {
      try {
        const res = await fetch(apiUrl(`/api/sm/clients/${client.id}/last-campaign`));
        if (!res.ok) return;
        const last = (await res.json()) as SMCampaign | null;

        if (last) {
          setLastCampaign(last);
          setRestoredFromLast(true);
          if (last.objective) setObjective(last.objective);
          if (last.duration_days) setDuration(last.duration_days);
          if (last.product_service) setProductService(last.product_service);
          if (last.key_message) setKeyMessage(last.key_message);
          if (last.offer) setOffer(last.offer);
          if (last.platforms?.length) setPlatforms(last.platforms);
          if (last.additional_notes) setNotes(last.additional_notes);
        } else if (client.social_handles) {
          const activePlatforms = Object.keys(client.social_handles).filter(
            (p) => client.social_handles[p as SMPlatform]
          ) as SMPlatform[];
          if (activePlatforms.length > 0) setPlatforms(activePlatforms);
          if (client.usp) setKeyMessage(client.usp);
        }
      } catch {
        // silently fail — form still works empty
      } finally {
        setLastCampaignLoaded(true);
      }
    }

    void prefill();
  }, [client.id, client.social_handles, client.usp, lastCampaignLoaded]);

  const togglePlatform = (p: SMPlatform) =>
    setPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || platforms.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl("/api/sm/campaigns"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: client.id,
          name,
          objective,
          duration_days: duration,
          product_service: productService,
          key_message: keyMessage,
          offer,
          platforms,
          additional_notes: notes,
        }),
      });
      const campaign = (await res.json()) as SMCampaign & { error?: string };
      if (!res.ok) throw new Error(campaign.error ?? "Failed to create campaign");

      const strategyRes = await fetch(apiUrl(`/api/sm/campaigns/${campaign.id}/strategy`), {
        method: "POST",
      });
      const strategyJson = (await strategyRes.json()) as {
        error?: string;
        narrative_theme?: string;
        story_arc?: { description?: string }[];
        content_mix?: Record<string, number>;
      };
      if (!strategyRes.ok) {
        throw new Error(strategyJson.error ?? "Strategy generation failed");
      }
      if (!strategyJson.narrative_theme?.trim()) {
        throw new Error(
          "Strategy generation returned empty — please try again. Your campaign was saved."
        );
      }
      const mixTotal = Object.values(strategyJson.content_mix ?? {}).reduce(
        (sum, count) => sum + (count ?? 0),
        0
      );
      if (
        (strategyJson.story_arc?.length ?? 0) < 2 ||
        mixTotal === 0 ||
        strategyJson.story_arc?.some((phase) =>
          phase.description?.includes('"phase"')
        )
      ) {
        throw new Error(
          "Strategy generation returned malformed data — open the strategy page and regenerate. Your campaign was saved."
        );
      }

      onSubmit(campaign);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-6">
      <div>
        <h2 className={sectionTitle}>Campaign brief</h2>
        <p className={`${sectionSub} mt-1`}>{client.name}</p>
        {lastCampaignLoaded && restoredFromLast && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-zinc-600">
            <span>↺</span>
            Pre-filled from your last campaign — edit anything that&apos;s changed
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="campaign-name" className={label}>
          Campaign name
        </label>
        <input
          id="campaign-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder={
            lastCampaign
              ? `e.g. ${client.name} – New Campaign`
              : "e.g. Summer Sale 2026"
          }
          className={field}
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className={label}>Objective</span>
        <div className="flex flex-wrap gap-2">
          {OBJECTIVES.map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() => setObjective(o.key)}
              className={`${chip} ${objective === o.key ? chipActive : "hover:border-zinc-700"}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className={label}>Duration</span>
        <div className="flex flex-wrap gap-2">
          {DURATIONS.map((d) => (
            <button
              key={d.days}
              type="button"
              onClick={() => setDuration(d.days)}
              className={`${chip} ${duration === d.days ? chipActive : "hover:border-zinc-700"}`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="product" className={label}>
          Product / service
        </label>
        <input
          id="product"
          value={productService}
          onChange={(e) => setProductService(e.target.value)}
          className={field}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="key-message" className={label}>
          Key message
        </label>
        <textarea
          id="key-message"
          value={keyMessage}
          onChange={(e) => setKeyMessage(e.target.value)}
          rows={2}
          className={`${field} resize-none`}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="offer" className={label}>
          Offer
        </label>
        <input id="offer" value={offer} onChange={(e) => setOffer(e.target.value)} className={field} />
      </div>

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

      <div className="flex flex-col gap-2">
        <label htmlFor="notes" className={label}>
          Additional notes
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className={`${field} resize-none`}
        />
      </div>

      {error && <p className="text-sm text-red-400/90">{error}</p>}

      <button
        type="submit"
        disabled={!name.trim() || platforms.length === 0 || loading}
        className={`${btnPrimary} w-fit`}
      >
        {loading ? "Building strategy…" : "Create campaign"}
      </button>
    </form>
  );
}
