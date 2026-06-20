"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
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
import AdminPanel from "@/components/sm/AdminPanel";
import ClientGallery from "@/components/sm/ClientGallery";
import { CREATIVE_FORMATS } from "@/lib/sm/creative-formats-ui";
import { SIGNALOPS_TM } from "@/lib/sm/ui";

type SMStep = "brand" | "brief" | "campaign_brief" | "signalops" | "assets";

function SMStepIndicator({
  current,
  onStepClick,
  reachableSteps,
}: {
  current: SMStep;
  onStepClick: (step: SMStep) => void;
  reachableSteps: Set<SMStep>;
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
        const canNavigate = s.key !== current && reachableSteps.has(s.key);
        return (
          <span key={s.key} className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => canNavigate && onStepClick(s.key)}
              disabled={!canNavigate}
              className={`px-2 py-1 transition-colors ${
                isCurrent
                  ? "text-zinc-100"
                  : canNavigate
                    ? "cursor-pointer text-zinc-500 hover:text-zinc-300"
                    : isCompleted
                      ? "text-zinc-600"
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
  const [includeLogoOnPoster, setIncludeLogoOnPoster] = useState(true);
  const [creativeAngle, setCreativeAngle] = useState("");
  const [showAdminPrompt, setShowAdminPrompt] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState(false);

  const formatMeta = CREATIVE_FORMATS.find((f) => f.id === activeFormat);

  const reachableSteps = useMemo(() => {
    const steps = new Set<SMStep>(["brand"]);
    if (activeClient) steps.add("brief");
    if (activeRequest) {
      steps.add("brief");
      steps.add("signalops");
    }
    if (activeRequest && signalOpsOutput) steps.add("assets");
    return steps;
  }, [activeClient, activeRequest, signalOpsOutput]);

  function tryAdminLogin() {
    if (adminPassword === "Mumbai") {
      setShowAdmin(true);
      setShowAdminPrompt(false);
      setAdminPassword("");
      setAdminError(false);
    } else {
      setAdminError(true);
    }
  }

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
    setIncludeLogoOnPoster(true);
    setCreativeAngle("");
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
    setIncludeLogoOnPoster(true);
    setCreativeAngle("");
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
      await refreshActiveClient();
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
        throw new Error(output.error ?? `${SIGNALOPS_TM} failed`);
      }
      setSignalOpsOutput(output);
      setStep("signalops");
    } catch (e) {
      setError(e instanceof Error ? e.message : `${SIGNALOPS_TM} failed`);
    } finally {
      setSignalopsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#060608]">
      <div
        className={`flex-1 px-6 py-8 sm:px-10 sm:py-12 ${mode === null ? "home-surface" : "text-zinc-200"}`}
      >
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
            {step !== "brand" && (
              <button
                type="button"
                onClick={handleStartOver}
                className="text-xs text-zinc-600 transition-colors hover:text-zinc-400"
              >
                ← Start over
              </button>
            )}
          </header>
        )}

        {showAdminPrompt && !showAdmin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="flex w-80 flex-col gap-4 rounded-2xl border border-zinc-700 bg-zinc-900 p-6">
              <h2 className="text-sm font-medium text-white">Admin access</h2>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") tryAdminLogin();
                  if (e.key === "Escape") {
                    setShowAdminPrompt(false);
                    setAdminPassword("");
                    setAdminError(false);
                  }
                }}
                autoFocus
                placeholder="Password"
                className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-zinc-500 focus:outline-none"
              />
              {adminError && <p className="text-xs text-red-400">Incorrect password</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAdminPrompt(false);
                    setAdminPassword("");
                    setAdminError(false);
                  }}
                  className="flex-1 rounded border border-zinc-700 py-1.5 text-xs text-zinc-400"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={tryAdminLogin}
                  className="flex-1 rounded bg-violet-600 py-1.5 text-xs text-white"
                >
                  Enter
                </button>
              </div>
            </div>
          </div>
        )}

        {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}

        {mode === "single_post" && (
          <SMStepIndicator
            current={step}
            reachableSteps={reachableSteps}
            onStepClick={(s) => setStep(s)}
          />
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
              }}
              onCreate={() => {
                setShowCreateForm(true);
                setActiveClient(null);
              }}
            />
            {showCreateForm && (
              <BrandProfileForm
                key="new-brand"
                onLogoUploaded={() => void refreshActiveClient()}
                onSave={(client, options) => {
                  setActiveClient(client);
                  if (options?.includeLogo !== undefined) {
                    setIncludeLogoOnPoster(options.includeLogo);
                  }
                  setShowCreateForm(false);
                }}
              />
            )}
            {activeClient && !showCreateForm && (
              <ClientGallery clientId={activeClient.id} onProceed={goToBriefStep} />
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
            initialRequest={activeRequest}
            includeLogo={includeLogoOnPoster}
            onIncludeLogoChange={setIncludeLogoOnPoster}
            onLogoUploaded={() => void refreshActiveClient()}
            onSubmit={async (request, options) => {
              if (options?.includeLogo !== undefined) {
                setIncludeLogoOnPoster(options.includeLogo);
              }
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
            onRedo={(newOutput) => setSignalOpsOutput(newOutput)}
          />
        )}

        {step === "assets" && activeClient && signalOpsOutput && (
          <div className="flex flex-col gap-8">
            <VisualApproachCard
              output={signalOpsOutput}
              client={activeClient}
              includeLogo={includeLogoOnPoster}
              onIncludeLogoChange={setIncludeLogoOnPoster}
              onLogoUploaded={() => void refreshActiveClient()}
              creativeAngle={creativeAngle}
              onCreativeAngleChange={setCreativeAngle}
              onApprove={generateCreatives}
              loading={generateLoading}
              hasCreatives={generatedAssets.length > 0}
            />
            {generatedAssets.length > 0 && (
              <CreativePreviewGrid
                assets={generatedAssets}
                client={activeClient}
                includeLogo={includeLogoOnPoster}
                headlineMeta={signalOpsOutput.headlines[selectedHeadline]}
                visualApproach={signalOpsOutput.visual_approach}
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

      <footer className="mt-auto border-t border-zinc-800/60 px-6 py-5">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image
              src="/inventious-logo.png"
              alt="inventious"
              width={120}
              height={40}
              className="h-5 w-auto object-contain object-left opacity-60"
            />
            <span className="text-xs text-zinc-700">·</span>
            <span className="text-xs text-zinc-600">{SIGNALOPS_TM} Creative Engine</span>
          </div>

          <nav className="flex items-center gap-5">
            {[
              {
                label: "Feedback",
                href: `mailto:hello@inventious.in?subject=${encodeURIComponent(`${SIGNALOPS_TM} Feedback`)}`,
              },
              { label: "Support", href: "mailto:hello@inventious.in" },
              { label: "Privacy", href: "#" },
            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-xs text-zinc-600 transition-colors hover:text-zinc-400"
              >
                {link.label}
              </a>
            ))}
            <button
              type="button"
              onClick={() => setShowAdminPrompt(true)}
              className="text-xs text-zinc-600 transition-colors hover:text-zinc-400"
            >
              Admin
            </button>
          </nav>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
              <span className="text-xs text-zinc-600">All systems operational</span>
            </div>
            <span className="text-xs text-zinc-700">© 2026 Inventious</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
