"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import CampaignNav from "@/components/sm/CampaignNav";
import { btnPrimary, sectionTitle } from "@/lib/sm/ui";
import type { SMCampaign } from "@/types/sm";

export default function CampaignOverviewPage() {
  const params = useParams();
  const id = params.id as string;
  const [campaign, setCampaign] = useState<SMCampaign | null>(null);
  const [calendarCount, setCalendarCount] = useState(0);
  const [shareToast, setShareToast] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/sm/campaigns/${id}`);
      if (res.ok) {
        const data = (await res.json()) as {
          campaign: SMCampaign;
          calendar_count: number;
        };
        setCampaign(data.campaign);
        setCalendarCount(data.calendar_count);
      }
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <p className="px-6 py-12 text-sm text-zinc-600">Loading…</p>;
  if (!campaign) return <p className="px-6 py-12 text-sm text-red-400/90">Campaign not found</p>;

  async function handleShareReview() {
    const res = await fetch(`/api/sm/campaigns/${id}/enable-review`, { method: "POST" });
    if (!res.ok) return;
    const json = (await res.json()) as { campaign?: SMCampaign };
    const token = json.campaign?.review_token;
    if (!token) return;
    await navigator.clipboard.writeText(`${window.location.origin}/review/${token}`);
    setCampaign((c) =>
      c ? { ...c, review_enabled: true, review_token: token } : c
    );
    setShareToast(true);
    setTimeout(() => setShareToast(false), 3000);
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
        <div>
          <h1 className={sectionTitle}>{campaign.name}</h1>
          <p className="mt-2 text-sm capitalize text-zinc-500">
            {campaign.objective} · {campaign.duration_days} days · {campaign.status.replace("_", " ")}
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <Link href={`/campaign/${id}/strategy`} className={btnPrimary}>
            View strategy
          </Link>
          {calendarCount > 0 && (
            <>
              <Link
                href={`/campaign/${id}/calendar`}
                className="text-sm text-zinc-500 hover:text-zinc-300"
              >
                Calendar ({calendarCount} posts)
              </Link>
              <Link
                href={`/campaign/${id}/review`}
                className="text-sm text-zinc-500 hover:text-zinc-300"
              >
                Review briefs
              </Link>
              <Link
                href={`/campaign/${id}/briefs`}
                className="text-sm text-zinc-500 hover:text-zinc-300"
              >
                Generated creatives
              </Link>
              <button
                type="button"
                onClick={() => void handleShareReview()}
                className="w-fit rounded border border-zinc-700 px-3 py-1.5 text-left text-xs text-zinc-400 transition-colors hover:text-white"
              >
                Share for client approval
              </button>
              {shareToast && (
                <p className="text-xs text-green-400">Review link copied to clipboard</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
