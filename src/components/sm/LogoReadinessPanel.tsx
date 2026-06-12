"use client";

import { useCallback, useEffect, useState } from "react";
import type { LogoValidationState } from "@/lib/sm/logo-upload";
import { verifyRemoteLogoUrl } from "@/lib/sm/logo-upload";
import { clientLogoProxyUrl } from "@/lib/sm/logo-url";
import { label } from "@/lib/sm/ui";
import type { SMClient } from "@/types/sm";

export default function LogoReadinessPanel({
  client,
  includeLogo,
  onIncludeLogoChange,
  onValidationChange,
}: {
  client: SMClient;
  includeLogo: boolean;
  onIncludeLogoChange: (value: boolean) => void;
  onValidationChange: (state: LogoValidationState & { ready: boolean }) => void;
}) {
  const [validation, setValidation] = useState<LogoValidationState>({ status: "idle" });
  const previewUrl = clientLogoProxyUrl(client.id);

  const runCheck = useCallback(async () => {
    if (!includeLogo) {
      const state = { status: "idle" as const, ready: true };
      setValidation({ status: "idle" });
      onValidationChange(state);
      return;
    }

    setValidation({ status: "checking" });
    onValidationChange({ status: "checking", ready: false });

    const result = await verifyRemoteLogoUrl(previewUrl);
    if (result.ok) {
      const state = { status: "valid" as const, url: previewUrl, ready: true };
      setValidation({ status: "valid", url: previewUrl });
      onValidationChange(state);
    } else {
      const state = {
        status: "invalid" as const,
        message: result.message,
        ready: false,
      };
      setValidation({ status: "invalid", message: result.message });
      onValidationChange(state);
    }
  }, [
    client.id,
    client.logo_url,
    client.logos?.primary,
    includeLogo,
    onValidationChange,
    previewUrl,
  ]);

  useEffect(() => {
    void runCheck();
  }, [runCheck]);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-zinc-800/80 bg-zinc-900/30 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className={label}>Brand logo on poster</p>
          <p className="text-xs text-zinc-600">
            Confirm your logo renders correctly before generating the creative.
          </p>
        </div>
        <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs text-zinc-400">
          <input
            type="checkbox"
            checked={includeLogo}
            onChange={(e) => onIncludeLogoChange(e.target.checked)}
            className="rounded border-zinc-600"
          />
          Include logo
        </label>
      </div>

      {includeLogo && (
        <div className="flex items-center gap-4 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
          <div className="flex h-16 w-28 shrink-0 items-center justify-center rounded-md border border-dashed border-zinc-700 bg-white/95">
            {validation.status === "checking" ? (
              <span className="text-[10px] text-zinc-500">Checking…</span>
            ) : validation.status === "valid" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt={`${client.name} logo preview`}
                className="max-h-14 max-w-[100px] object-contain"
              />
            ) : (
              <span className="px-2 text-center text-[10px] text-red-400/90">No preview</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            {validation.status === "valid" && (
              <p className="text-xs text-green-400/90">Logo looks good — ready for the poster.</p>
            )}
            {validation.status === "checking" && (
              <p className="text-xs text-zinc-500">Validating logo file…</p>
            )}
            {validation.status === "invalid" && (
              <p className="text-xs leading-relaxed text-red-400/90">{validation.message}</p>
            )}
            {validation.status === "idle" && (
              <p className="text-xs text-zinc-500">Upload a logo in Brand Kit first.</p>
            )}
            {validation.status === "invalid" && (
              <button
                type="button"
                onClick={() => void runCheck()}
                className="mt-2 text-xs text-violet-400 hover:text-violet-300"
              >
                Re-check logo
              </button>
            )}
          </div>
        </div>
      )}

      {!includeLogo && (
        <p className="text-xs text-zinc-500">
          Logo will be omitted from this poster. You can turn it back on anytime.
        </p>
      )}
    </div>
  );
}
