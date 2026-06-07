"use client";

import Link from "next/link";
import { btnSecondary } from "@/lib/sm/ui";
import { FORMAT_COLORS, formatLabel } from "@/lib/sm/content-format-ui";
import type { SMCampaignCalendarItem } from "@/types/sm";

export default function CampaignCalendarView({
  items,
  campaignId,
  briefsReady = 0,
  briefsTotal = 0,
  approvedCount = 0,
  reviewedCount = 0,
  batchRunning = false,
  onRetryBatch,
  batchRetrying = false,
}: {
  items: SMCampaignCalendarItem[];
  campaignId: string;
  briefsReady?: number;
  briefsTotal?: number;
  approvedCount?: number;
  reviewedCount?: number;
  batchRunning?: boolean;
  onRetryBatch?: () => void;
  batchRetrying?: boolean;
}) {
  const byWeek = items.reduce(
    (acc, item) => {
      const week = item.week_number;
      if (!acc[week]) acc[week] = [];
      acc[week].push(item);
      return acc;
    },
    {} as Record<number, SMCampaignCalendarItem[]>
  );

  return (
    <div className="flex flex-col gap-8">
      {(batchRunning || briefsReady > 0) && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 px-4 py-3 text-sm text-zinc-400">
          {batchRunning ? (
            <p>
              Writing briefs… {briefsReady}/{briefsTotal}
            </p>
          ) : (
            <p>
              {briefsReady} briefs ready
              {reviewedCount > 0 && ` · ${reviewedCount}/${briefsTotal} reviewed`}
              {approvedCount > 0 && ` · ${approvedCount} approved`}
            </p>
          )}
        </div>
      )}

      {Object.keys(byWeek)
        .map(Number)
        .sort((a, b) => a - b)
        .map((week) => (
          <div key={week}>
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
              Week {week}
            </p>
            <div className="flex flex-col gap-2">
              {byWeek[week].map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 rounded-lg border border-zinc-800/80 bg-zinc-900/30 px-4 py-3"
                >
                  <span className="shrink-0 text-xs tabular-nums text-zinc-600">
                    #{String(item.post_number).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] capitalize ${FORMAT_COLORS[item.format]}`}
                      >
                        {formatLabel(item.format)}
                      </span>
                      {item.pillar && (
                        <span className="text-[10px] text-zinc-600">{item.pillar}</span>
                      )}
                      {item.story_phase && (
                        <span className="text-[10px] text-zinc-700">{item.story_phase}</span>
                      )}
                    </div>
                    {item.strategic_purpose && (
                      <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                        {item.strategic_purpose}
                      </p>
                    )}
                    {item.suggested_date && (
                      <p className="mt-1 text-[10px] text-zinc-700">{item.suggested_date}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

      <div className="flex flex-wrap items-center gap-3">
        {!batchRunning && briefsReady > 0 && (
          <Link
            href={`/campaign/${campaignId}/review`}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500"
          >
            Review briefs →
          </Link>
        )}
        {onRetryBatch && (
          <button
            type="button"
            onClick={onRetryBatch}
            disabled={batchRetrying || batchRunning}
            className={`${btnSecondary} w-fit`}
          >
            {batchRetrying ? "Retrying briefs…" : "Retry brief generation"}
          </button>
        )}
      </div>
    </div>
  );
}
