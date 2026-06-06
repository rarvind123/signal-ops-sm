"use client";

import Image from "next/image";
import { useState } from "react";
import type {
  SMClient,
  SMCreativeFormat,
  SMCreativeRequest,
  SMGeneratedAsset,
  SMSignalOpsOutput,
} from "@/types/sm";
import BrandProfileForm from "@/components/sm/BrandProfileForm";
import ClientSelector from "@/components/sm/ClientSelector";
import CreativeBriefForm from "@/components/sm/CreativeBriefForm";
import CreativePreviewGrid from "@/components/sm/CreativePreviewGrid";
import FormatSelector from "@/components/sm/FormatSelector";
import SignalOpsInsightsCard from "@/components/sm/SignalOpsInsightsCard";
import { CREATIVE_FORMATS } from "@/lib/sm/creative-formats-ui";

type SMStep = "format" | "brand" | "brief" | "signalops" | "assets";

function SMStepIndicator({
  current,
  onStepClick,
}: {
  current: SMStep;
  onStepClick: (step: SMStep) => void;
}) {
  const steps: { key: SMStep; label: string }[] = [
    { key: "brand", label: "Brand" },
    { key: "brief", label: "Brief" },
    { key: "signalops", label: "Strategy" },
    { key: "assets", label: "Creatives" },
  ];
  const stepOrder: SMStep[] = ["brand", "brief", "signalops", "assets"];
  const currentIndex = stepOrder.indexOf(current);

  return (
    <div className="flex items-center gap-2">
      {steps.map((s, i) => {
        const isCompleted = i < currentIndex;
        const isCurrent = s.key === current;
        return (
          <div key={s.key} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => isCompleted && onStepClick(s.key)}
              disabled={!isCompleted}
              className={`text-sm font-medium transition-colors ${
                isCurrent
                  ? "text-white"
                  : isCompleted
                    ? "cursor-pointer text-zinc-400 underline underline-offset-2 hover:text-white"
                    : "cursor-default text-zinc-600"
              }`}
            >
              {i + 1}. {s.label}
            </button>
            {i < steps.length - 1 && <span className="text-zinc-700">→</span>}
          </div>
        );
      })}
    </div>
  );
}

