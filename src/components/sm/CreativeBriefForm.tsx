"use client";

import { useState } from "react";
import type { SMClient, SMGoal, SMPlatform, SMCreativeRequest } from "@/types/sm";
import ImageUploader from "./ImageUploader";

const GOALS: { key: SMGoal; label: string; emoji: string }[] = [
  { key: "offer", label: "Promote Offer", emoji: "🏷️" },
  { key: "launch", label: "Product Launch", emoji: "🚀" },
  { key: "awareness", label: "Brand Awareness", emoji: "📣" },
  { key: "event", label: "Event", emoji: "📅" },
  { key: "cta", label: "Drive Action", emoji: "⚡" },
  { key: "testimonial", label: "Testimonial", emoji: "💬" },
];

const PLATFORMS: { key: SMPlatform; label: string }[] = [
  { key: "instagram", label: "Instagram" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "facebook", label: "Facebook" },
  { key: "twitter", label: "X / Twitter" },
];

export default function CreativeBriefForm({
  client,
  onSubmit,
}: {
  client: SMClient;
  onSubmit: (request: SMCreativeRequest) => Promise<void>;
}) {
  const [brief, setBrief] = useState("");
  const [goal, setGoal] = useState<SMGoal>("awareness");
  const [platforms, setPlatforms] = useState<SMPlatform[]>(["instagram"]);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const togglePlatform = (p: SMPlatform) =>
    setPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!brief.trim() || platforms.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sm/creative-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: client.id,
          brief_text: brief,
          goal,
          platforms,
          uploaded_image_urls: uploadedUrls,
        }),
      });
      const request = (await res.json()) as SMCreativeRequest & { error?: string };
      if (!res.ok) throw new Error(request.error ?? "Request failed");
      await onSubmit(request);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="flex max-w-xl flex-col gap-5">
      <div>
        <h2 className="text-lg font-semibold text-white">What post do you want today?</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Creating for: <span className="text-white">{client.name}</span>
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm text-zinc-400">Your brief</label>
        <textarea
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder="e.g. Promote our free yoga class happening this Saturday..."
          rows={4}
          required
          className="resize-none rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-600"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm text-zinc-400">Goal</label>
        <div className="flex flex-wrap gap-2">
          {GOALS.map((g) => (
            <button
              key={g.key}
              type="button"
              onClick={() => setGoal(g.key)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs ${
                goal === g.key
                  ? "border-violet-500 bg-violet-500/10 text-violet-300"
                  : "border-zinc-700 text-zinc-400"
              }`}
            >
              {g.emoji} {g.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm text-zinc-400">Platforms</label>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => togglePlatform(p.key)}
              className={`rounded-lg border px-3 py-1.5 text-xs ${
                platforms.includes(p.key)
                  ? "border-blue-500 bg-blue-500/10 text-blue-300"
                  : "border-zinc-700 text-zinc-400"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <ImageUploader
        clientId={client.id}
        onUpload={(urls) => setUploadedUrls(urls)}
      />

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={loading || !brief.trim() || platforms.length === 0}
        className="rounded bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
      >
        {loading ? "Analyzing with SignalOps..." : "✦ Run SignalOps →"}
      </button>
    </form>
  );
}
