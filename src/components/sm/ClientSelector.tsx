"use client";

import { useEffect, useState } from "react";
import { btnGhost, label, sectionTitle } from "@/lib/sm/ui";
import type { SMClient } from "@/types/sm";

export default function ClientSelector({
  onSelect,
  onCreate,
}: {
  onSelect: (client: SMClient) => void;
  onCreate: () => void;
}) {
  const [clients, setClients] = useState<SMClient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/sm/clients");
        const data = (await res.json()) as SMClient[] | { error?: string };
        if (res.ok && Array.isArray(data)) setClients(data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <p className="text-sm text-zinc-600">Loading…</p>;
  }

  if (clients.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        No brands yet. Create one below.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className={sectionTitle}>Select brand</h2>
        <button type="button" onClick={onCreate} className={btnGhost}>
          New brand
        </button>
      </div>
      <div className="flex flex-col gap-1">
        {clients.map((client) => (
          <button
            key={client.id}
            type="button"
            onClick={() => onSelect(client)}
            className="rounded-lg border border-transparent px-3 py-3 text-left transition-colors hover:border-zinc-800 hover:bg-zinc-900/40"
          >
            <p className="text-sm font-medium text-zinc-100">{client.name}</p>
            {client.tagline && (
              <p className="mt-0.5 text-xs text-zinc-500 line-clamp-1">{client.tagline}</p>
            )}
          </button>
        ))}
      </div>
      <p className={label}>Or create a new profile</p>
    </div>
  );
}
