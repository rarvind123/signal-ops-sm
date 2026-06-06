"use client";

import { btnGhost, btnPrimary, sectionTitle } from "@/lib/sm/ui";
import type { SMClient, SMGeneratedAsset } from "@/types/sm";
import AssetCard from "./AssetCard";

export default function CreativePreviewGrid({
  assets,
  client,
  onRegenerate,
  onNewBrief,
  onChangeBrand,
}: {
  assets: SMGeneratedAsset[];
  client: SMClient;
  onRegenerate: (id: string, direction?: string) => Promise<void>;
  onNewBrief: () => void;
  onChangeBrand: () => void;
}) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className={sectionTitle}>Creatives</h2>
          <div className="mt-2 flex gap-4">
            <button type="button" onClick={onNewBrief} className={btnGhost}>
              New brief
            </button>
            <button type="button" onClick={onChangeBrand} className={btnGhost}>
              Change brand
            </button>
          </div>
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
            onRegenerate={onRegenerate}
          />
        ))}
      </div>
    </div>
  );
}
