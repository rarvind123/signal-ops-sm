"use client";

import { useState } from "react";
import { btnPrimary, btnSecondary, field, sectionTitle } from "@/lib/sm/ui";
import type { SMClient, SMGeneratedAsset } from "@/types/sm";
import { apiUrl } from "@/lib/base-path";

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
      const res = await fetch(apiUrl(`/api/sm/assets/${asset.id}/publish`), {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg border border-zinc-800/80 bg-zinc-950 p-5">
        <h3 className={sectionTitle}>Publish</h3>
        <p className="mt-2 text-xs text-zinc-500">
          {client.name} · {asset.platform} {asset.asset_type}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-zinc-500">
          Social account connections are coming soon. Download the creative and post manually for now.
        </p>
        <input
          value={socialAccountId}
          onChange={(e) => setSocialAccountId(e.target.value)}
          placeholder="Social account ID (optional)"
          className={`${field} mt-4`}
        />
        {message && <p className="mt-3 text-xs text-zinc-400">{message}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className={`${btnSecondary} text-xs`}>
            Close
          </button>
          <button
            type="button"
            onClick={() => void handlePublish()}
            disabled={loading}
            className={`${btnPrimary} text-xs`}
          >
            {loading ? "Submitting…" : "Queue publish"}
          </button>
        </div>
      </div>
    </div>
  );
}
