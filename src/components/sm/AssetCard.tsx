"use client";

import { useState } from "react";
import type { SMClient, SMGeneratedAsset } from "@/types/sm";
import PublishModal from "./PublishModal";

export default function AssetCard({
  asset,
  client,
  onRegenerate,
}: {
  asset: SMGeneratedAsset;
  client: SMClient;
  onRegenerate: (id: string) => Promise<void>;
}) {
  const [regenerating, setRegenerating] = useState(false);
  const [showPublish, setShowPublish] = useState(false);

  const platformLabel = asset.platform.charAt(0).toUpperCase() + asset.platform.slice(1);
  const typeLabel = asset.asset_type.replace("_", " ");

  async function handleDownload() {
    const res = await fetch(`/api/sm/assets/${asset.id}/download`);
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${client.name}-${asset.platform}-${asset.asset_type}.jpg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-zinc-700 bg-zinc-800/60">
      <div className="relative aspect-square overflow-hidden bg-zinc-900">
        {asset.status === "done" && asset.storage_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={asset.storage_url}
            alt={`${platformLabel} ${typeLabel}`}
            className="h-full w-full object-cover"
          />
        )}

        {client.logo_url && asset.status === "done" && (
          <div className="absolute right-3 top-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={client.logo_url}
              alt={client.name}
              className="h-8 w-auto max-w-[120px] object-contain drop-shadow-lg"
            />
          </div>
        )}

        {asset.status === "generating" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-zinc-500">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
            <span className="text-xs">Generating...</span>
          </div>
        )}

        {asset.status === "failed" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 py-8 text-center">
            <p className="text-sm font-medium text-red-400">Generation failed</p>
            {asset.error_message && (
              <p className="max-w-[200px] text-xs leading-relaxed text-zinc-500">
                {asset.error_message}
              </p>
            )}
            <button
              type="button"
              onClick={() => {
                setRegenerating(true);
                void onRegenerate(asset.id).finally(() => setRegenerating(false));
              }}
              disabled={regenerating}
              className="mt-2 rounded border border-violet-500/30 px-3 py-1.5 text-xs text-violet-400 hover:bg-violet-500/10 disabled:opacity-50"
            >
              {regenerating ? "…" : "↻ Try again"}
            </button>
          </div>
        )}

        <div className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
          {platformLabel} · {typeLabel}
        </div>
      </div>

      {asset.headline && (
        <div className="px-3 pt-3">
          <p className="text-sm font-medium text-white">&ldquo;{asset.headline}&rdquo;</p>
        </div>
      )}
      {asset.copy && (
        <div className="px-3 pb-2 pt-1">
          <p className="line-clamp-3 text-xs leading-relaxed text-zinc-400">{asset.copy}</p>
        </div>
      )}

      <div className="mt-auto flex gap-2 px-3 pb-3 pt-1">
        <button
          type="button"
          onClick={() => void handleDownload()}
          className="flex-1 rounded border border-zinc-600 px-2 py-1.5 text-center text-xs text-zinc-300 hover:border-zinc-400 hover:text-white"
        >
          ↓ Download
        </button>
        <button
          type="button"
          onClick={() => {
            setRegenerating(true);
            void onRegenerate(asset.id).finally(() => setRegenerating(false));
          }}
          disabled={regenerating || asset.status === "generating"}
          className="flex-1 rounded border border-zinc-600 px-2 py-1.5 text-xs text-zinc-300 hover:border-zinc-400 hover:text-white disabled:opacity-40"
        >
          {regenerating ? "..." : "↻ Redo"}
        </button>
        <button
          type="button"
          onClick={() => setShowPublish(true)}
          className="flex-1 rounded border border-violet-500/30 bg-violet-600/20 px-2 py-1.5 text-xs text-violet-300 hover:bg-violet-600/30"
        >
          ↑ Publish
        </button>
      </div>

      {showPublish && (
        <PublishModal
          asset={asset}
          client={client}
          onClose={() => setShowPublish(false)}
        />
      )}
    </div>
  );
}
