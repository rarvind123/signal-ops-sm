"use client";

import { useState } from "react";
import { btnPrimary, btnSecondary } from "@/lib/sm/ui";
import { FORMAT_COLORS, formatLabel } from "@/lib/sm/content-format-ui";
import type { SMCreativeBrief } from "@/types/sm";
import { apiUrl } from "@/lib/base-path";

export default function CreativeBriefCard({
  brief,
  onGenerated,
}: {
  brief: SMCreativeBrief;
  onGenerated?: () => void;
}) {
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/sm/briefs/${brief.id}/generate`), { method: "POST" });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        console.error(json.error);
        return;
      }
      onGenerated?.();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col rounded-lg border border-zinc-800/80 bg-zinc-900/30 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-[10px] tabular-nums text-zinc-600">
          POST #{String(brief.post_number).padStart(2, "0")}
        </span>
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] capitalize ${FORMAT_COLORS[brief.format]}`}
        >
          {formatLabel(brief.format)}
        </span>
      </div>

      <p className="text-sm text-zinc-200">&ldquo;{brief.hook}&rdquo;</p>
      <p className="mt-1 text-xs text-zinc-600">
        {brief.pillar} · {brief.objective}
      </p>

      {brief.structure.length > 0 && (
        <div className="mt-3 rounded border border-zinc-800/60 p-2">
          {brief.structure.slice(0, 3).map((s, i) => (
            <p key={i} className="text-xs text-zinc-600">
              {s.slide ? `Slide ${s.slide}` : s.element}: {s.content?.slice(0, 60)}
              {(s.content?.length ?? 0) > 60 ? "…" : ""}
            </p>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => void handleGenerate()}
        disabled={brief.status === "done" || loading}
        className={`${brief.status === "done" ? btnSecondary : btnPrimary} mt-4 w-full py-2 text-xs`}
      >
        {loading ? "Generating…" : brief.status === "done" ? "Generated" : "Generate creative"}
      </button>
    </div>
  );
}
