"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import CampaignNav from "@/components/sm/CampaignNav";
import CampaignStrategyCard from "@/components/sm/CampaignStrategyCard";
import StrategyProtected from "@/components/sm/StrategyProtected";
import { btnPrimary, sectionTitle } from "@/lib/sm/ui";
import {
  contentMixTotal,
  isStrategyCorrupted,
} from "@/lib/sm/campaign-strategy-utils";
import type { SMCampaign, SMCampaignStrategy } from "@/types/sm";
import { apiUrl } from "@/lib/base-path";

function isStrategyEmpty(strategy: SMCampaignStrategy): boolean {
  return (
    !strategy.narrative_theme?.trim() &&
    strategy.story_arc.length === 0 &&
    strategy.content_pillars.length === 0 &&
    Object.keys(strategy.content_mix).length === 0
  );
}

function isStrategyBroken(strategy: SMCampaignStrategy): boolean {
  return (
    isStrategyCorrupted(strategy) ||
    (Boolean(strategy.narrative_theme?.trim()) &&
      (strategy.story_arc.length < 2 || contentMixTotal(strategy.content_mix) === 0))
  );
}

export default function CampaignStrategyPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [campaign, setCampaign] = useState<SMCampaign | null>(null);
  const [strategy, setStrategy] = useState<SMCampaignStrategy | null>(null);
  const [calendarCount, setCalendarCount] = useState(0);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [regenerateLoading, setRegenerateLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const [campRes, stratRes] = await Promise.all([
        fetch(apiUrl(`/api/sm/campaigns/${id}`)),
        fetch(apiUrl(`/api/sm/campaigns/${id}/strategy`)),
      ]);
      if (campRes.ok) {
        const data = (await campRes.json()) as {
          campaign: SMCampaign;
          calendar_count: number;
        };
        setCampaign(data.campaign);
        setCalendarCount(data.calendar_count);
      }
      if (stratRes.ok) {
        setStrategy((await stratRes.json()) as SMCampaignStrategy);
      }
      setLoading(false);
    })();
  }, [id]);

  async function handleRegenerateStrategy() {
    setRegenerateLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl(`/api/sm/campaigns/${id}/strategy`), { method: "POST" });
      const json = (await res.json()) as SMCampaignStrategy & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Strategy generation failed");
      if (isStrategyEmpty(json)) {
        throw new Error("Strategy came back empty — please try again.");
      }
      setStrategy(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Strategy generation failed");
    } finally {
      setRegenerateLoading(false);
    }
  }

  async function handleGenerateCalendar() {
    setCalendarLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl(`/api/sm/campaigns/${id}/calendar`), { method: "POST" });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Calendar generation failed");
      router.push(`/campaign/${id}/calendar`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Calendar generation failed");
    } finally {
      setCalendarLoading(false);
    }
  }

  if (loading) return <p className="px-6 py-12 text-sm text-zinc-600">Loading…</p>;
  if (!strategy) {
    return (
      <p className="px-6 py-12 text-sm text-zinc-500">
        No strategy yet.{" "}
        <Link href="/" className="text-zinc-300 hover:underline">
          Create a campaign
        </Link>
      </p>
    );
  }

  return (
    <div className="min-h-screen px-6 py-8 sm:px-10 sm:py-12">
      <div className="mx-auto flex max-w-2xl flex-col gap-8">
        <header>
          <Image
            src="/inventious-logo.png"
            alt="inventious"
            width={378}
            height={118}
            className="h-8 w-auto object-contain object-left"
          />
        </header>
        <CampaignNav campaignId={id} />
        <h1 className={sectionTitle}>{campaign?.name ?? "Campaign"} strategy</h1>

        {error && (
          <p className="rounded-lg border border-red-500/10 bg-red-500/5 px-4 py-3 text-sm text-red-400/90">
            {error}
          </p>
        )}

        {(isStrategyEmpty(strategy) || isStrategyBroken(strategy)) && (
          <div className="rounded-lg border border-amber-500/10 bg-amber-500/5 px-4 py-4">
            <p className="text-sm text-amber-200/90">
              {isStrategyEmpty(strategy)
                ? "Strategy generation didn't return content — this can happen if the AI call failed silently."
                : "Strategy data looks malformed (raw JSON in story arc or missing content mix)."}
              {" "}Regenerate to try again.
            </p>
            <button
              type="button"
              onClick={() => void handleRegenerateStrategy()}
              disabled={regenerateLoading}
              className={`${btnPrimary} mt-3`}
            >
              {regenerateLoading ? "Regenerating…" : "Regenerate strategy"}
            </button>
          </div>
        )}

        <StrategyProtected className="flex flex-col gap-8">
          <CampaignStrategyCard
            strategy={strategy}
            onGenerateCalendar={() => void handleGenerateCalendar()}
            calendarLoading={calendarLoading}
            hasCalendar={calendarCount > 0}
            canGenerateCalendar={!isStrategyBroken(strategy)}
          />
          {calendarCount > 0 && (
            <Link
              href={`/campaign/${id}/calendar`}
              className="text-sm text-zinc-500 hover:text-zinc-300"
            >
              View calendar →
            </Link>
          )}
        </StrategyProtected>
      </div>
    </div>
  );
}
