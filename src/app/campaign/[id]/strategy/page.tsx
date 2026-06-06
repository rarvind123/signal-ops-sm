"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import CampaignNav from "@/components/sm/CampaignNav";
import CampaignStrategyCard from "@/components/sm/CampaignStrategyCard";
import { sectionTitle } from "@/lib/sm/ui";
import type { SMCampaign, SMCampaignStrategy } from "@/types/sm";

export default function CampaignStrategyPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [campaign, setCampaign] = useState<SMCampaign | null>(null);
  const [strategy, setStrategy] = useState<SMCampaignStrategy | null>(null);
  const [calendarCount, setCalendarCount] = useState(0);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const [campRes, stratRes] = await Promise.all([
        fetch(`/api/sm/campaigns/${id}`),
        fetch(`/api/sm/campaigns/${id}/strategy`),
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

  async function handleGenerateCalendar() {
    setCalendarLoading(true);
    try {
      const res = await fetch(`/api/sm/campaigns/${id}/calendar`, { method: "POST" });
      if (res.ok) {
        router.push(`/campaign/${id}/calendar`);
      }
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
        <CampaignStrategyCard
          strategy={strategy}
          onGenerateCalendar={() => void handleGenerateCalendar()}
          calendarLoading={calendarLoading}
          hasCalendar={calendarCount > 0}
        />
        {calendarCount > 0 && (
          <Link
            href={`/campaign/${id}/calendar`}
            className="text-sm text-zinc-500 hover:text-zinc-300"
          >
            View calendar →
          </Link>
        )}
      </div>
    </div>
  );
}
