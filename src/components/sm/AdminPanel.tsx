"use client";

import { useEffect, useState } from "react";
import { label } from "@/lib/sm/ui";

const ADMIN_KEY = "Mumbai";

type ClientStat = {
  client_id: string;
  name: string;
  images_generated: number;
  signalops_runs: number;
  estimated_cost_usd: string;
};

type Summary = {
  total_clients: number;
  total_images_generated: number;
  total_signalops_runs: number;
  total_cost_usd: string;
  image_cost_usd: string;
  signalops_cost_usd: string;
};

type Alert = {
  service: string;
  status: "ok" | "low" | "critical" | "unknown";
  message: string;
};

const statusColor: Record<string, string> = {
  ok: "text-green-400 bg-green-500/10 border-green-500/20",
  low: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  critical: "text-red-400 bg-red-500/10 border-red-500/20",
  unknown: "text-zinc-400 bg-zinc-800 border-zinc-700",
};

export default function AdminPanel({ onClose }: { onClose: () => void }) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [clients, setClients] = useState<ClientStat[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const headers = { "x-admin-key": ADMIN_KEY };
        const [statsRes, creditsRes] = await Promise.all([
          fetch("/api/admin/stats", { headers }),
          fetch("/api/admin/credits", { headers }),
        ]);
        const stats = (await statsRes.json()) as {
          summary?: Summary;
          per_client?: ClientStat[];
          error?: string;
        };
        const credits = (await creditsRes.json()) as {
          alerts?: Alert[];
          error?: string;
        };
        if (!statsRes.ok) throw new Error(stats.error ?? "Failed to load stats");
        if (!creditsRes.ok) throw new Error(credits.error ?? "Failed to load credits");
        setSummary(stats.summary ?? null);
        setClients(stats.per_client ?? []);
        setAlerts(credits.alerts ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load admin data");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-white">Admin Panel</h1>
            <p className="text-sm text-zinc-500">SignalOps — Inventious</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST" });
                window.location.href = "/login";
              }}
              className="text-xs text-zinc-600 transition-colors hover:text-red-400"
            >
              Log out
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-zinc-500 transition-colors hover:text-white"
            >
              Close
            </button>
          </div>
        </div>

        {loading && <p className="text-sm text-zinc-500">Loading…</p>}
        {error && (
          <p className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400/90">
            {error}
          </p>
        )}

        {!loading && !error && (
          <>
            {alerts.some((a) => a.status !== "ok") && (
              <div className="flex flex-col gap-2">
                <p className={label}>Service alerts</p>
                {alerts
                  .filter((a) => a.status !== "ok")
                  .map((alert) => (
                    <div
                      key={alert.service}
                      className={`rounded-lg border px-4 py-3 text-sm ${statusColor[alert.status]}`}
                    >
                      <span className="font-medium">{alert.service}</span>
                      <span className="mx-2">—</span>
                      {alert.message}
                    </div>
                  ))}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <p className={label}>Service status</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {alerts.map((alert) => (
                  <div
                    key={alert.service}
                    className={`rounded-lg border px-3 py-2.5 ${statusColor[alert.status]}`}
                  >
                    <p className="text-xs font-medium">{alert.service}</p>
                    <p className="mt-0.5 text-xs opacity-70">{alert.status.toUpperCase()}</p>
                  </div>
                ))}
              </div>
            </div>

            {summary && (
              <div className="flex flex-col gap-2">
                <p className={label}>Overview</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {[
                    { label: "Clients", value: summary.total_clients },
                    { label: "Images generated", value: summary.total_images_generated },
                    { label: "SignalOps runs", value: summary.total_signalops_runs },
                    { label: "Image cost", value: `$${summary.image_cost_usd}` },
                    { label: "AI cost", value: `$${summary.signalops_cost_usd}` },
                    {
                      label: "Total cost",
                      value: `$${summary.total_cost_usd}`,
                      highlight: true,
                    },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className={`rounded-lg border px-4 py-3 ${
                        stat.highlight
                          ? "border-violet-500/30 bg-violet-500/5"
                          : "border-zinc-700 bg-zinc-900"
                      }`}
                    >
                      <p className="text-xs text-zinc-500">{stat.label}</p>
                      <p
                        className={`mt-0.5 text-lg font-semibold ${
                          stat.highlight ? "text-violet-300" : "text-white"
                        }`}
                      >
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <p className={label}>Per client</p>
              <div className="overflow-hidden rounded-xl border border-zinc-800">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 text-xs text-zinc-500">
                      <th className="px-4 py-2 text-left">Client</th>
                      <th className="px-4 py-2 text-right">Images</th>
                      <th className="px-4 py-2 text-right">SignalOps runs</th>
                      <th className="px-4 py-2 text-right">Est. cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-4 text-center text-xs text-zinc-600">
                          No data yet
                        </td>
                      </tr>
                    ) : (
                      clients.map((c) => (
                        <tr
                          key={c.client_id}
                          className="border-b border-zinc-800/50 last:border-0"
                        >
                          <td className="px-4 py-2.5 text-white">{c.name}</td>
                          <td className="px-4 py-2.5 text-right text-zinc-300">
                            {c.images_generated}
                          </td>
                          <td className="px-4 py-2.5 text-right text-zinc-300">
                            {c.signalops_runs}
                          </td>
                          <td className="px-4 py-2.5 text-right text-zinc-300">
                            ${c.estimated_cost_usd}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-zinc-600">
                Cost estimate: $0.04/image (Replicate FLUX 1.1 Pro) + $0.02/SignalOps run
                (OpenRouter Claude Sonnet)
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
