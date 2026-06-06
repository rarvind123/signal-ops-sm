"use client";

import { btnPrimary } from "@/lib/sm/ui";
import { FORMAT_COLORS, formatLabel } from "@/lib/sm/content-format-ui";
import type { SMCampaignCalendarItem } from "@/types/sm";

export default function CampaignCalendarView({
  items,
  onGenerateBriefs,
  briefsLoading,
  hasBriefs,
}: {
  items: SMCampaignCalendarItem[];
  onGenerateBriefs?: () => void;
  briefsLoading?: boolean;
  hasBriefs?: boolean;
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

      {onGenerateBriefs && !hasBriefs && (
        <button
          type="button"
          onClick={onGenerateBriefs}
          disabled={briefsLoading}
          className={`${btnPrimary} w-fit`}
        >
          {briefsLoading ? "Writing briefs…" : "Generate all briefs"}
        </button>
      )}
    </div>
  );
}
