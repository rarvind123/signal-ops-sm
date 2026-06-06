"use client";

import { useEffect, useState } from "react";
import type { SMClient, SMGeneratedAsset } from "@/types/sm";
import PublishModal from "./PublishModal";

export default function AssetCard({
  asset,
  client,
  onRegenerate,
}: {
  asset: SMGeneratedAsset;
  client: SMClient;
  onRegenerate: (id: string, direction?: string) => Promise<void>;
}) {
  const [regenerating, setRegenerating] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  const [showRedoInput, setShowRedoInput] = useState(false);
  const [redoDirection, setRedoDirection] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [logoUrl, setLogoUrl] = useState<string | null>(client.logo_url ?? null);
  const [localAsset, setLocalAsset] = useState(asset);

  useEffect(() => {
    setLocalAsset(asset);
  }, [asset]);

  useEffect(() => {
    if (client.logo_url) setLogoUrl(client.logo_url);
  }, [client.logo_url]);

  useEffect(() => {
    if (logoUrl) return;
    fetch(`/api/sm/clients/${client.id}/logo`)
      .then((r) => r.json())
      .then((data: { logo_url: string | null }) => {
        if (data.logo_url) setLogoUrl(data.logo_url);
      })
      .catch(() => {});
  }, [client.id, logoUrl]);

  const platformLabel = localAsset.platform.charAt(0).toUpperCase() + localAsset.platform.slice(1);
  const typeLabel = localAsset.asset_type.replace("_", " ");

  async function handleRedo() {
    setRegenerating(true);
    setLocalAsset((prev) => ({ ...prev, status: "generating", error_message: undefined }));
    try {
      await onRegenerate(localAsset.id, redoDirection.trim() || undefined);
      setRefreshKey((k) => k + 1);
      setShowRedoInput(false);
      setRedoDirection("");
    } finally {
      setRegenerating(false);
    }
  }

  async function handleDownload() {
    const res = await fetch(`/api/sm/assets/${localAsset.id}/download`);
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${client.name}-${localAsset.platform}-${localAsset.asset_type}.jpg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-zinc-700 bg-zinc-800/60">
      <div className="relative aspect-square overflow-hidden bg-zinc-900">
        {localAsset.status === "done" && localAsset.storage_url && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${localAsset.storage_url}?v=${refreshKey}`}
              alt={`${platformLabel} ${typeLabel}`}
              className="h-full w-full object-cover"
            />
            {logoUrl && localAsset.status === "done" && (
              <div className="absolute right-3 top-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoUrl}
                  alt={client.name}
                  className="h-10 w-auto max-w-[130px] object-contain"
                  style={{
                    filter:
                      "drop-shadow(0 0 3px rgba(255,255,255,0.95)) drop-shadow(0 0 7px rgba(0,0,0,0.85))",
                  }}
                />
              </div>
            )}
          </>
        )}

        {localAsset.status === "generating" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-zinc-500">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
            <span className="text-xs">Generating...</span>
          </div>
        )}

        {localAsset.status === "failed" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 py-8 text-center">
            <p className="text-sm font-medium text-red-400">Generation failed</p>
            {localAsset.error_message && (
              <p className="max-w-[200px] text-xs leading-relaxed text-zinc-500">
                {localAsset.error_message}
              </p>
            )}
            <button
              type="button"
              onClick={() => void handleRedo()}
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

      {localAsset.headline && (
        <div className="px-3 pt-3">
          <p className="text-sm font-medium text-white">&ldquo;{localAsset.headline}&rdquo;</p>
        </div>
      )}
      {localAsset.copy && (
        <div className="px-3 pb-2 pt-1">
          <p className="line-clamp-3 text-xs leading-relaxed text-zinc-400">{localAsset.copy}</p>
        </div>
      )}

      <div className="mt-auto flex flex-col gap-1.5 px-3 pb-3 pt-1">
        {showRedoInput && (
          <div className="flex gap-1.5">
            <input
              autoFocus
              type="text"
              value={redoDirection}
              onChange={(e) => setRedoDirection(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !regenerating) void handleRedo();
                if (e.key === "Escape") {
                  setShowRedoInput(false);
                  setRedoDirection("");
                }
              }}
              placeholder="e.g. warmer tones, no chess pieces, outdoor setting..."
              className="min-w-0 flex-1 rounded border border-violet-500/40 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-violet-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => void handleRedo()}
              disabled={regenerating}
              className="shrink-0 rounded border border-violet-500/30 bg-violet-600/20 px-3 py-1.5 text-xs text-violet-300 hover:bg-violet-600/30 disabled:opacity-40"
            >
              {regenerating ? "…" : "↻"}
            </button>
          </div>
        )}

        <div className="flex gap-2">
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
              if (!showRedoInput) {
                setShowRedoInput(true);
              } else if (redoDirection.trim()) {
                void handleRedo();
              } else {
                setShowRedoInput(false);
              }
            }}
            disabled={regenerating || localAsset.status === "generating"}
            className="flex-1 rounded border border-zinc-600 px-2 py-1.5 text-xs text-zinc-300 hover:border-zinc-400 hover:text-white disabled:opacity-40"
          >
            {regenerating ? "…" : "↻ Redo"}
          </button>
          <button
            type="button"
            onClick={() => setShowPublish(true)}
            className="flex-1 rounded border border-violet-500/30 bg-violet-600/20 px-2 py-1.5 text-xs text-violet-300 hover:bg-violet-600/30"
          >
            ↑ Publish
          </button>
        </div>
      </div>

      {showPublish && (
        <PublishModal
          asset={localAsset}
          client={client}
          onClose={() => setShowPublish(false)}
        />
      )}
    </div>
  );
}
