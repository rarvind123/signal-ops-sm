"use client";

import Image from "next/image";
import { useState } from "react";
import { CREATIVE_FORMATS } from "@/lib/sm/creative-formats-ui";
import { btnGhost, btnPrimary, field, label, sectionTitle } from "@/lib/sm/ui";
import type { SMCreativeFormat } from "@/types/sm";

export type SMMode = "single_post" | "campaign";

export default function ModePicker({
  onSelectFormat,
  onSelectSocialMode,
}: {
  onSelectFormat: (format: SMCreativeFormat) => void;
  onSelectSocialMode: (mode: SMMode) => void;
}) {
  const [selected, setSelected] = useState<SMCreativeFormat>("social_media");
  const [showSocialChoice, setShowSocialChoice] = useState(false);
  const selectedFormat = CREATIVE_FORMATS.find((f) => f.id === selected);

  function handleContinue() {
    if (!selectedFormat?.available) return;
    if (selected === "social_media") {
      setShowSocialChoice(true);
      return;
    }
    onSelectFormat(selected);
  }

  if (showSocialChoice) {
    return (
      <div className="flex min-h-[72vh] flex-col">
        <header className="mb-16 flex items-start justify-between gap-4">
          <Image
            src="/inventious-logo.png"
            alt="inventious"
            width={378}
            height={118}
            className="h-8 w-auto object-contain object-left sm:h-9"
            priority
          />
          <button
            type="button"
            onClick={() => setShowSocialChoice(false)}
            className={btnGhost}
          >
            Back
          </button>
        </header>

        <div className="flex flex-1 flex-col justify-center gap-10">
          <div>
            <p className={`${label} mb-3`}>SignalOps</p>
            <h1 className={`${sectionTitle} text-3xl sm:text-4xl`}>Social media</h1>
            <p className="mt-2 text-sm text-zinc-500">One post or a full campaign?</p>
          </div>

          <div className="grid max-w-lg gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => onSelectSocialMode("single_post")}
              className="rounded-lg border border-zinc-800/80 bg-zinc-900/30 p-5 text-left transition-colors hover:border-zinc-600 hover:bg-zinc-900/50"
            >
              <p className="text-sm font-medium text-zinc-100">Single social media creative</p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                One post — strategy, visual, and copy for a single piece of content.
              </p>
            </button>
            <button
              type="button"
              onClick={() => onSelectSocialMode("campaign")}
              className="rounded-lg border border-zinc-800/80 bg-zinc-900/30 p-5 text-left transition-colors hover:border-zinc-600 hover:bg-zinc-900/50"
            >
              <p className="text-sm font-medium text-zinc-100">Social media campaign</p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                Full strategy, calendar, briefs, and creatives for 30+ posts.
              </p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[72vh] flex-col">
      <header className="mb-16">
        <Image
          src="/inventious-logo.png"
          alt="inventious"
          width={378}
          height={118}
          className="h-8 w-auto object-contain object-left sm:h-9"
          priority
        />
      </header>

      <div className="flex flex-1 flex-col justify-center gap-10">
        <div className="max-w-md">
          <p className={`${label} mb-3`}>SignalOps</p>
          <h1 className={`${sectionTitle} text-3xl sm:text-4xl`}>What are you creating?</h1>
        </div>

        <div className="flex max-w-md flex-col gap-2">
          <label htmlFor="home-format" className={label}>
            Format
          </label>
          <div className="relative">
            <select
              id="home-format"
              value={selected}
              onChange={(e) => setSelected(e.target.value as SMCreativeFormat)}
              className={`${field} pr-10`}
            >
              {CREATIVE_FORMATS.map((format) => (
                <option
                  key={format.id}
                  value={format.id}
                  disabled={!format.available}
                  className="bg-zinc-950"
                >
                  {format.label}
                  {!format.available && format.comingSoonLabel
                    ? ` (${format.comingSoonLabel})`
                    : ""}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-600">
              ▾
            </span>
          </div>
          {selectedFormat && (
            <p className="pt-1 text-sm leading-relaxed text-zinc-500">
              {selectedFormat.description}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={handleContinue}
          disabled={!selectedFormat?.available}
          className={`${btnPrimary} w-fit`}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
