"use client";

import Image from "next/image";
import { label, sectionTitle } from "@/lib/sm/ui";

export type SMMode = "single_post" | "campaign";

export default function ModePicker({ onSelect }: { onSelect: (mode: SMMode) => void }) {
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
        <div>
          <p className={`${label} mb-3`}>SignalOps</p>
          <h1 className={`${sectionTitle} text-3xl sm:text-4xl`}>What are you creating?</h1>
        </div>

        <div className="grid max-w-lg gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onSelect("single_post")}
            className="rounded-lg border border-zinc-800/80 bg-zinc-900/30 p-5 text-left transition-colors hover:border-zinc-600 hover:bg-zinc-900/50"
          >
            <p className="text-sm font-medium text-zinc-100">Social media creatives</p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">
              Print, outdoor, TV script, and more — pick your format next.
            </p>
          </button>
          <button
            type="button"
            onClick={() => onSelect("campaign")}
            className="rounded-lg border border-zinc-800/80 bg-zinc-900/30 p-5 text-left transition-colors hover:border-zinc-600 hover:bg-zinc-900/50"
          >
            <p className="text-sm font-medium text-zinc-100">A campaign</p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">
              Full strategy, calendar, and briefs for 30+ posts.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
