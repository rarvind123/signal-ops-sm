"use client";

import { useState } from "react";
import { APPROACH_LABELS } from "@/lib/sm/visual-approach-ui";
import { btnPrimary, chip, chipActive, label } from "@/lib/sm/ui";
import type { SMSignalOpsOutput, SMVisualApproachMode } from "@/types/sm";

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
  onApprove,
  loading,
  hasCreatives,
}: {
  output: SMSignalOpsOutput;
  onApprove: (visualApproachOverride?: SMVisualApproachMode) => Promise<void>;
  loading?: boolean;
  hasCreatives?: boolean;
}) {
  const recommendedMode = output.visual_approach?.mode ?? "concept_first";
  const [selectedMode, setSelectedMode] = useState<SMVisualApproachMode>(recommendedMode);
  const braveScore = output.visual_approach?.brave_score ?? 5;

  if (!output.visual_approach) return null;

  const isRecommended = selectedMode === recommendedMode;

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
            onClick={() => setSelectedMode(mode)}
            className={`${chip} inline-flex items-center gap-1.5 ${
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
          : `Override — ${APPROACH_LABELS[selectedMode].description} Scene uses recommended direction until you regenerate strategy.`}
      </p>

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

      {isRecommended && output.visual_approach.scene_description && (
        <div className="mt-3 border-t border-zinc-800/80 pt-3">
          <p className="mb-1 text-[10px] uppercase tracking-wider text-zinc-600">
            Scene to generate
          </p>
          <p className="font-mono text-xs leading-relaxed text-zinc-400">
            {output.visual_approach.scene_description}
          </p>
        </div>
      )}

      {!hasCreatives && (
        <button
          type="button"
          onClick={() =>
            void onApprove(isRecommended ? undefined : selectedMode)
          }
          disabled={loading}
          className={`${btnPrimary} mt-4`}
        >
          {loading ? "Generating…" : "Approve & generate creatives"}
        </button>
      )}

      {hasCreatives && (
        <p className="mt-4 text-xs text-zinc-600">
          Creatives generated with{" "}
          {isRecommended ? "recommended" : APPROACH_LABELS[selectedMode].label} approach.
        </p>
      )}
    </Panel>
  );
}
