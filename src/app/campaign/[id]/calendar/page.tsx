"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import CampaignCalendarView from "@/components/sm/CampaignCalendarView";
import CampaignNav from "@/components/sm/CampaignNav";
import { parseBriefsResponse } from "@/lib/sm/briefs-api";
import { btnPrimary, sectionTitle } from "@/lib/sm/ui";
import type {
  SMCampaign,
  SMCampaignCalendarItem,
  SMCampaignStrategy,
  SMCreativeBrief,
} from "@/types/sm";

export default function CampaignCalendarPage() {
  const params = useParams();
  const id = params.id as string;
  const [campaign, setCampaign] = useState<SMCampaign | null>(null);
  const [strategy, setStrategy] = useState<SMCampaignStrategy | null>(null);
  const [items, setItems] = useState<SMCampaignCalendarItem[]>([]);
  const [briefs, setBriefs] = useState<SMCreativeBrief[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [batchRetrying, setBatchRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const briefsReady = briefs.filter((b) => b.scene_description?.trim()).length;
  const batchRunning = items.length > 0 && briefsReady < items.length;
  const approvedCount = briefs.filter((b) => b.approved === true).length;
  const reviewedCount = briefs.filter(
    (b) => b.approved !== null && b.approved !== undefined
  ).length;

  const loadBriefs = useCallback(async () => {
    const res = await fetch(`/api/sm/campaigns/${id}/briefs`);
    if (res.ok) {
      setBriefs(await parseBriefsResponse(res));
    }
    return res.ok;
  }, [id]);

  useEffect(() => {
    void (async () => {
      const [campRes, calRes] = await Promise.all([
        fetch(`/api/sm/campaigns/${id}`),
        fetch(`/api/sm/campaigns/${id}/calendar`),
      ]);
      if (campRes.ok) {
        const data = (await campRes.json()) as {
          campaign: SMCampaign;
          strategy: SMCampaignStrategy | null;
        };
        setCampaign(data.campaign);
        setStrategy(data.strategy);
      }
      if (calRes.ok) {
        setItems((await calRes.json()) as SMCampaignCalendarItem[]);
      }
      await loadBriefs();
      setLoading(false);
    })();
  }, [id, loadBriefs]);

  useEffect(() => {
    if (!batchRunning) return;
    const interval = setInterval(() => {
      void loadBriefs();
    }, 3000);
    return () => clearInterval(interval);
  }, [batchRunning, loadBriefs]);

  async function handleGenerateCalendar() {
    setCalendarLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/sm/campaigns/${id}/calendar`, { method: "POST" });
      const json = (await res.json()) as { items?: SMCampaignCalendarItem[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Calendar generation failed");
      setItems(json.items ?? []);
      void loadBriefs();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Calendar generation failed");
    } finally {
      setCalendarLoading(false);
    }
  }

  async function handleRetryBatch() {
    setBatchRetrying(true);
    setError(null);
    try {
      const res = await fetch(`/api/sm/campaigns/${id}/briefs/batch`, { method: "POST" });
      const json = (await res.json()) as { error?: string; errors?: string[] };
      if (!res.ok) throw new Error(json.error ?? "Batch brief generation failed");
      if (json.errors?.length) {
        setError(`${json.errors.length} brief(s) failed — retry or review partial results.`);
      }
      await loadBriefs();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Batch brief generation failed");
    } finally {
      setBatchRetrying(false);
    }
  }

  if (loading) return <p className="px-6 py-12 text-sm text-zinc-600">Loading…</p>;
  if (!campaign) {
    return (
      <div className="min-h-screen px-6 py-8 sm:px-10 sm:py-12">
        <div className="mx-auto max-w-2xl">
          <p className="text-sm text-red-400/90">Campaign not found.</p>
          <p className="mt-2 text-sm text-zinc-500">
            Check the campaign link — the ID may be wrong.{" "}
            <Link href="/" className="text-zinc-300 hover:underline">
              Start from home
            </Link>
          </p>
        </div>
      </div>
    );
  }

  const hasStrategy = Boolean(strategy?.narrative_theme?.trim());
  const expectedPosts = Object.values(strategy?.content_mix ?? {}).reduce(
    (sum, count) => sum + (count ?? 0),
    0
  );
  const isCalendarIncomplete =
    expectedPosts > 0 && items.length > 0 && items.length < expectedPosts;

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
        <h1 className={sectionTitle}>Calendar</h1>

        {error && (
          <p className="rounded-lg border border-red-500/10 bg-red-500/5 px-4 py-3 text-sm text-red-400/90">
            {error}
          </p>
        )}

        {isCalendarIncomplete && (
          <div className="rounded-lg border border-amber-500/10 bg-amber-500/5 px-4 py-4">
            <p className="text-sm text-amber-200/90">
              Calendar is incomplete — {items.length} of {expectedPosts} posts. Regenerate to
              fill the full schedule before reviewing briefs.
            </p>
            <button
              type="button"
              onClick={() => void handleGenerateCalendar()}
              disabled={calendarLoading}
              className={`${btnPrimary} mt-3`}
            >
              {calendarLoading ? "Planning calendar…" : "Regenerate calendar"}
            </button>
          </div>
        )}

        {items.length === 0 ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-zinc-500">No calendar yet.</p>
            {hasStrategy ? (
              <button
                type="button"
                onClick={() => void handleGenerateCalendar()}
                disabled={calendarLoading}
                className={`${btnPrimary} w-fit`}
              >
                {calendarLoading ? "Planning calendar…" : "Generate calendar"}
              </button>
            ) : (
              <p className="text-sm text-zinc-500">
                <Link href={`/campaign/${id}/strategy`} className="text-zinc-300 hover:underline">
                  Generate strategy first
                </Link>
              </p>
            )}
          </div>
        ) : (
          <CampaignCalendarView
            items={items}
            campaignId={id}
            briefsReady={briefsReady}
            briefsTotal={items.length}
            approvedCount={approvedCount}
            reviewedCount={reviewedCount}
            batchRunning={batchRunning}
            onRetryBatch={() => void handleRetryBatch()}
            batchRetrying={batchRetrying}
          />
        )}
      </div>
    </div>
  );
}
