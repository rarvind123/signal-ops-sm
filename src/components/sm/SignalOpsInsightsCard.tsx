"use client";

import { useState } from "react";
import { CREATIVE_LENSES } from "@/lib/sm/creative-lenses-ui";
import type { SMCreativeLens, SMSignalOpsOutput } from "@/types/sm";

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

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">✦ SignalOps Creative Direction</h2>
        <div className="flex items-center gap-2">
          {lens && lens !== "signalops" && (
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs text-amber-400">
              {CREATIVE_LENSES.find((l) => l.id === lens)?.name}
            </span>
          )}
          <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs text-violet-400">
            Strategic Brief Ready
          </span>
        </div>
      </div>

      {output.insight_bridge && (
        <div className="rounded-xl border border-amber-500/20 bg-zinc-900 p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-sm text-amber-400">⚡</span>
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">
              Insight Bridge
            </p>
            <span className="ml-auto text-xs text-zinc-600">The idea beneath the idea</span>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              <span className="w-28 shrink-0 pt-0.5 text-xs text-zinc-500">Human Truth</span>
              <p className="text-sm leading-relaxed text-zinc-300">
                {output.insight_bridge.human_truth}
              </p>
            </div>
            <div className="h-px w-full bg-zinc-800" />
            <div className="flex gap-3">
              <span className="w-28 shrink-0 pt-0.5 text-xs text-zinc-500">Brand Truth</span>
              <p className="text-sm leading-relaxed text-zinc-300">
                {output.insight_bridge.brand_truth}
              </p>
            </div>
            <div className="h-px w-full bg-zinc-800" />
            <div className="flex gap-3">
              <span className="w-28 shrink-0 pt-0.5 text-xs font-medium text-amber-400">
                Creative Tension
              </span>
              <p className="text-sm font-medium leading-relaxed text-amber-200">
                {output.insight_bridge.creative_tension}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-zinc-700 bg-zinc-800/60 p-4">
        <p className="mb-1 text-xs uppercase tracking-wider text-zinc-500">Campaign Theme</p>
        <p className="font-medium text-white">{output.theme}</p>
      </div>

      {output.be_trigger?.label && (
        <div className="flex items-start gap-3 rounded-xl border border-zinc-700 bg-zinc-800/40 p-4">
          <div className="flex flex-1 flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-violet-500/30 bg-violet-500/20 px-2.5 py-0.5 text-xs font-medium text-violet-300">
                {output.be_trigger.label}
              </span>
              <span className="text-xs text-zinc-500">psychological trigger</span>
            </div>
            <p className="mt-1 text-xs text-zinc-400">{output.be_trigger.rationale}</p>
            <p className="mt-0.5 text-xs text-zinc-300">
              <span className="text-zinc-500">Apply: </span>
              {output.be_trigger.application}
            </p>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-zinc-700 bg-zinc-800/60 p-4">
        <p className="mb-2 text-xs uppercase tracking-wider text-zinc-500">Visual Direction</p>
        <p className="text-sm leading-relaxed text-zinc-300">{output.visual_direction}</p>
      </div>

      <div className="rounded-xl border border-zinc-700 bg-zinc-800/60 p-4">
        <p className="mb-3 text-xs uppercase tracking-wider text-zinc-500">
          Headline Concepts — select one for generation
        </p>
        <div className="flex flex-col gap-2">
          {output.headlines.map((h, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSelectedHeadline(i)}
              className={`w-full rounded-lg border px-4 py-3 text-left transition-all ${
                selectedHeadline === i
                  ? "border-violet-500 bg-violet-500/10"
                  : "border-zinc-700 hover:border-zinc-500"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                    selectedHeadline === i ? "border-violet-500" : "border-zinc-600"
                  }`}
                >
                  {selectedHeadline === i && (
                    <div className="h-2 w-2 rounded-full bg-violet-500" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">&ldquo;{h.text}&rdquo;</p>
                  <p className="mt-0.5 text-xs text-zinc-500">{h.rationale}</p>
                  {h.be_trigger && (
                    <span className="mt-1.5 inline-block rounded border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400">
                      {h.be_trigger}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-zinc-700 bg-zinc-800/60 p-4">
          <p className="mb-2 text-xs uppercase tracking-wider text-zinc-500">Color Direction</p>
          <p className="text-sm text-zinc-300">{output.color_recommendation}</p>
        </div>
        <div className="rounded-xl border border-zinc-700 bg-zinc-800/60 p-4">
          <p className="mb-2 text-xs uppercase tracking-wider text-zinc-500">Creative Notes</p>
          <p className="text-sm text-zinc-300">{output.creative_notes}</p>
        </div>
      </div>

      {Object.keys(output.platform_adaptations).length > 0 && (
        <div className="rounded-xl border border-zinc-700 bg-zinc-800/60 p-4">
          <p className="mb-3 text-xs uppercase tracking-wider text-zinc-500">Platform Adaptations</p>
          <div className="flex flex-col gap-2">
            {Object.entries(output.platform_adaptations).map(([platform, note]) => (
              <div key={platform} className="flex gap-3">
                <span className="w-20 shrink-0 text-xs capitalize text-zinc-500">{platform}</span>
                <span className="text-sm text-zinc-300">{note}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {output.cultural_resonance?.sensitivity_flags?.length > 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <p className="mb-2 text-xs uppercase tracking-wider text-amber-400">
            ⚠ Cultural Sensitivity
          </p>
          <ul className="flex flex-col gap-1">
            {output.cultural_resonance.sensitivity_flags.map((flag, i) => (
              <li key={i} className="text-xs text-amber-200">
                • {flag}
              </li>
            ))}
          </ul>
        </div>
      )}

      {output.lions_score && (
        <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs uppercase tracking-wider text-zinc-500">Creative Quality Score</p>
            <span
              className={`text-sm font-bold ${
                output.lions_score.overall >= 8
                  ? "text-green-400"
                  : output.lions_score.overall >= 6.5
                    ? "text-amber-400"
                    : "text-red-400"
              }`}
            >
              {output.lions_score.overall}/10
            </span>
          </div>
          <div className="mb-3 grid grid-cols-4 gap-2">
            {(["distinct", "truthful", "brave", "crafted"] as const).map((dim) => (
              <div key={dim} className="flex flex-col items-center gap-1">
                <div className="h-1.5 w-full rounded-full bg-zinc-800">
                  <div
                    className="h-1.5 rounded-full bg-violet-500"
                    style={{ width: `${(output.lions_score[dim] / 10) * 100}%` }}
                  />
                </div>
                <span className="text-xs capitalize text-zinc-500">{dim}</span>
                <span className="text-xs text-zinc-300">{output.lions_score[dim]}</span>
              </div>
            ))}
          </div>
          {output.lions_score.improvement_note && (
            <p className="mt-1 border-t border-zinc-800 pt-2 text-xs text-zinc-500">
              <span className="text-zinc-400">To reach 9+: </span>
              {output.lions_score.improvement_note}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onEdit}
          className="rounded border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:border-zinc-500 hover:text-white"
        >
          ← Edit Brief
        </button>
        {onChangeBrand && (
          <button
            type="button"
            onClick={onChangeBrand}
            className="rounded border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:border-zinc-500 hover:text-white"
          >
            ← Change Brand
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            void onApprove(selectedHeadline).finally(() => setLoading(false));
          }}
          disabled={loading}
          className="flex-1 rounded bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
        >
          {loading ? "Generating creatives..." : "✦ Generate Creatives →"}
        </button>
      </div>
    </div>
  );
}
