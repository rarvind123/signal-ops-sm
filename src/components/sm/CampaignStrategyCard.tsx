"use client";

import { btnPrimary, label } from "@/lib/sm/ui";
import type { SMCampaignStrategy } from "@/types/sm";

export default function CampaignStrategyCard({
  strategy,
  onGenerateCalendar,
  calendarLoading,
  hasCalendar,
}: {
  strategy: SMCampaignStrategy;
  onGenerateCalendar: () => void;
  calendarLoading?: boolean;
  hasCalendar?: boolean;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className={label}>Narrative theme</p>
        <h2 className="mt-2 text-2xl font-medium tracking-tight text-zinc-100">
          &ldquo;{strategy.narrative_theme}&rdquo;
        </h2>
        {strategy.campaign_tagline && (
          <p className="mt-2 text-sm text-zinc-500">{strategy.campaign_tagline}</p>
        )}
      </div>

      <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/30 px-4 py-4">
        <p className={`${label} mb-4`}>Story arc</p>
        <div className="flex flex-col gap-4">
          {strategy.story_arc.map((phase) => (
            <div
              key={phase.phase}
              className="border-l border-zinc-700 pl-4"
            >
              <p className="text-xs font-medium text-zinc-300">{phase.phase}</p>
              <p className="text-[10px] text-zinc-600">{phase.week_range}</p>
              <p className="mt-1 text-sm leading-relaxed text-zinc-400">{phase.description}</p>
              {phase.emotional_tone && (
                <p className="mt-1 text-xs text-zinc-600">{phase.emotional_tone}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/30 px-4 py-4">
        <p className={`${label} mb-3`}>Content pillars</p>
        <div className="flex flex-col gap-3">
          {strategy.content_pillars.map((pillar) => (
            <div key={pillar.name}>
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm text-zinc-200">{pillar.name}</p>
                <span className="text-xs tabular-nums text-zinc-600">{pillar.percentage}%</span>
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">{pillar.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/30 px-4 py-4">
        <p className={`${label} mb-3`}>Content mix</p>
        <div className="flex flex-col gap-2">
          {Object.entries(strategy.content_mix).map(([format, count]) =>
            count ? (
              <div
                key={format}
                className="flex items-center justify-between rounded border border-zinc-800/60 px-3 py-2"
              >
                <span className="text-sm capitalize text-zinc-400">
                  {format.replace("_", " ")}
                </span>
                <span className="text-sm tabular-nums text-zinc-200">{count} posts</span>
              </div>
            ) : null
          )}
        </div>
      </div>

      {strategy.strategic_notes && (
        <div>
          <p className={label}>Strategic notes</p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-500">{strategy.strategic_notes}</p>
        </div>
      )}

      <div className="flex gap-3">
        {!hasCalendar && strategy.narrative_theme?.trim() && (
          <button
            type="button"
            onClick={onGenerateCalendar}
            disabled={calendarLoading}
            className={btnPrimary}
          >
            {calendarLoading ? "Planning calendar…" : "Generate calendar"}
          </button>
        )}
        {hasCalendar && (
          <p className="text-sm text-zinc-500">Calendar ready — view the full schedule.</p>
        )}
      </div>
    </div>
  );
}
