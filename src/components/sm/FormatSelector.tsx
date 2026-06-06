"use client";

import { useState } from "react";
import { CREATIVE_FORMATS } from "@/lib/sm/creative-formats-ui";
import type { SMCreativeFormat } from "@/types/sm";

export default function FormatSelector({
  onSelect,
}: {
  onSelect: (format: SMCreativeFormat) => void;
}) {
  const [selected, setSelected] = useState<SMCreativeFormat>("social_media");

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-10">
      <div className="text-center">
        <p className="mb-3 text-sm uppercase tracking-widest text-zinc-500">
          ✦ SignalOps Creative Engine
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          I want to create
        </h1>
      </div>

      <div className="grid w-full max-w-2xl grid-cols-2 gap-3 sm:grid-cols-3">
        {CREATIVE_FORMATS.map((format) => (
          <button
            key={format.id}
            type="button"
            disabled={!format.available}
            onClick={() => format.available && setSelected(format.id)}
            className={`relative rounded-xl border px-4 py-4 text-left transition-all ${
              !format.available
                ? "cursor-not-allowed border-zinc-800 opacity-40"
                : selected === format.id
                  ? "border-violet-500 bg-violet-500/10"
                  : "cursor-pointer border-zinc-700 hover:border-zinc-500"
            }`}
          >
            <span className="mb-2 block text-2xl">{format.icon}</span>
            <p
              className={`text-sm font-medium ${
                selected === format.id ? "text-white" : "text-zinc-300"
              }`}
            >
              {format.label}
            </p>
            <p className="mt-0.5 text-xs leading-snug text-zinc-500">{format.description}</p>
            {!format.available && format.comingSoonLabel && (
              <span className="absolute right-2 top-2 rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-600">
                {format.comingSoonLabel}
              </span>
            )}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onSelect(selected)}
        className="rounded-xl bg-violet-600 px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-violet-500"
      >
        Continue with {CREATIVE_FORMATS.find((f) => f.id === selected)?.label} →
      </button>
    </div>
  );
}
