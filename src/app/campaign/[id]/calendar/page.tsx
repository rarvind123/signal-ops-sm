"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import CampaignCalendarView from "@/components/sm/CampaignCalendarView";
import CampaignNav from "@/components/sm/CampaignNav";
import { sectionTitle } from "@/lib/sm/ui";
import type { SMCampaignCalendarItem } from "@/types/sm";

export default function CampaignCalendarPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [items, setItems] = useState<SMCampaignCalendarItem[]>([]);
  const [briefsLoading, setBriefsLoading] = useState(false);
  const [hasBriefs, setHasBriefs] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const [calRes, briefRes] = await Promise.all([
        fetch(`/api/sm/campaigns/${id}/calendar`),
        fetch(`/api/sm/campaigns/${id}/briefs`),
      ]);
      if (calRes.ok) {
        setItems((await calRes.json()) as SMCampaignCalendarItem[]);
      }
      if (briefRes.ok) {
        const briefs = (await briefRes.json()) as unknown[];
        setHasBriefs(briefs.length > 0);
      }
      setLoading(false);
    })();
  }, [id]);

  async function handleGenerateBriefs() {
    setBriefsLoading(true);
    try {
      const res = await fetch(`/api/sm/campaigns/${id}/briefs`, { method: "POST" });
      if (res.ok) {
        router.push(`/campaign/${id}/briefs`);
      }
    } finally {
      setBriefsLoading(false);
    }
  }

  if (loading) return <p className="px-6 py-12 text-sm text-zinc-600">Loading…</p>;

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
        {items.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No calendar yet.{" "}
            <Link href={`/campaign/${id}/strategy`} className="text-zinc-300 hover:underline">
              Generate from strategy
            </Link>
          </p>
        ) : (
          <CampaignCalendarView
            items={items}
            onGenerateBriefs={() => void handleGenerateBriefs()}
            briefsLoading={briefsLoading}
            hasBriefs={hasBriefs}
          />
        )}
        {hasBriefs && (
          <Link
            href={`/campaign/${id}/briefs`}
            className="text-sm text-zinc-500 hover:text-zinc-300"
          >
            View briefs →
          </Link>
        )}
      </div>
    </div>
  );
}
