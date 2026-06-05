"use client";

import { useEffect, useState } from "react";
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
    return <p className="text-sm text-zinc-500">Loading brands…</p>;
  }

  if (clients.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        No brand profiles yet. Create one below.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-zinc-300">Existing brands</h2>
        <button
          type="button"
          onClick={onCreate}
          className="text-xs text-violet-400 hover:text-violet-300"
        >
          + New brand
        </button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {clients.map((client) => (
          <button
            key={client.id}
            type="button"
            onClick={() => onSelect(client)}
            className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3 text-left hover:border-violet-500/40"
          >
            <p className="text-sm font-medium text-white">{client.name}</p>
            {client.tagline && (
              <p className="mt-1 text-xs text-zinc-500 line-clamp-1">{client.tagline}</p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
