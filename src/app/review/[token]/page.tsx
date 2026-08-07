"use client";

import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import AssetReviewCard from "@/components/sm/AssetReviewCard";
import VisualBriefCard from "@/components/sm/VisualBriefCard";
import { apiUrl } from "@/lib/base-path";
import type {
  SMCampaign,
  SMCreativeBrief,
  SMCreativeRequest,
  SMClient,
  SMGeneratedAsset,
} from "@/types/sm";

type CampaignReview = {
  kind: "campaign";
  campaign: SMCampaign;
  client: SMClient;
  briefs: SMCreativeBrief[];
};

type RequestReview = {
  kind: "request";
  request: SMCreativeRequest;
  client: SMClient;
  assets: SMGeneratedAsset[];
};

export default function ClientReviewPage() {
  const { token } = useParams<{ token: string }>();
  const [review, setReview] = useState<CampaignReview | RequestReview | null>(null);
  const [briefs, setBriefs] = useState<SMCreativeBrief[]>([]);
  const [assets, setAssets] = useState<SMGeneratedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch(apiUrl(`/api/sm/review/${token}`));
      if (!res.ok) {
        setError("This review link is invalid or has been disabled.");
        setLoading(false);
        return;
      }
      const data = (await res.json()) as CampaignReview | RequestReview;
      setReview(data);
      if (data.kind === "campaign") {
        setBriefs(data.briefs ?? []);
      } else {
        setAssets(data.assets ?? []);
      }
      setLoading(false);
    }
    void load();
  }, [token]);

  function handleBriefApprove(id: string) {
    setBriefs((prev) => prev.map((b) => (b.id === id ? { ...b, approved: true } : b)));
    void fetch(apiUrl(`/api/sm/review/${token}/briefs/${id}`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved: true }),
    });
  }

  function handleBriefReject(id: string) {
    setBriefs((prev) => prev.map((b) => (b.id === id ? { ...b, approved: false } : b)));
    void fetch(apiUrl(`/api/sm/review/${token}/briefs/${id}`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved: false }),
    });
  }

  function handleBriefComment(id: string, comment: string) {
    setBriefs((prev) =>
      prev.map((b) => (b.id === id ? { ...b, client_comment: comment } : b))
    );
    void fetch(apiUrl(`/api/sm/review/${token}/briefs/${id}`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_comment: comment }),
    });
  }

  const client = review?.client ?? null;
  const approvedCount = briefs.filter((b) => b.approved === true).length;
  const readyCount = briefs.filter(
    (b) => b.approved !== null && b.approved !== undefined
  ).length;
  const assetsApproved = assets.filter((a) => a.approval_status === "approved").length;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#060608] text-zinc-500">
        Loading…
      </div>
    );
  }

  if (error || !client || !review) {
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
            <h1 className="text-lg font-medium text-zinc-100">
              {review.kind === "campaign"
                ? (review.campaign.name ?? "Campaign review")
                : "Creative review"}
            </h1>
            {review.kind === "request" && (
              <p className="mt-1 max-w-xl text-xs text-zinc-600">{review.request.brief_text}</p>
            )}
          </div>
        </div>

        {review.kind === "campaign" && (
          <>
            <p className="text-center text-xs text-zinc-600">
              {readyCount}/{briefs.length} reviewed · {approvedCount} approved
            </p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {briefs.map((brief) => (
                <VisualBriefCard
                  key={brief.id}
                  brief={brief}
                  client={client}
                  readOnly
                  onApprove={handleBriefApprove}
                  onReject={handleBriefReject}
                  onEdit={() => {}}
                  onComment={handleBriefComment}
                />
              ))}
            </div>
          </>
        )}

        {review.kind === "request" && (
          <>
            <p className="text-center text-xs text-zinc-600">
              {assetsApproved}/{assets.length} approved
            </p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {assets.map((asset) => (
                <AssetReviewCard
                  key={asset.id}
                  asset={asset}
                  token={token}
                  onUpdate={(updated) =>
                    setAssets((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
                  }
                />
              ))}
            </div>
            {assets.length === 0 && (
              <p className="text-center text-sm text-zinc-600">
                No finished creatives yet. Check back once generation completes.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
