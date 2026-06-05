"use client";

import { useState } from "react";
import type { SMClient, SMGeneratedAsset } from "@/types/sm";

export default function PublishModal({
  asset,
  client,
  onClose,
}: {
  asset: SMGeneratedAsset;
  client: SMClient;
  onClose: () => void;
}) {
  const [socialAccountId, setSocialAccountId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handlePublish() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/sm/assets/${asset.id}/publish`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ social_account_id: socialAccountId || "placeholder" }),
      });
      const json = (await res.json()) as { error_message?: string; status?: string; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Publish failed");
      setMessage(
        json.error_message ??
          (json.status === "published" ? "Published successfully." : "Publish job queued.")
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 p-5">
        <h3 className="text-sm font-semibold text-white">Publish to social</h3>
        <p className="mt-2 text-xs text-zinc-400">
          {client.name} · {asset.platform} {asset.asset_type}
        </p>
        <p className="mt-3 text-xs text-zinc-500">
          Connect social accounts in a future release. For now, use Download and post manually.
        </p>
        <input
          value={socialAccountId}
          onChange={(e) => setSocialAccountId(e.target.value)}
          placeholder="Social account ID (optional)"
          className="mt-4 w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white"
        />
        {message && <p className="mt-3 text-xs text-amber-400">{message}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => void handlePublish()}
            disabled={loading}
            className="rounded bg-violet-600 px-3 py-1.5 text-xs text-white disabled:opacity-50"
          >
            {loading ? "Submitting…" : "Queue publish"}
          </button>
        </div>
      </div>
    </div>
  );
}
