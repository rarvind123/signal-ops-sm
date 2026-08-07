"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import CampaignNav from "@/components/sm/CampaignNav";
import VisualBriefCard from "@/components/sm/VisualBriefCard";
import { parseBriefsResponse } from "@/lib/sm/briefs-api";
import { readApiJson } from "@/lib/sm/api-client";
import type { SMCampaign, SMCreativeBrief, SMClient } from "@/types/sm";
import { apiUrl } from "@/lib/base-path";

export default function CampaignReviewPage() {
  const { id: campaignId } = useParams<{ id: string }>();
  const [briefs, setBriefs] = useState<SMCreativeBrief[]>([]);
  const [client, setClient] = useState<SMClient | null>(null);
  const [campaign, setCampaign] = useState<SMCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentlyGenerating, setCurrentlyGenerating] = useState<string | null>(null);
  const [generatedCount, setGeneratedCount] = useState(0);
  const [shareToast, setShareToast] = useState(false);

  useEffect(() => {
    async function load() {
      const [briefsRes, campaignRes] = await Promise.all([
        fetch(apiUrl(`/api/sm/campaigns/${campaignId}/briefs`),
        fetch(apiUrl(`/api/sm/campaigns/${campaignId}`),
      ]);
      if (briefsRes.ok) {
        setBriefs(await parseBriefsResponse(briefsRes));
      }
      if (campaignRes.ok) {
        const data = (await campaignRes.json()) as {
          campaign: SMCampaign;
          client: SMClient | null;
        };
        setCampaign(data.campaign);
        setClient(data.client);
      }
      setLoading(false);
    }
    void load();
  }, [campaignId]);

  function handleApprove(id: string) {
    setBriefs((prev) => prev.map((b) => (b.id === id ? { ...b, approved: true } : b)));
    void fetch(apiUrl(`/api/sm/briefs/${id}/approve`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved: true }),
    });
  }

  function handleReject(id: string) {
    setBriefs((prev) => prev.map((b) => (b.id === id ? { ...b, approved: false } : b)));
    void fetch(apiUrl(`/api/sm/briefs/${id}/approve`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved: false }),
    });
  }

  function handleEdit(id: string, field: string, value: string) {
    setBriefs((prev) => prev.map((b) => (b.id === id ? { ...b, [field]: value } : b)));
    void fetch(apiUrl(`/api/sm/briefs/${id}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
  }

  async function startGeneration() {
    const approved = briefs.filter((b) => b.approved === true && b.status !== "done");
    const queue = approved.map((b) => b.id);
    setGeneratedCount(0);

    for (const briefId of queue) {
      setCurrentlyGenerating(briefId);
      try {
        const res = await fetch(apiUrl(`/api/sm/briefs/${briefId}/generate`), { method: "POST" });
        const json = await readApiJson<{ error?: string }>(res);
        if (!res.ok) throw new Error(json.error ?? "Generation failed");
        setBriefs((prev) =>
          prev.map((b) => (b.id === briefId ? { ...b, status: "done" } : b))
        );
        setGeneratedCount((n) => n + 1);
      } catch {
        setBriefs((prev) =>
          prev.map((b) => (b.id === briefId ? { ...b, status: "pending" } : b))
        );
      }
    }
    setCurrentlyGenerating(null);
  }

  async function handleShareReview() {
    const res = await fetch(apiUrl(`/api/sm/campaigns/${campaignId}/enable-review`), {
      method: "POST",
    });
    if (!res.ok) return;
    const json = (await res.json()) as { campaign?: SMCampaign };
    const token = json.campaign?.review_token;
    if (!token) return;
    const url = `${window.location.origin}/review/${token}`;
    await navigator.clipboard.writeText(url);
    setCampaign((c) => (c ? { ...c, review_enabled: true, review_token: token } : c));
    setShareToast(true);
    setTimeout(() => setShareToast(false), 3000);
  }

  const approvedCount = briefs.filter((b) => b.approved === true).length;
  const totalCount = briefs.length;
  const readyCount = briefs.filter(
    (b) => b.approved !== null && b.approved !== undefined
  ).length;
  const isGenerating = currentlyGenerating !== null;
  const estimatedCost = (approvedCount * 0.04).toFixed(2);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#060608] text-zinc-500">
        Loading briefs…
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#060608] text-red-400/90">
        Campaign not found
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060608] px-6 py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header>
          <Image
            src="/inventious-logo.png"
            alt="inventious"
            width={378}
            height={118}
            className="h-8 w-auto object-contain object-left"
          />
        </header>
        <CampaignNav campaignId={campaignId} />

        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-zinc-500">{campaign?.name}</p>
            <h1 className="mt-0.5 text-xl font-semibold text-white">Review Campaign Briefs</h1>
            <p className="mt-1 text-sm text-zinc-500">
              {readyCount}/{totalCount} reviewed · {approvedCount} approved
              {approvedCount > 0 && ` · est. $${estimatedCost}`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void handleShareReview()}
              className="rounded border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:text-white"
            >
              Share for client approval
            </button>
            <button
              type="button"
              onClick={() => briefs.forEach((b) => handleApprove(b.id))}
              className="rounded border border-zinc-700 px-3 py-1.5 text-xs text-zinc-500 transition-colors hover:text-zinc-300"
            >
              Approve all
            </button>
            <button
              type="button"
              onClick={() => void startGeneration()}
              disabled={approvedCount === 0 || isGenerating}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-40"
            >
              {isGenerating
                ? `Generating ${generatedCount + 1}/${approvedCount}…`
                : `Generate approved (${approvedCount})`}
            </button>
          </div>
        </div>

        {shareToast && (
          <p className="text-xs text-green-400">Review link copied to clipboard</p>
        )}

        {isGenerating && (
          <div className="flex items-center gap-3 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3">
            <div className="h-1.5 flex-1 rounded-full bg-zinc-800">
              <div
                className="h-1.5 rounded-full bg-violet-500 transition-all duration-500"
                style={{
                  width: `${approvedCount > 0 ? (generatedCount / approvedCount) * 100 : 0}%`,
                }}
              />
            </div>
            <span className="text-xs text-zinc-400">
              {generatedCount}/{approvedCount} images generated
            </span>
          </div>
        )}

        {briefs.length === 0 ? (
          <div className="flex flex-col gap-2 text-sm text-zinc-500">
            <p>Briefs are still generating — check back shortly.</p>
            <Link href={`/campaign/${campaignId}/calendar`} className="text-zinc-300 hover:underline">
              Back to calendar
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {briefs.map((brief) => (
              <VisualBriefCard
                key={brief.id}
                brief={brief}
                client={client}
                onApprove={handleApprove}
                onReject={handleReject}
                onEdit={handleEdit}
              />
            ))}
          </div>
        )}

        {briefs.some((b) => b.status === "done") && (
          <Link
            href={`/campaign/${campaignId}/briefs`}
            className="text-sm text-zinc-500 hover:text-zinc-300"
          >
            View generated creatives →
          </Link>
        )}
      </div>
    </div>
  );
}
