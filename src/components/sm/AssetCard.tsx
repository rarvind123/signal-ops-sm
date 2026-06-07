"use client";

import { useEffect, useState } from "react";
import {
  getReadableBrandAccent,
  getTierFontSizes,
  getTypography,
  resolveHeadlineTiers,
  splitWord,
} from "@/lib/sm/typography";
import { btnSecondary, field } from "@/lib/sm/ui";
import type { SMClient, SMGeneratedAsset, SMSignalOpsHeadline } from "@/types/sm";
import PublishModal from "./PublishModal";

function PunchLine({
  punch,
  emphasisWord,
  accentColor,
  cssClass,
  fontWeight,
  letterSpacing,
  textTransform,
  fontSize,
}: {
  punch: string;
  emphasisWord?: string;
  accentColor?: string;
  cssClass: string;
  fontWeight: number;
  letterSpacing: string;
  textTransform: "uppercase" | "none";
  fontSize: string;
}) {
  const words = punch.split(" ");
  const accentIndex = emphasisWord
    ? words.findIndex((w) => splitWord(w).clean.toLowerCase() === emphasisWord.toLowerCase())
    : words.length - 1;
  const targetIndex = accentIndex >= 0 ? accentIndex : words.length - 1;

  return (
    <p
      className={`${cssClass} text-white`}
      style={{
        fontWeight,
        letterSpacing,
        textTransform,
        fontSize,
        lineHeight: 1.1,
        textShadow: "0 1px 6px rgba(0,0,0,0.7)",
      }}
    >
      {words.map((word, i) => {
        const { clean, punct } = splitWord(word);
        const isAccent = accentColor && i === targetIndex;
        return (
          <span key={i}>
            {i > 0 && " "}
            {isAccent ? (
              <span
                style={{
                  color: accentColor,
                  textShadow: `0 0 20px ${accentColor}40`,
                }}
              >
                {clean}
              </span>
            ) : (
              clean
            )}
            {punct}
          </span>
        );
      })}
    </p>
  );
}

