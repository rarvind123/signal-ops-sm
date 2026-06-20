"use client";

import { useState } from "react";
import { APPROACH_LABELS } from "@/lib/sm/visual-approach-ui";
import { btnPrimary, chip, chipActive, field, label } from "@/lib/sm/ui";
import type { SMClient, SMSignalOpsOutput, SMVisualApproachMode } from "@/types/sm";
import LogoReadinessPanel from "./LogoReadinessPanel";

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/30 px-4 py-4">
      <p className={`${label} mb-3`}>{title}</p>
      {children}
    </div>
  );
}

export default function VisualApproachCard({
  output,
  client,
  includeLogo,
  onIncludeLogoChange,
  onLogoUploaded,
  creativeAngle,
  onCreativeAngleChange,
  onApprove,
  loading,
  hasCreatives,
}: {
  output: SMSignalOpsOutput;
  client: SMClient;
  includeLogo: boolean;
  onIncludeLogoChange: (value: boolean) => void;
  onLogoUploaded?: () => void;
  creativeAngle?: string;
  onCreativeAngleChange?: (value: string) => void;
  onApprove: (
    visualApproachOverride?: SMVisualApproachMode,
    sceneDescriptionOverride?: string
  ) => Promise<void>;
  loading?: boolean;
  hasCreatives?: boolean;
}) {
  const recommendedMode = output.visual_approach?.mode ?? "concept_first";
  const recommendedScene = output.visual_approach?.scene_description ?? "";

  const [selectedMode, setSelectedMode] = useState<SMVisualApproachMode>(recommendedMode);
  const [modeSceneDescription, setModeSceneDescription] = useState(recommendedScene);
  const [regeneratingScene, setRegeneratingScene] = useState(false);
  const [customAngleLocal, setCustomAngleLocal] = useState("");
  const [logoReady, setLogoReady] = useState(false);
  const braveScore = output.visual_approach?.brave_score ?? 5;

  const customAngle = creativeAngle ?? customAngleLocal;
  const setCustomAngle = onCreativeAngleChange ?? setCustomAngleLocal;
  const isFirstGeneration = !hasCreatives;
  const logoBlocks = isFirstGeneration && includeLogo && !logoReady;

  if (!output.visual_approach) return null;

  const isRecommended = selectedMode === recommendedMode;
  const displayScene =
    customAngle.trim() || modeSceneDescription || recommendedScene;

  async function handleModeChange(mode: SMVisualApproachMode) {
    setSelectedMode(mode);

    if (mode === recommendedMode) {
      setModeSceneDescription(recommendedScene);
      return;
    }

    setRegeneratingScene(true);
    try {
      const res = await fetch(
        `/api/sm/creative-requests/${output.request_id}/visual-approach`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode, signalops_id: output.id }),
        }
      );
      const data = (await res.json()) as { scene_description?: string; error?: string };
      if (res.ok && data.scene_description) {
        setModeSceneDescription(data.scene_description);
      }
    } catch (e) {
      console.error("Scene regen failed:", e);
    } finally {
      setRegeneratingScene(false);
    }
  }

  function handleApprove() {
    const sceneOverride = customAngle.trim()
      ? customAngle.trim()
      : selectedMode !== recommendedMode
        ? modeSceneDescription || undefined
        : undefined;

    const modeOverride = selectedMode !== recommendedMode ? selectedMode : undefined;

    void onApprove(modeOverride, sceneOverride);
  }

  return (
    <Panel title="Visual approach">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] tabular-nums ${
            braveScore >= 8
              ? "border-red-500/20 text-red-400/90"
              : braveScore >= 6
                ? "border-amber-500/20 text-amber-400/90"
                : "border-zinc-800 text-zinc-500"
          }`}
        >
          Brave {braveScore}/10
        </span>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {(Object.keys(APPROACH_LABELS) as SMVisualApproachMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => void handleModeChange(mode)}
            disabled={regeneratingScene || loading}
            className={`${chip} inline-flex items-center gap-1.5 disabled:opacity-50 ${
              selectedMode === mode ? chipActive : "hover:border-zinc-700"
            }`}
          >
            {APPROACH_LABELS[mode].label}
            {mode === recommendedMode && (
              <span className="text-[9px] font-medium uppercase tracking-wider text-zinc-500">
                Recommended
              </span>
            )}
          </button>
        ))}
      </div>

      <p className="text-xs leading-relaxed text-zinc-500">
        <span className="text-zinc-600">Why: </span>
        {isRecommended
          ? output.visual_approach.rationale
          : `${APPROACH_LABELS[selectedMode].description} Scene regenerated for this mode.`}
      </p>

      {isRecommended && output.visual_approach.impossible_element && (
        <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
          <p className="mb-1 text-[10px] uppercase tracking-wider text-amber-400/90">
            Impossible element
          </p>
          <p className="text-xs leading-relaxed text-zinc-300">
            {output.visual_approach.impossible_element}
          </p>
          {output.visual_approach.unstockable_test && (
            <p className="mt-2 border-t border-zinc-800/80 pt-2 text-xs italic text-zinc-600">
              {output.visual_approach.unstockable_test}
            </p>
          )}
        </div>
      )}

      {isRecommended && output.visual_approach.obvious_ideas_rejected?.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-zinc-600 hover:text-zinc-500">
            ↓ Ideas rejected ({output.visual_approach.obvious_ideas_rejected.length})
          </summary>
          <ul className="mt-1.5 flex flex-col gap-1">
            {output.visual_approach.obvious_ideas_rejected.map((idea, i) => (
              <li key={i} className="pl-2 text-xs text-zinc-600 line-through">
                {idea}
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="mt-3 rounded-lg border border-zinc-800/80 p-3">
        <p className="mb-1.5 text-[10px] uppercase tracking-wider text-zinc-600">
          Scene to generate
          {regeneratingScene && (
            <span className="ml-2 normal-case tracking-normal text-violet-400">
              regenerating…
            </span>
          )}
        </p>
        {regeneratingScene ? (
          <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-800" />
        ) : (
          <p className="font-mono text-xs leading-relaxed text-zinc-400">{displayScene}</p>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-1.5">
        <label htmlFor="custom-angle" className="text-xs text-zinc-500">
          Your creative angle{" "}
          <span className="text-zinc-700">— optional override</span>
        </label>
        <textarea
          id="custom-angle"
          value={customAngle}
          onChange={(e) => setCustomAngle(e.target.value)}
          placeholder="e.g. An old cracked chair, standing alone in afternoon light, no people, warm shadow on wall behind it…"
          rows={3}
          className={`${field} resize-none text-xs`}
        />
        {customAngle.trim() && (
          <p className="text-xs text-amber-400/90">
            Your direction will be used instead of the generated scene.
          </p>
        )}
      </div>

      {isFirstGeneration && (
        <div className="mt-4">
            <LogoReadinessPanel
              client={client}
              includeLogo={includeLogo}
              onIncludeLogoChange={onIncludeLogoChange}
              onValidationChange={(state) => setLogoReady(state.ready)}
              onLogoUploaded={onLogoUploaded}
            />
        </div>
      )}

      {logoBlocks && (
        <p className="mt-2 text-xs text-amber-400/90">
          Upload a working logo or uncheck &ldquo;Include logo&rdquo; before generating.
        </p>
      )}

      {hasCreatives && (
        <p className="mt-4 text-xs text-zinc-600">
          Not happy with the result? Adjust your creative angle above and regenerate — you&apos;ll
          stay on this page.
        </p>
      )}

      <button
        type="button"
        onClick={handleApprove}
        disabled={loading || regeneratingScene || logoBlocks}
        className={`${btnPrimary} mt-4`}
      >
        {loading
          ? "Generating…"
          : hasCreatives
            ? customAngle.trim()
              ? "Regenerate with your angle"
              : "Regenerate creatives"
            : "Approve & generate creatives"}
      </button>
    </Panel>
  );
}
