"use client";

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
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-white">Generated Creatives</h2>
          <button
            type="button"
            onClick={onNewBrief}
            className="text-xs text-zinc-500 transition-colors hover:text-zinc-300"
          >
            ← New brief
          </button>
          <button
            type="button"
            onClick={onChangeBrand}
            className="text-xs text-zinc-500 transition-colors hover:text-zinc-300"
          >
            ← Change brand
          </button>
        </div>
        <button
          type="button"
          onClick={onNewBrief}
          className="rounded border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white"
        >
          + New Post
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
