"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type {
  SMClient,
  SMCampaign,
  SMCreativeFormat,
  SMCreativeRequest,
  SMGeneratedAsset,
  SMSignalOpsOutput,
  SMVisualApproachMode,
} from "@/types/sm";
import BrandProfileForm from "@/components/sm/BrandProfileForm";
import CampaignBriefForm from "@/components/sm/CampaignBriefForm";
import ClientSelector from "@/components/sm/ClientSelector";
import CreativeBriefForm from "@/components/sm/CreativeBriefForm";
import CreativePreviewGrid from "@/components/sm/CreativePreviewGrid";
import ModePicker, { type SMMode } from "@/components/sm/ModePicker";
import SignalOpsInsightsCard from "@/components/sm/SignalOpsInsightsCard";
import VisualApproachCard from "@/components/sm/VisualApproachCard";
import { CREATIVE_FORMATS } from "@/lib/sm/creative-formats-ui";
import { btnGhost } from "@/lib/sm/ui";

type SMStep = "brand" | "brief" | "campaign_brief" | "signalops" | "assets";

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
    <nav className="flex items-center gap-1 text-xs">
      {steps.map((s, i) => {
        const isCompleted = i < currentIndex;
        const isCurrent = s.key === current;
        return (
          <span key={s.key} className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => isCompleted && onStepClick(s.key)}
              disabled={!isCompleted}
              className={`px-2 py-1 transition-colors ${
                isCurrent
                  ? "text-zinc-100"
                  : isCompleted
                    ? "cursor-pointer text-zinc-500 hover:text-zinc-300"
                    : "cursor-default text-zinc-700"
              }`}
            >
              {s.label}
            </button>
            {i < steps.length - 1 && <span className="text-zinc-800">/</span>}
          </span>
        );
      })}
    </nav>
  );
}

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState<SMMode | null>(null);
  const [step, setStep] = useState<SMStep>("brand");
  const [activeFormat, setActiveFormat] = useState<SMCreativeFormat>("social_media");
  const [showCreateForm, setShowCreateForm] = useState(true);
  const [activeClient, setActiveClient] = useState<SMClient | null>(null);
  const [activeRequest, setActiveRequest] = useState<SMCreativeRequest | null>(null);
  const [signalOpsOutput, setSignalOpsOutput] = useState<SMSignalOpsOutput | null>(null);
  const [generatedAssets, setGeneratedAssets] = useState<SMGeneratedAsset[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [signalopsLoading, setSignalopsLoading] = useState(false);
  const [selectedHeadline, setSelectedHeadline] = useState(0);
  const [generateLoading, setGenerateLoading] = useState(false);

  const formatMeta = CREATIVE_FORMATS.find((f) => f.id === activeFormat);

  function handleStartOver() {
    setMode(null);
    setStep("brand");
    setActiveFormat("social_media");
    setActiveClient(null);
    setActiveRequest(null);
    setSignalOpsOutput(null);
    setGeneratedAssets([]);
    setSelectedHeadline(0);
    setError(null);
    setShowCreateForm(true);
  }

  function goToBriefStep() {
    setStep(mode === "campaign" ? "campaign_brief" : "brief");
  }

  function handleNewBrief() {
    setStep("brief");
    setGeneratedAssets([]);
    setSignalOpsOutput(null);
    setActiveRequest(null);
    setSelectedHeadline(0);
    setError(null);
  }

  async function generateCreatives(
    visualApproachOverride?: SMVisualApproachMode,
    sceneDescriptionOverride?: string
  ) {
    if (!activeRequest) return;
    setError(null);
    setGenerateLoading(true);
    try {
      const res = await fetch(`/api/sm/creative-requests/${activeRequest.id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platforms: activeRequest.platforms,
          asset_types: ["post"],
          headline_index: selectedHeadline,
          visual_approach_override: visualApproachOverride,
          scene_description_override: sceneDescriptionOverride,
        }),
      });
      const json = (await res.json()) as {
        assets?: SMGeneratedAsset[];
        error?: string;
      };
      if (!res.ok) {
        throw new Error(json.error ?? "Generation failed");
      }
      setGeneratedAssets(json.assets ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerateLoading(false);
    }
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
    <div className="min-h-screen px-6 py-8 text-zinc-200 sm:px-10 sm:py-12">
      <div className="mx-auto flex max-w-2xl flex-col gap-10">
        {mode !== null && (
          <header className="flex items-start justify-between gap-6">
            <div>
              <Image
                src="/inventious-logo.png"
                alt="inventious"
                width={378}
                height={118}
                className="h-8 w-auto object-contain object-left"
                priority
              />
              <p className="mt-2 text-sm text-zinc-500">
                {mode === "campaign" ? "Social media campaign" : formatMeta?.label}
              </p>
            </div>
            <button type="button" onClick={handleStartOver} className={btnGhost}>
              Start over
            </button>
          </header>
        )}

        {mode === "single_post" && (
          <SMStepIndicator current={step} onStepClick={(s) => setStep(s)} />
        )}

        {error && (
          <div className="flex items-start justify-between gap-4 rounded-lg border border-red-500/10 bg-red-500/5 px-4 py-3 text-sm text-red-400/90">
            <span>{error}</span>
            {activeRequest && (
              <button
                type="button"
                disabled={signalopsLoading}
                onClick={() => void runSignalOps(activeRequest)}
                className="shrink-0 text-xs text-red-400/80 hover:text-red-300 disabled:opacity-50"
              >
                {signalopsLoading ? "…" : "Retry"}
              </button>
            )}
          </div>
        )}

        {mode === null && (
          <ModePicker
            onSelectFormat={(format) => {
              setActiveFormat(format);
              setMode("single_post");
              setStep("brand");
            }}
            onSelectSocialMode={(selected) => {
              setActiveFormat("social_media");
              setMode(selected);
              setStep("brand");
            }}
          />
        )}

        {mode !== null && step === "brand" && (
          <div className="flex flex-col gap-10">
            <ClientSelector
              onSelect={(client) => {
                setActiveClient(client);
                setShowCreateForm(false);
                goToBriefStep();
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
                  goToBriefStep();
                }}
              />
            )}
          </div>
        )}

        {step === "campaign_brief" && activeClient && mode === "campaign" && (
          <CampaignBriefForm
            client={activeClient}
            onSubmit={(campaign: SMCampaign) => {
              router.push(`/campaign/${campaign.id}/strategy`);
            }}
          />
        )}

        {step === "brief" && activeClient && mode === "single_post" && (
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
            onContinue={(headlineIndex) => {
              setSelectedHeadline(headlineIndex);
              setGeneratedAssets([]);
              setStep("assets");
            }}
            onEdit={() => setStep("brief")}
            onChangeBrand={handleStartOver}
          />
        )}

        {step === "assets" && activeClient && signalOpsOutput && (
          <div className="flex flex-col gap-8">
            <VisualApproachCard
              output={signalOpsOutput}
              onApprove={generateCreatives}
              loading={generateLoading}
              hasCreatives={generatedAssets.length > 0}
            />
            {generatedAssets.length > 0 && (
              <CreativePreviewGrid
                assets={generatedAssets}
                client={activeClient}
                headlineMeta={signalOpsOutput.headlines[selectedHeadline]}
                creativeFormat={activeRequest?.creative_format}
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
        )}
      </div>
    </div>
  );
}
