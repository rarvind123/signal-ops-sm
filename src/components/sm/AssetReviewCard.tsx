"use client";

import type { SMGeneratedAsset } from "@/types/sm";
import { apiUrl } from "@/lib/base-path";

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending review", className: "text-zinc-400" },
  approved: { label: "Approved", className: "text-green-400" },
  rejected: { label: "Rejected", className: "text-red-400" },
  changes_requested: { label: "Changes requested", className: "text-amber-400" },
};

export default function AssetReviewCard({
  asset,
  token,
  onUpdate,
}: {
  asset: SMGeneratedAsset;
  token: string;
  onUpdate: (asset: SMGeneratedAsset) => void;
}) {
  const status = asset.approval_status ?? "pending";
  const statusMeta = STATUS_LABELS[status] ?? STATUS_LABELS.pending;

  async function submit(patch: {
    approval_status?: SMGeneratedAsset["approval_status"];
    client_comment?: string;
  }) {
    const res = await fetch(apiUrl(`/api/sm/review/${token}/assets/${asset.id}`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) return;
    const updated = (await res.json()) as SMGeneratedAsset;
    onUpdate(updated);
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-zinc-200">
            {asset.platform} · {asset.asset_type.replace("_", " ")}
          </p>
          {asset.explore_label && (
            <p className="mt-0.5 text-xs text-violet-400">{asset.explore_label}</p>
          )}
          <p className={`mt-1 text-xs ${statusMeta.className}`}>{statusMeta.label}</p>
        </div>
        {asset.headline && (
          <p className="max-w-xs text-right text-xs text-zinc-500">{asset.headline}</p>
        )}
      </div>

      {asset.storage_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={apiUrl(`/api/sm/assets/${asset.id}/preview?v=${asset.created_at}`}
          alt={asset.headline ?? "Creative preview"}
          className="aspect-square w-full rounded-lg object-cover"
        />
      ) : (
        <div className="flex aspect-square items-center justify-center rounded-lg bg-zinc-950 text-xs text-zinc-600">
          No image
        </div>
      )}

      {asset.client_comment && (
        <p className="rounded border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-400">
          {asset.client_comment}
        </p>
      )}

      <textarea
        defaultValue={asset.client_comment ?? ""}
        placeholder="Leave a comment for the team…"
        rows={2}
        className="w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-300 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
        onBlur={(e) => {
          const comment = e.target.value.trim();
          if (comment !== (asset.client_comment ?? "")) {
            void submit({ client_comment: comment });
          }
        }}
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void submit({ approval_status: "approved" })}
          className="rounded bg-green-700/80 px-3 py-1.5 text-xs text-white hover:bg-green-600"
        >
          Approve
        </button>
        <button
          type="button"
          onClick={() => void submit({ approval_status: "changes_requested" })}
          className="rounded border border-amber-700/60 px-3 py-1.5 text-xs text-amber-300 hover:bg-amber-950/40"
        >
          Request changes
        </button>
        <button
          type="button"
          onClick={() => void submit({ approval_status: "rejected" })}
          className="rounded border border-red-800/60 px-3 py-1.5 text-xs text-red-300 hover:bg-red-950/40"
        >
          Reject
        </button>
        <a
          href={apiUrl(`/api/sm/assets/${asset.id}/download`}
          className="ml-auto rounded border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
        >
          Download
        </a>
      </div>
    </div>
  );
}
