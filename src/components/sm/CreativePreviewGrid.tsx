"use client";

import { useState } from "react";
import { btnGhost, btnPrimary, sectionTitle } from "@/lib/sm/ui";
import type {
  SMCreativeFormat,
  SMClient,
  SMGeneratedAsset,
  SMSignalOpsHeadline,
  SMVisualApproach,
} from "@/types/sm";
import AssetCard from "./AssetCard";

export default function CreativePreviewGrid({
  assets,
  client,
  requestId,
  includeLogo = true,
  headlineMeta,
  visualApproach,
  creativeFormat,
  onRegenerate,
  onExplore,
  onEnableReview,
  onNewBrief,
  onChangeBrand,
}: {
  assets: SMGeneratedAsset[];
  client: SMClient;
  requestId?: string;
  includeLogo?: boolean;
  headlineMeta?: SMSignalOpsHeadline;
  visualApproach?: SMVisualApproach;
  creativeFormat?: SMCreativeFormat;
  onRegenerate: (id: string, direction?: string) => Promise<void>;
  onExplore?: () => Promise<void>;
  onEnableReview?: () => Promise<string | null>;
  onNewBrief: () => void;
  onChangeBrand: () => void;
}) {
  const [exploreLoading, setExploreLoading] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewUrl, setReviewUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleExplore() {
    if (!onExplore) return;
    setExploreLoading(true);
    try {
      await onExplore();
    } finally {
      setExploreLoading(false);
    }
  }

  async function handleShareReview() {
    if (!onEnableReview) return;
    setReviewLoading(true);
    try {
      const url = await onEnableReview();
      if (url) {
        setReviewUrl(url);
        const full = `${window.location.origin}${url}`;
        await navigator.clipboard.writeText(full);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } finally {
      setReviewLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className={sectionTitle}>Creatives</h2>
          <div className="mt-2 flex flex-wrap gap-3">
            <button type="button" onClick={onNewBrief} className={btnGhost}>
              New brief
            </button>
            <button type="button" onClick={onChangeBrand} className={btnGhost}>
              Change brand
            </button>
            {onExplore && (
              <button
                type="button"
                onClick={() => void handleExplore()}
                disabled={exploreLoading}
                className={btnGhost}
              >
                {exploreLoading ? "Exploring…" : "Explore 3 directions"}
              </button>
            )}
            {onEnableReview && requestId && (
              <button
                type="button"
                onClick={() => void handleShareReview()}
                disabled={reviewLoading}
                className={btnGhost}
              >
                {copied ? "Link copied!" : reviewLoading ? "Creating link…" : "Share for approval"}
              </button>
            )}
          </div>
          {reviewUrl && (
            <p className="mt-2 text-xs text-zinc-600">
              Client review:{" "}
              <a href={reviewUrl} className="text-violet-400 hover:underline">
                {reviewUrl}
              </a>
            </p>
          )}
          {client.has_brand_kit && (
            <p className="mt-2 text-xs text-amber-500/80">Brand kit locked — colours, fonts & logo enforced</p>
          )}
        </div>
        <button type="button" onClick={onNewBrief} className={btnPrimary}>
          New post
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {assets.map((asset) => (
          <AssetCard
            key={asset.id}
            asset={asset}
            client={client}
            includeLogo={includeLogo}
            headlineMeta={headlineMeta}
            visualApproach={visualApproach}
            creativeFormat={creativeFormat}
            onRegenerate={onRegenerate}
          />
        ))}
      </div>
    </div>
  );
}
