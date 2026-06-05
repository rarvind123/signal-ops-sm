"use client";

import type { SMClient, SMGeneratedAsset } from "@/types/sm";
import AssetCard from "./AssetCard";

export default function CreativePreviewGrid({
  assets,
  client,
  onRegenerate,
  onStartOver,
}: {
  assets: SMGeneratedAsset[];
  client: SMClient;
  onRegenerate: (id: string) => Promise<void>;
  onStartOver: () => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Generated Creatives</h2>
        <button
          type="button"
          onClick={onStartOver}
          className="rounded border border-zinc-700 px-3 py-1.5 text-sm text-zinc-400 hover:text-white"
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
