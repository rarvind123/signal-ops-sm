"use client";

import { useState } from "react";
import { getClientTypography } from "@/lib/sm/typography";
import type { SMCreativeBrief, SMClient, SMContentFormat } from "@/types/sm";

const FORMAT_COLORS: Record<SMContentFormat, string> = {
  static: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  carousel: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  reel: "bg-green-500/20 text-green-300 border-green-500/30",
  reel_comic: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  meme: "bg-pink-500/20 text-pink-300 border-pink-500/30",
  testimonial: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  offer: "bg-red-500/20 text-red-300 border-red-500/30",
};

const APPROACH_ICONS: Record<string, string> = {
  concept_first: "💡",
  product_transformed: "✨",
  product_hero: "📸",
  effects_visible: "🌊",
  visual_tension: "⚡",
};

export default function VisualBriefCard({
  brief,
  client,
  onApprove,
  onReject,
  onEdit,
  readOnly = false,
  onComment,
}: {
  brief: SMCreativeBrief;
  client: SMClient;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onEdit: (id: string, field: string, value: string) => void;
  readOnly?: boolean;
  onComment?: (id: string, comment: string) => void;
}) {
  const [editingHook, setEditingHook] = useState(false);
  const [editingScene, setEditingScene] = useState(false);
  const [hookValue, setHookValue] = useState(brief.hook);
  const [sceneValue, setSceneValue] = useState(brief.scene_description ?? "");
  const [commentValue, setCommentValue] = useState(brief.client_comment ?? "");
  const typo = getClientTypography(client);

  const approved = brief.approved === true;
  const rejected = brief.approved === false;

  const primaryColor = client.color_palette?.primary ?? "#1a1a2e";
  const accentColor = client.color_palette?.accent ?? client.color_palette?.primary ?? "#6366f1";

  return (
    <div
      className={`overflow-hidden rounded-xl border transition-all ${
        approved
          ? "border-green-500/50 bg-green-500/5"
          : rejected
            ? "border-red-500/20 bg-red-500/5 opacity-50"
            : "border-zinc-700 bg-zinc-900/30"
      }`}
    >
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-zinc-500">
            POST #{String(brief.post_number).padStart(2, "0")}
          </span>
          <span
            className={`rounded-full border px-2 py-0.5 text-xs ${FORMAT_COLORS[brief.format]}`}
          >
            {brief.format}
          </span>
          {brief.visual_approach_mode && (
            <span className="text-xs text-zinc-600">
              {APPROACH_ICONS[brief.visual_approach_mode]}{" "}
              {brief.visual_approach_mode.replace("_", " ")}
            </span>
          )}
        </div>
        <span className="text-xs text-zinc-600">{brief.pillar}</span>
      </div>

      <div
        className="relative mx-4 mt-4 overflow-hidden rounded-lg"
        style={{ paddingTop: "100%", background: primaryColor }}
      >
        <div className="absolute inset-0 flex flex-col justify-end p-4">
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)",
            }}
          />

          <div className="absolute left-3 right-12 top-3">
            <p className="line-clamp-2 font-mono text-xs text-white/50">
              {sceneValue || brief.scene_description}
            </p>
          </div>

          <div className="absolute right-3 top-3">
            <span className="text-lg">
              {APPROACH_ICONS[brief.visual_approach_mode ?? "concept_first"]}
            </span>
          </div>

          {client.color_palette && (
            <div className="absolute right-3 top-10 flex flex-col gap-1">
              {Object.entries(client.color_palette)
                .filter(([, v]) => v)
                .slice(0, 3)
                .map(([k, v]) => (
                  <div
                    key={k}
                    className="h-4 w-4 rounded-full border border-white/20"
                    style={{ background: v as string }}
                  />
                ))}
            </div>
          )}

          <div className="relative z-10">
            {brief.hook &&
              (() => {
                const sentences = brief.hook.match(/[^.!?]+[.!?]+/g);
                const setup =
                  sentences && sentences.length > 1
                    ? sentences.slice(0, -1).join("")
                    : null;
                const punch =
                  sentences && sentences.length > 1
                    ? sentences[sentences.length - 1]
                    : brief.hook;
                return (
                  <>
                    {setup && (
                      <p
                        style={{
                          fontFamily: typo.fontFamily ?? typo.fontStack,
                          fontWeight: 300,
                          fontSize: "10px",
                          color: "rgba(255,255,255,0.7)",
                          letterSpacing: "0.01em",
                        }}
                      >
                        {setup}
                      </p>
                    )}
                    <p
                      style={{
                        fontFamily: typo.fontFamily ?? typo.fontStack,
                        fontWeight: 700,
                        fontSize: "14px",
                        color: "white",
                        lineHeight: 1.1,
                        letterSpacing: "0.02em",
                        textTransform: typo.textTransform,
                      }}
                    >
                      {punch}
                    </p>
                  </>
                );
              })()}

            {brief.cta && (
              <div
                className="mt-2 inline-block rounded border border-white/40 px-2 py-0.5 text-xs text-white"
                style={{ background: `${accentColor}40` }}
              >
                {brief.cta}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 pt-3">
        {readOnly ? (
          <p className="text-sm font-medium text-white">&ldquo;{hookValue || brief.hook}&rdquo;</p>
        ) : editingHook ? (
          <textarea
            autoFocus
            value={hookValue}
            onChange={(e) => setHookValue(e.target.value)}
            onBlur={() => {
              setEditingHook(false);
              onEdit(brief.id, "hook", hookValue);
            }}
            rows={2}
            className="w-full resize-none rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-xs text-white focus:outline-none"
          />
        ) : (
          <p
            className="cursor-text text-sm font-medium text-white transition-colors hover:text-zinc-300"
            onClick={() => setEditingHook(true)}
            title="Click to edit headline"
          >
            &ldquo;{hookValue || brief.hook}&rdquo;
            <span className="ml-1 text-xs text-zinc-700">✎</span>
          </p>
        )}
      </div>

      <div className="px-4 pb-3 pt-1">
        {readOnly ? (
          <p className="line-clamp-2 font-mono text-xs leading-relaxed text-zinc-500">
            {sceneValue || brief.scene_description || "No scene description yet"}
          </p>
        ) : editingScene ? (
          <textarea
            autoFocus
            value={sceneValue}
            onChange={(e) => setSceneValue(e.target.value)}
            onBlur={() => {
              setEditingScene(false);
              onEdit(brief.id, "scene_description", sceneValue);
            }}
            rows={3}
            className="w-full resize-none rounded border border-zinc-600 bg-zinc-800 px-2 py-1 font-mono text-xs text-zinc-300 focus:outline-none"
          />
        ) : (
          <p
            className="line-clamp-2 cursor-text font-mono text-xs leading-relaxed text-zinc-500 transition-colors hover:text-zinc-400"
            onClick={() => setEditingScene(true)}
            title="Click to edit scene description"
          >
            {sceneValue || brief.scene_description || "No scene description yet"}
            <span className="ml-1 text-zinc-700">✎</span>
          </p>
        )}
      </div>

      {readOnly && onComment && (
        <div className="px-4 pb-3">
          <textarea
            value={commentValue}
            onChange={(e) => setCommentValue(e.target.value)}
            onBlur={() => onComment(brief.id, commentValue)}
            placeholder="Add a comment for the team…"
            rows={2}
            className="w-full resize-none rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-300 focus:outline-none"
          />
        </div>
      )}

      <div className="flex gap-2 px-4 pb-4">
        <button
          type="button"
          onClick={() => onApprove(brief.id)}
          className={`flex-1 rounded py-1.5 text-xs font-medium transition-all ${
            approved
              ? "bg-green-600 text-white"
              : "border border-zinc-700 text-zinc-400 hover:border-green-500 hover:text-green-400"
          }`}
        >
          {approved ? "✓ Approved" : "✓ Approve"}
        </button>
        <button
          type="button"
          onClick={() => onReject(brief.id)}
          className={`flex-1 rounded py-1.5 text-xs transition-all ${
            rejected
              ? "border border-red-500/50 text-red-400"
              : "border border-zinc-700 text-zinc-600 hover:border-red-500/50 hover:text-red-400"
          }`}
        >
          {rejected ? "✗ Skipped" : "✗ Skip"}
        </button>
      </div>
    </div>
  );
}
