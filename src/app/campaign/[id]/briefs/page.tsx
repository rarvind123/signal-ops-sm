"use client";

import Image from "next/image";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import CampaignNav from "@/components/sm/CampaignNav";
import CreativeBriefCard from "@/components/sm/CreativeBriefCard";
import { parseBriefsResponse } from "@/lib/sm/briefs-api";
import { sectionTitle } from "@/lib/sm/ui";
import type { SMCreativeBrief } from "@/types/sm";
import { apiUrl } from "@/lib/base-path";

export default function CampaignBriefsPage() {
  const params = useParams();
  const id = params.id as string;
  const [briefs, setBriefs] = useState<SMCreativeBrief[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBriefs = useCallback(async () => {
    const res = await fetch(apiUrl(`/api/sm/campaigns/${id}/briefs`));
    if (res.ok) {
      setBriefs(await parseBriefsResponse(res));
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void loadBriefs();
  }, [loadBriefs]);

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
        <h1 className={sectionTitle}>Creative briefs</h1>
        {briefs.length === 0 ? (
          <p className="text-sm text-zinc-500">No briefs yet — generate from the calendar.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {briefs.map((brief) => (
              <CreativeBriefCard
                key={brief.id}
                brief={brief}
                onGenerated={() => void loadBriefs()}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
