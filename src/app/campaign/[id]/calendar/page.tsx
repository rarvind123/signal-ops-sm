"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import CampaignCalendarView from "@/components/sm/CampaignCalendarView";
import CampaignNav from "@/components/sm/CampaignNav";
import { btnPrimary, sectionTitle } from "@/lib/sm/ui";
import type {
  SMCampaign,
  SMCampaignCalendarItem,
  SMCampaignStrategy,
  SMCreativeBrief,
} from "@/types/sm";

export default function CampaignCalendarPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [campaign, setCampaign] = useState<SMCampaign | null>(null);
  const [strategy, setStrategy] = useState<SMCampaignStrategy | null>(null);
  const [items, setItems] = useState<SMCampaignCalendarItem[]>([]);
  const [briefs, setBriefs] = useState<SMCreativeBrief[]>([]);
  const [briefsLoading, setBriefsLoading] = useState(false);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [creativesLoading, setCreativesLoading] = useState(false);
  const [creativesProgress, setCreativesProgress] = useState<{ current: number; total: number } | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const hasBriefs = briefs.length > 0;
  const pendingCreatives = briefs.filter((b) => b.status !== "done").length;

  const loadBriefs = useCallback(async () => {
    const res = await fetch(`/api/sm/campaigns/${id}/briefs`);
    if (res.ok) {
      setBriefs((await res.json()) as SMCreativeBrief[]);
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

  async function handleGenerateCalendar() {
    setCalendarLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/sm/campaigns/${id}/calendar`, { method: "POST" });
      const json = (await res.json()) as { items?: SMCampaignCalendarItem[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Calendar generation failed");
      setItems(json.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Calendar generation failed");
    } finally {
      setCalendarLoading(false);
    }
  }

  async function ensureBriefs() {
    if (hasBriefs) return briefs;
    const res = await fetch(`/api/sm/campaigns/${id}/briefs`, { method: "POST" });
    const json = (await res.json()) as { briefs?: SMCreativeBrief[]; error?: string };
    if (!res.ok) throw new Error(json.error ?? "Brief generation failed");
    const created = json.briefs ?? [];
    setBriefs(created);
    return created;
  }

  async function handleGenerateBriefs() {
    setBriefsLoading(true);
    setError(null);
    try {
      await ensureBriefs();
      router.push(`/campaign/${id}/briefs`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Brief generation failed");
    } finally {
      setBriefsLoading(false);
    }
  }

  async function handleGenerateCreatives() {
    setCreativesLoading(true);
    setError(null);
    setCreativesProgress(null);
    try {
      const currentBriefs = await ensureBriefs();
      const pending = currentBriefs.filter((b) => b.status !== "done");
      if (pending.length === 0) {
        router.push(`/campaign/${id}/briefs`);
        return;
      }

      setCreativesProgress({ current: 0, total: pending.length });
      const failures: string[] = [];

      for (let i = 0; i < pending.length; i += 1) {
        const brief = pending[i];
        setCreativesProgress({ current: i, total: pending.length });
        const res = await fetch(`/api/sm/briefs/${brief.id}/generate`, { method: "POST" });
        if (!res.ok) {
          const json = (await res.json()) as { error?: string };
          failures.push(`Post #${brief.post_number}: ${json.error ?? "failed"}`);
        }
        setCreativesProgress({ current: i + 1, total: pending.length });
      }

      await loadBriefs();

      if (failures.length > 0) {
        throw new Error(
          failures.length === pending.length
            ? "Creative generation failed — please try again."
            : `${failures.length} of ${pending.length} creatives failed. View briefs to retry.`
        );
      }

      router.push(`/campaign/${id}/briefs`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Creative generation failed");
    } finally {
      setCreativesLoading(false);
      setCreativesProgress(null);
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
            onGenerateBriefs={() => void handleGenerateBriefs()}
            onGenerateCreatives={() => void handleGenerateCreatives()}
            briefsLoading={briefsLoading}
            creativesLoading={creativesLoading}
            creativesProgress={creativesProgress ?? undefined}
            hasBriefs={hasBriefs}
            pendingCreatives={pendingCreatives}
          />
        )}
        {hasBriefs && (
          <Link
            href={`/campaign/${id}/briefs`}
            className="text-sm text-zinc-500 hover:text-zinc-300"
          >
            View briefs{creativesLoading ? "" : pendingCreatives === 0 ? " & creatives" : ""} →
          </Link>
        )}
      </div>
    </div>
  );
}