export default function Home() {
  const [step, setStep] = useState<SMStep>("format");
  const [activeFormat, setActiveFormat] = useState<SMCreativeFormat>("social_media");
  const [showCreateForm, setShowCreateForm] = useState(true);
  const [activeClient, setActiveClient] = useState<SMClient | null>(null);
  const [activeRequest, setActiveRequest] = useState<SMCreativeRequest | null>(null);
  const [signalOpsOutput, setSignalOpsOutput] = useState<SMSignalOpsOutput | null>(null);
  const [generatedAssets, setGeneratedAssets] = useState<SMGeneratedAsset[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [signalopsLoading, setSignalopsLoading] = useState(false);

  const formatMeta = CREATIVE_FORMATS.find((f) => f.id === activeFormat);

  function handleStartOver() {
    setStep("format");
    setActiveFormat("social_media");
    setActiveClient(null);
    setActiveRequest(null);
    setSignalOpsOutput(null);
    setGeneratedAssets([]);
    setError(null);
    setShowCreateForm(true);
  }

  function handleNewBrief() {
    setStep("brief");
    setGeneratedAssets([]);
    setSignalOpsOutput(null);
    setActiveRequest(null);
    setError(null);
  }

  async function refreshActiveClient() {
    if (!activeClient) return;
    const res = await fetch(`/api/sm/clients/${activeClient.id}`);
    if (res.ok) {
      const updated = (await res.json()) as SMClient;
      setActiveClient(updated);
    }
  }

  async function runSignalOps(request: SMCreativeRequest) {
    setActiveRequest(request);
    setError(null);
    setSignalopsLoading(true);
    try {
      const res = await fetch(`/api/sm/creative-requests/${request.id}/signalops`, {
        method: "POST",
      });
      const output = (await res.json()) as SMSignalOpsOutput & { error?: string };
      if (!res.ok) {
        throw new Error(output.error ?? "SignalOps failed");
      }
      setSignalOpsOutput(output);
      setStep("signalops");
    } catch (e) {
      setError(e instanceof Error ? e.message : "SignalOps failed");
    } finally {
      setSignalopsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#060608] px-6 py-10 text-zinc-200">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        {step !== "format" && (
          <header className="mb-2 border-b border-zinc-800/60 pb-5">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <Image
                  src="/inventious-logo.png"
                  alt="inventious"
                  width={378}
                  height={118}
                  className="h-9 w-auto object-contain object-left"
                  priority
                />
                <p className="mt-1 text-xs text-zinc-600">
                  SignalOps → {formatMeta?.label ?? "Creative Engine"}
                </p>
              </div>
              <button
                type="button"
                onClick={handleStartOver}
                className="text-xs text-zinc-600 hover:text-zinc-400"
              >
                ← Start over
              </button>
            </div>
          </header>
        )}

        {step !== "format" && (
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs text-zinc-400">
              {formatMeta?.icon} {formatMeta?.label}
            </span>
            <SMStepIndicator current={step} onStepClick={(s) => setStep(s)} />
          </div>
        )}

        {error && (
          <div className="flex items-start justify-between gap-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            <span>⚠ {error}</span>
            {activeRequest && (
              <button
                type="button"
                disabled={signalopsLoading}
                onClick={() => void runSignalOps(activeRequest)}
                className="shrink-0 rounded border border-red-500/30 px-2 py-1 text-xs text-red-300 hover:bg-red-500/10 disabled:opacity-50"
              >
                {signalopsLoading ? "…" : "↻ Retry"}
              </button>
            )}
          </div>
        )}

        {step === "format" && (
          <FormatSelector
            onSelect={(format) => {
              setActiveFormat(format);
              setStep("brand");
            }}
          />
        )}

        {step === "brand" && (
          <div className="flex flex-col gap-6">
            <ClientSelector
              onSelect={(client) => {
                setActiveClient(client);
                setShowCreateForm(false);
                setStep("brief");
              }}
              onCreate={() => setShowCreateForm(true)}
            />
            {(showCreateForm || activeClient) && (
              <BrandProfileForm
                key={showCreateForm ? "new-brand" : (activeClient?.id ?? "new-brand")}
                initial={showCreateForm ? undefined : (activeClient ?? undefined)}
                onLogoUploaded={() => void refreshActiveClient()}
                onSave={(client) => {
                  setActiveClient(client);
                  setShowCreateForm(false);
                  setStep("brief");
                }}
              />
            )}
          </div>
        )}

        {step === "brief" && activeClient && (
          <CreativeBriefForm
            client={activeClient}
            activeFormat={activeFormat}
            onSubmit={async (request) => {
              await runSignalOps(request);
            }}
          />
        )}

        {step === "signalops" && signalOpsOutput && (
          <SignalOpsInsightsCard
            output={signalOpsOutput}
            lens={activeRequest?.creative_lens}
            onApprove={async (headlineIndex) => {
              if (!activeRequest) return;
              setError(null);
              const res = await fetch(
                `/api/sm/creative-requests/${activeRequest.id}/generate`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    platforms: activeRequest.platforms,
                    asset_types: ["post"],
                    headline_index: headlineIndex,
                  }),
                }
              );
              const json = (await res.json()) as {
                assets?: SMGeneratedAsset[];
                error?: string;
              };
              if (!res.ok) {
                setError(json.error ?? "Generation failed");
                return;
              }
              setGeneratedAssets(json.assets ?? []);
              setStep("assets");
            }}
            onEdit={() => setStep("brief")}
            onChangeBrand={handleStartOver}
          />
        )}

        {step === "assets" && activeClient && (
          <CreativePreviewGrid
            assets={generatedAssets}
            client={activeClient}
            onRegenerate={async (assetId, direction) => {
              const res = await fetch(`/api/sm/assets/${assetId}/regenerate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ direction: direction || undefined }),
              });
              const updated = (await res.json()) as SMGeneratedAsset & { error?: string };
              if (!res.ok) {
                console.error("[Redo] Failed:", updated.error);
                return;
              }
              setGeneratedAssets((prev) =>
                prev.map((a) => (a.id === assetId ? updated : a))
              );
            }}
            onNewBrief={handleNewBrief}
            onChangeBrand={handleStartOver}
          />
        )}
      </div>
    </div>
  );
}
