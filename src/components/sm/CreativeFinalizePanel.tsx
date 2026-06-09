"use client";

import { useState } from "react";
import type React from "react";
import { field } from "@/lib/sm/ui";
import type { OverlayOptions } from "@/lib/sm/overlay-options";

export default function CreativeFinalizePanel({
  options,
  onChange,
  onApply,
  onCancel,
}: {
  options: OverlayOptions;
  onChange: React.Dispatch<React.SetStateAction<OverlayOptions>>;
  onApply: () => Promise<void>;
  onCancel: () => void;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const set = (patch: Partial<OverlayOptions>) =>
    onChange((prev) => ({ ...prev, ...patch }));

  async function handleApplyChanges() {
    setIsSaving(true);
    try {
      await onApply();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 border-t border-zinc-800 bg-zinc-900/50 p-4">
      <div className="flex flex-col gap-3">
        <p className="text-xs uppercase tracking-wider text-zinc-500">Typography</p>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-600">Position</label>
          <div className="flex gap-1">
            {(["bottom", "top"] as const).map((pos) => (
              <button
                key={pos}
                type="button"
                onClick={() => set({ textPosition: pos })}
                className={`flex-1 rounded border py-1 text-xs capitalize ${
                  options.textPosition === pos
                    ? "border-violet-500 bg-violet-500/10 text-violet-300"
                    : "border-zinc-700 text-zinc-500"
                }`}
              >
                {pos}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs uppercase tracking-wider text-zinc-500">Font Size</p>
          <p className="text-xs text-zinc-600">Controls headline and body copy size</p>
          <div className="flex gap-2">
            {(["sm", "md", "lg", "xl"] as const).map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => set({ textSize: size })}
                className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium uppercase transition-colors ${
                  options.textSize === size
                    ? "bg-white text-black"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-wider text-zinc-500">Logo background</p>
        <div className="flex gap-2">
          {(
            [
              { key: "pill" as const, label: "Pill" },
              { key: "circle" as const, label: "Circle" },
              { key: "none" as const, label: "None" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => set({ logoBg: opt.key })}
              className={`flex-1 rounded border py-1.5 text-xs ${
                options.logoBg === opt.key
                  ? "border-violet-500 bg-violet-500/10 text-violet-300"
                  : "border-zinc-700 text-zinc-500"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-wider text-zinc-500">Logo Size</p>
        <div className="flex gap-2">
          {(["sm", "md", "lg", "xl"] as const).map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => set({ logoSize: size })}
              className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium uppercase transition-colors ${
                options.logoSize === size
                  ? "bg-white text-black"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wider text-zinc-500">Extra text</p>
          <button
            type="button"
            onClick={() => set({ showExtraText: !options.showExtraText })}
            className={`rounded border px-2 py-0.5 text-xs ${
              options.showExtraText
                ? "border-green-500/40 text-green-400"
                : "border-zinc-700 text-zinc-600"
            }`}
          >
            {options.showExtraText ? "On" : "Off"}
          </button>
        </div>
        {options.showExtraText && (
          <div className="flex flex-col gap-1.5">
            <input
              type="text"
              value={options.extraText}
              onChange={(e) => set({ extraText: e.target.value })}
              placeholder="e.g. +91 98765 43210 · yourwebsite.com"
              className={`${field} py-1.5 text-xs`}
            />
            <div className="flex gap-1">
              {(["bottom-left", "bottom-center", "bottom-right"] as const).map((pos) => (
                <button
                  key={pos}
                  type="button"
                  onClick={() => set({ extraTextPosition: pos })}
                  className={`flex-1 rounded border py-1 text-xs ${
                    options.extraTextPosition === pos
                      ? "border-violet-500 bg-violet-500/10 text-violet-300"
                      : "border-zinc-700 text-zinc-500"
                  }`}
                >
                  {pos === "bottom-left"
                    ? "← Left"
                    : pos === "bottom-right"
                      ? "Right →"
                      : "Center"}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wider text-zinc-500">QR code</p>
          <button
            type="button"
            onClick={() => set({ showQr: !options.showQr })}
            className={`rounded border px-2 py-0.5 text-xs ${
              options.showQr
                ? "border-green-500/40 text-green-400"
                : "border-zinc-700 text-zinc-600"
            }`}
          >
            {options.showQr ? "On" : "Off"}
          </button>
        </div>
        {options.showQr && (
          <div className="flex flex-col gap-1.5">
            <input
              type="url"
              value={options.qrUrl}
              onChange={(e) => set({ qrUrl: e.target.value })}
              placeholder="https://yourwebsite.com or WhatsApp link"
              className={`${field} py-1.5 text-xs`}
            />
            <div className="flex gap-1">
              {(["bottom-right", "bottom-left", "top-right", "top-left"] as const).map(
                (pos) => (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => set({ qrPosition: pos })}
                    className={`flex-1 rounded border py-1 text-xs ${
                      options.qrPosition === pos
                        ? "border-violet-500 bg-violet-500/10 text-violet-300"
                        : "border-zinc-700 text-zinc-500"
                    }`}
                  >
                    {pos
                      .replace("bottom-", "B-")
                      .replace("top-", "T-")
                      .replace("right", "R")
                      .replace("left", "L")}
                  </button>
                )
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wider text-zinc-500">Picture in picture</p>
          <button
            type="button"
            onClick={() => set({ showPip: !options.showPip })}
            className={`rounded border px-2 py-0.5 text-xs ${
              options.showPip
                ? "border-green-500/40 text-green-400"
                : "border-zinc-700 text-zinc-600"
            }`}
          >
            {options.showPip ? "On" : "Off"}
          </button>
        </div>
        {options.showPip && (
          <div className="flex flex-col gap-1.5">
            <div
              role="button"
              tabIndex={0}
              className="cursor-pointer rounded-lg border border-dashed border-zinc-700 px-3 py-2 text-center hover:border-zinc-600"
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = "image/*";
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    set({ pipImageUrl: ev.target?.result as string });
                  };
                  reader.readAsDataURL(file);
                };
                input.click();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.currentTarget.click();
                }
              }}
            >
              {options.pipImageUrl ? (
                <div className="flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={options.pipImageUrl}
                    className="h-8 w-8 rounded object-cover"
                    alt=""
                  />
                  <span className="text-xs text-zinc-400">
                    Image attached · Click to change
                  </span>
                </div>
              ) : (
                <span className="text-xs text-zinc-600">
                  Click to upload showroom / product / team photo
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <div className="flex flex-1 gap-1">
                {(["bottom-right", "bottom-left", "top-right", "top-left"] as const).map(
                  (pos) => (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => set({ pipPosition: pos })}
                      className={`flex-1 rounded border py-1 text-xs ${
                        options.pipPosition === pos
                          ? "border-violet-500 bg-violet-500/10 text-violet-300"
                          : "border-zinc-700 text-zinc-500"
                      }`}
                    >
                      {pos
                        .replace("bottom-", "B")
                        .replace("top-", "T")
                        .replace("right", "R")
                        .replace("left", "L")}
                    </button>
                  )
                )}
              </div>
              <div className="flex gap-1">
                {(["sm", "md", "lg"] as const).map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => set({ pipSize: size })}
                    className={`rounded border px-2 py-1 text-xs uppercase ${
                      options.pipSize === size
                        ? "border-violet-500 bg-violet-500/10 text-violet-300"
                        : "border-zinc-700 text-zinc-500"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 flex gap-3 border-t border-zinc-800 pt-4">
        <button
          type="button"
          onClick={() => void handleApplyChanges()}
          disabled={isSaving}
          className="flex-1 rounded-lg bg-white py-2.5 text-sm font-semibold text-black transition-colors hover:bg-zinc-100 disabled:opacity-50"
        >
          {isSaving ? "Saving…" : "Apply changes"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="px-4 py-2.5 text-sm text-zinc-500 transition-colors hover:text-zinc-300 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
