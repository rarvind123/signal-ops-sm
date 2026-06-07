"use client";

import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import VisualBriefCard from "@/components/sm/VisualBriefCard";
import type { SMCampaign, SMCreativeBrief, SMClient } from "@/types/sm";

export default function ClientReviewPage() {
  const { token } = useParams<{ token: string }>();
  const [briefs, setBriefs] = useState<SMCreativeBrief[]>([]);
  const [client, setClient] = useState<SMClient | null>(null);
  const [campaign, setCampaign] = useState<SMCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/sm/review/${token}`);
      if (!res.ok) {
        setError("This review link is invalid or has been disabled.");
        setLoading(false);
        return;
      }
      const data = (await res.json()) as {
        campaign: SMCampaign;
        client: SMClient;
        briefs: SMCreativeBrief[];
      };
      setCampaign(data.campaign);
      setClient(data.client);
      setBriefs(data.briefs ?? []);
      setLoading(false);
    }
    void load();
  }, [token]);

  function handleApprove(id: string) {
    setBriefs((prev) => prev.map((b) => (b.id === id ? { ...b, approved: true } : b)));
    void fetch(`/api/sm/review/${token}/briefs/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved: true }),
    });
  }

  function handleReject(id: string) {
    setBriefs((prev) => prev.map((b) => (b.id === id ? { ...b, approved: false } : b)));
    void fetch(`/api/sm/review/${token}/briefs/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved: false }),
    });
  }

  function handleComment(id: string, comment: string) {
    setBriefs((prev) =>
      prev.map((b) => (b.id === id ? { ...b, client_comment: comment } : b))
    );
    void fetch(`/api/sm/review/${token}/briefs/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_comment: comment }),
    });
  }

  const approvedCount = briefs.filter((b) => b.approved === true).length;
  const readyCount = briefs.filter(
    (b) => b.approved !== null && b.approved !== undefined
  ).length;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#060608] text-zinc-500">
        Loading…
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#060608] px-6 text-center text-sm text-red-400/90">
        {error ?? "Review not available"}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060608] px-6 py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Image
            src="/inventious-logo.png"
            alt="inventious"
            width={200}
            height={60}
            className="h-8 w-auto object-contain"
          />
          <div>
            <p className="text-sm text-zinc-500">{client.name}</p>
            <h1 className="mt-0.5 text-xl font-semibold text-white">{campaign?.name}</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Review each post — approve or skip. Add comments where helpful.
            </p>
            <p className="mt-2 text-xs text-zinc-600">
              {readyCount}/{briefs.length} reviewed · {approvedCount} approved
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {briefs.map((brief) => (
            <VisualBriefCard
              key={brief.id}
              brief={brief}
              client={client}
              onApprove={handleApprove}
              onReject={handleReject}
              onEdit={() => {}}
              readOnly
              onComment={handleComment}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
