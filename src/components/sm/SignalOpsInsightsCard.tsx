"use client";

import { useState } from "react";
import { CREATIVE_LENSES } from "@/lib/sm/creative-lenses-ui";
import { btnPrimary, btnSecondary, label, sectionTitle } from "@/lib/sm/ui";
import type { SMCreativeLens, SMSignalOpsOutput } from "@/types/sm";

function Panel({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border border-zinc-800/80 bg-zinc-900/30 px-4 py-4 ${className}`}>
      <p className={`${label} mb-3`}>{title}</p>
      {children}
    </div>
  );
}

export default function SignalOpsInsightsCard({
  output,
  lens,
  onApprove,
  onEdit,
  onChangeBrand,
}: {
  output: SMSignalOpsOutput;
  lens?: SMCreativeLens;
  onApprove: (headlineIndex: number) => Promise<void>;
  onEdit: () => void;
  onChangeBrand?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [selectedHeadline, setSelectedHeadline] = useState(0);
  const lensName = lens ? CREATIVE_LENSES.find((l) => l.id === lens)?.name : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className={sectionTitle}>Strategy</h2>
        <div className="flex flex-wrap gap-2">
          {lensName && lens !== "signalops" && (
            <span className={`${label} normal-case tracking-normal text-zinc-400`}>
              {lensName}
            </span>
          )}
        </div>
      </div>

      {output.insight_bridge && (
        <Panel title="Insight bridge">
          <div className="flex flex-col gap-4">
            <div>
              <p className="mb-1 text-xs text-zinc-600">Human truth</p>
              <p className="text-sm leading-relaxed text-zinc-300">
                {output.insight_bridge.human_truth}
              </p>
            </div>
            <div className="h-px bg-zinc-800/80" />
            <div>
              <p className="mb-1 text-xs text-zinc-600">Brand truth</p>
              <p className="text-sm leading-relaxed text-zinc-300">
                {output.insight_bridge.brand_truth}
              </p>
            </div>
            <div className="h-px bg-zinc-800/80" />
            <div>
              <p className="mb-1 text-xs text-zinc-600">Creative tension</p>
              <p className="text-sm font-medium leading-relaxed text-zinc-200">
                {output.insight_bridge.creative_tension}
              </p>
            </div>
          </div>
        </Panel>
      )}

      <Panel title="Campaign theme">
        <p className="text-sm text-zinc-200">{output.theme}</p>
      </Panel>

      {output.be_trigger?.label && (
        <Panel title="Psychological trigger">
          <p className="text-sm font-medium text-zinc-200">{output.be_trigger.label}</p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-500">
            {output.be_trigger.rationale}
          </p>
          <p className="mt-2 text-sm text-zinc-400">{output.be_trigger.application}</p>
        </Panel>
      )}

      <Panel title="Visual direction">
        <p className="text-sm leading-relaxed text-zinc-400">{output.visual_direction}</p>
      </Panel>

      <Panel title="Headlines">
        <div className="flex flex-col gap-2">
          {output.headlines.map((h, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSelectedHeadline(i)}
              className={`w-full rounded-lg border px-4 py-3 text-left transition-colors ${
                selectedHeadline === i
                  ? "border-zinc-500 bg-zinc-800/60"
                  : "border-zinc-800/80 hover:border-zinc-700"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-1 h-3.5 w-3.5 shrink-0 rounded-full border ${
                    selectedHeadline === i ? "border-zinc-100 bg-zinc-100" : "border-zinc-600"
                  }`}
                />
                <div className="flex-1">
                  <p className="text-sm text-zinc-100">&ldquo;{h.text}&rdquo;</p>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-500">{h.rationale}</p>
                  {h.be_trigger && (
                    <span className="mt-2 inline-block text-xs text-zinc-600">{h.be_trigger}</span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </Panel>

      <div className="grid gap-3 sm:grid-cols-2">
        <Panel title="Color direction">
          <p className="text-sm text-zinc-400">{output.color_recommendation}</p>
        </Panel>
        <Panel title="Creative notes">
          <p className="text-sm text-zinc-400">{output.creative_notes}</p>
        </Panel>
      </div>

      {Object.keys(output.platform_adaptations).length > 0 && (
        <Panel title="Platform adaptations">
          <div className="flex flex-col gap-2">
            {Object.entries(output.platform_adaptations).map(([platform, note]) => (
              <div key={platform} className="flex gap-3 text-sm">
                <span className="w-20 shrink-0 capitalize text-zinc-600">{platform}</span>
                <span className="text-zinc-400">{note}</span>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {output.cultural_resonance?.sensitivity_flags?.length > 0 && (
        <Panel title="Cultural sensitivity" className="border-amber-500/10">
          <ul className="flex flex-col gap-1">
            {output.cultural_resonance.sensitivity_flags.map((flag, i) => (
              <li key={i} className="text-sm text-amber-200/80">
                {flag}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {output.lions_score && (
        <Panel title="Quality score">
          <div className="mb-4 flex items-baseline justify-between">
            <span className="text-2xl font-medium tabular-nums text-zinc-100">
              {output.lions_score.overall}
            </span>
            <span className="text-xs text-zinc-600">out of 10</span>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {(["distinct", "truthful", "brave", "crafted"] as const).map((dim) => (
              <div key={dim} className="flex flex-col gap-1">
                <div className="h-px w-full bg-zinc-800">
                  <div
                    className="h-px bg-zinc-400"
                    style={{ width: `${(output.lions_score[dim] / 10) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] capitalize text-zinc-600">{dim}</span>
                <span className="text-xs tabular-nums text-zinc-400">
                  {output.lions_score[dim]}
                </span>
              </div>
            ))}
          </div>
          {output.lions_score.improvement_note && (
            <p className="mt-4 border-t border-zinc-800/80 pt-3 text-xs leading-relaxed text-zinc-500">
              {output.lions_score.improvement_note}
            </p>
          )}
        </Panel>
      )}

      <div className="flex flex-wrap gap-3 pt-2">
        <button type="button" onClick={onEdit} className={btnSecondary}>
          Edit brief
        </button>
        {onChangeBrand && (
          <button type="button" onClick={onChangeBrand} className={btnSecondary}>
            Change brand
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            void onApprove(selectedHeadline).finally(() => setLoading(false));
          }}
          disabled={loading}
          className={`${btnPrimary} flex-1 sm:flex-none`}
        >
          {loading ? "Generating…" : "Generate creatives"}
        </button>
      </div>
    </div>
  );
}
