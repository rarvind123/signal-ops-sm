"use client";

import { useEffect, useState } from "react";
import { btnPrimary } from "@/lib/sm/ui";
import type { SMGeneratedAsset } from "@/types/sm";
import { apiUrl } from "@/lib/base-path";

export default function ClientGallery({
  clientId,
  onProceed,
}: {
  clientId: string;
  onProceed: () => void;
}) {
  const [assets, setAssets] = useState<SMGeneratedAsset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch(apiUrl(`/api/sm/clients/${clientId}/gallery?limit=12`))
      .then((r) => r.json())
      .then((data: { assets?: SMGeneratedAsset[] }) => {
        setAssets(data.assets ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [clientId]);

  if (loading) return null;

  if (assets.length === 0) {
    return (
      <button type="button" onClick={onProceed} className={btnPrimary}>
        ✦ Create first post →
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-zinc-500">
          {assets.length} creatives made — keep the variety going
        </p>
        <button type="button" onClick={onProceed} className={btnPrimary}>
          ✦ New creative →
        </button>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {assets.map((asset) => (
          <div
            key={asset.id}
            className="relative aspect-square overflow-hidden rounded-lg bg-zinc-900"
          >
            {asset.storage_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={asset.storage_url}
                alt=""
                className="h-full w-full object-cover"
              />
            )}
            <div className="absolute bottom-1.5 left-1.5 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white">
              {asset.asset_type}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
