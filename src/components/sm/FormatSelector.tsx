"use client";

import Image from "next/image";
import { useState } from "react";
import { CREATIVE_FORMATS } from "@/lib/sm/creative-formats-ui";
import { btnGhost, btnPrimary, field, label, sectionTitle, SIGNALOPS_TM } from "@/lib/sm/ui";
import type { SMCreativeFormat } from "@/types/sm";

export default function FormatSelector({
  onSelect,
  onBack,
}: {
  onSelect: (format: SMCreativeFormat) => void;
  onBack?: () => void;
}) {
  const [selected, setSelected] = useState<SMCreativeFormat>("social_media");
  const selectedFormat = CREATIVE_FORMATS.find((f) => f.id === selected);

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
        {onBack && (
          <button type="button" onClick={onBack} className={btnGhost}>
            Back
          </button>
        )}
      </header>

      <div className="flex flex-1 flex-col justify-center gap-10">
        <div className="max-w-md">
          <p className={`${label} mb-3`}>{SIGNALOPS_TM}</p>
          <h1 className={`${sectionTitle} text-3xl sm:text-4xl`}>I want to create</h1>
        </div>

        <div className="flex max-w-md flex-col gap-2">
          <label htmlFor="creative-format" className={label}>
            Format
          </label>
          <select
            id="creative-format"
            value={selected}
            onChange={(e) => setSelected(e.target.value as SMCreativeFormat)}
            className={field}
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
          {selectedFormat && (
            <p className="pt-1 text-sm leading-relaxed text-zinc-500">
              {selectedFormat.description}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => onSelect(selected)}
          disabled={!selectedFormat?.available}
          className={`${btnPrimary} w-fit`}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