export default function AssetCard({
  asset,
  client,
  headlineMeta,
  onRegenerate,
}: {
  asset: SMGeneratedAsset;
  client: SMClient;
  headlineMeta?: SMSignalOpsHeadline;
  onRegenerate: (id: string, direction?: string) => Promise<void>;
}) {
  const [regenerating, setRegenerating] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  const [showRedoInput, setShowRedoInput] = useState(false);
  const [redoDirection, setRedoDirection] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [logoUrl, setLogoUrl] = useState<string | null>(client.logo_url ?? null);
  const [localAsset, setLocalAsset] = useState(asset);
  const [showTextOverlay, setShowTextOverlay] = useState(true);

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

  const isTextOnly =
    localAsset.status === "done" && !localAsset.storage_url && Boolean(localAsset.copy);
  const platformLabel = localAsset.platform.charAt(0).toUpperCase() + localAsset.platform.slice(1);
  const typeLabel = isTextOnly ? "TV Script" : localAsset.asset_type.replace("_", " ");

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
    if (isTextOnly && localAsset.copy) {
      const blob = new Blob([localAsset.copy], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${client.name}-tv-script-30s.txt`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

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
    <div className="flex flex-col overflow-hidden rounded-lg border border-zinc-800/80 bg-zinc-900/30">
      <div
        className={`@container relative overflow-hidden bg-zinc-950 ${
          isTextOnly ? "min-h-[400px]" : "aspect-square"
        }`}
      >
        {isTextOnly && (
          <div className="max-h-[400px] overflow-y-auto whitespace-pre-wrap p-4 font-mono text-xs leading-relaxed text-zinc-400">
            {localAsset.copy}
          </div>
        )}

        {localAsset.status === "done" && localAsset.storage_url && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${localAsset.storage_url}?v=${refreshKey}`}
              alt={`${platformLabel} ${typeLabel}`}
              className="h-full w-full object-cover"
            />
            {logoUrl && localAsset.status === "done" && (
              <div className="absolute right-3 top-3 rounded-lg bg-white/80 backdrop-blur-sm px-2 py-1.5 shadow-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoUrl}
                  alt={client.name}
                  className="h-8 w-auto max-w-[110px] object-contain"
                />
              </div>
            )}
            {localAsset.status === "done" &&
              localAsset.storage_url &&
              localAsset.headline &&
              showTextOverlay &&
              (() => {
                const typo = getTypography(client.tone);
                const tiers = resolveHeadlineTiers(localAsset.headline, headlineMeta);
                if (!tiers) return null;

                const punchWordCount = tiers.punch.split(" ").length;
                const { setup: setupFontSize, punch: punchFontSize } =
                  getTierFontSizes(punchWordCount);
                const setupWeight = Math.max(typo.fontWeight - 200, 300);
                const punchWeight = Math.min(typo.fontWeight + 200, 900);
                const accentColor = getReadableBrandAccent(client.brand_colors);

                return (
                  <div className="pointer-events-none absolute bottom-0 left-0 right-0">
                    <div
                      className="absolute bottom-0 left-0 right-0"
                      style={{
                        height: "60%",
                        background:
                          "linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.4) 45%, transparent 100%)",
                      }}
                    />
                    <div className="relative px-5 pb-5 pt-10">
                      {tiers.setup && (
                        <p
                          className={`${typo.cssClass} mb-0.5 text-white/75`}
                          style={{
                            fontWeight: setupWeight,
                            letterSpacing: typo.letterSpacing,
                            textTransform: typo.textTransform,
                            fontSize: setupFontSize,
                            lineHeight: 1.25,
                            textShadow: "0 1px 3px rgba(0,0,0,0.5)",
                          }}
                        >
                          {tiers.setup}
                        </p>
                      )}
                      <PunchLine
                        punch={tiers.punch}
                        emphasisWord={headlineMeta?.emphasis_word}
                        accentColor={accentColor}
                        cssClass={typo.cssClass}
                        fontWeight={punchWeight}
                        letterSpacing={
                          typo.textTransform === "uppercase" ? "0.04em" : typo.letterSpacing
                        }
                        textTransform={typo.textTransform}
                        fontSize={punchFontSize}
                      />
                    </div>
                  </div>
                );
              })()}
          </>
        )}

        {localAsset.status === "generating" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-zinc-600">
            <div className="h-5 w-5 animate-spin rounded-full border border-zinc-600 border-t-zinc-300" />
            <span className="text-xs">Generating</span>
          </div>
        )}

        {localAsset.status === "failed" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 py-8 text-center">
            <p className="text-sm text-red-400/90">Generation failed</p>
            {localAsset.error_message && (
              <p className="max-w-[200px] text-xs leading-relaxed text-zinc-600">
                {localAsset.error_message}
              </p>
            )}
            <button
              type="button"
              onClick={() => void handleRedo()}
              disabled={regenerating}
              className={`${btnSecondary} mt-2 px-3 py-1.5 text-xs`}
            >
              {regenerating ? "…" : "Try again"}
            </button>
          </div>
        )}

        <div className="absolute left-2 top-2 rounded bg-black/50 px-2 py-0.5 text-[10px] uppercase tracking-wider text-zinc-400">
          {platformLabel} · {typeLabel}
        </div>

        {localAsset.status === "done" && localAsset.storage_url && localAsset.headline && (
          <button
            type="button"
            onClick={() => setShowTextOverlay((prev) => !prev)}
            className="absolute right-14 top-2 z-10 rounded bg-black/40 px-1.5 py-0.5 text-xs text-white/70 hover:bg-black/60"
            title="Toggle headline overlay"
          >
            Aa
          </button>
        )}
      </div>

      {localAsset.headline && (
        <div className="px-3 pt-3">
          <p className="text-sm text-zinc-200">&ldquo;{localAsset.headline}&rdquo;</p>
        </div>
      )}
      {localAsset.copy && !isTextOnly && (
        <div className="px-3 pb-2 pt-1">
          <p className="line-clamp-3 text-xs leading-relaxed text-zinc-500">{localAsset.copy}</p>
        </div>
      )}

      <div className="mt-auto flex flex-col gap-2 px-3 pb-3 pt-1">
        {showRedoInput && !isTextOnly && (
          <div className="flex gap-2">
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
              placeholder="e.g. warmer tones, outdoor setting…"
              className={`${field} min-w-0 flex-1 py-2 text-xs`}
            />
            <button
              type="button"
              onClick={() => void handleRedo()}
              disabled={regenerating}
              className={`${btnSecondary} shrink-0 px-3 py-2 text-xs`}
            >
              {regenerating ? "…" : "Go"}
            </button>
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void handleDownload()}
            className={`${btnSecondary} flex-1 py-2 text-xs`}
          >
            Download
          </button>
          {!isTextOnly && (
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
              className={`${btnSecondary} flex-1 py-2 text-xs`}
            >
              {regenerating ? "…" : "Redo"}
            </button>
          )}
          {!isTextOnly && (
            <button
              type="button"
              onClick={() => setShowPublish(true)}
              className={`${btnSecondary} flex-1 py-2 text-xs`}
            >
              Publish
            </button>
          )}
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
