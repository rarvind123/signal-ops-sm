"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  LOGO_ACCEPT,
  LOGO_UPLOAD_HINT,
  type LogoValidationState,
  validateLogoFile,
  verifyLocalLogoFile,
  verifyRemoteLogoUrl,
} from "@/lib/sm/logo-upload";
import { clientLogoProxyUrl } from "@/lib/sm/logo-url";
import { btnSecondary, label } from "@/lib/sm/ui";
import type { SMClient } from "@/types/sm";

export default function LogoReadinessPanel({
  client,
  includeLogo,
  onIncludeLogoChange,
  onValidationChange,
  onLogoUploaded,
}: {
  client: SMClient;
  includeLogo: boolean;
  onIncludeLogoChange: (value: boolean) => void;
  onValidationChange: (state: LogoValidationState & { ready: boolean }) => void;
  onLogoUploaded?: () => void;
}) {
  const [validation, setValidation] = useState<LogoValidationState>({ status: "idle" });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
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

  async function handleFile(file: File) {
    const check = validateLogoFile(file);
    if (!check.ok) {
      setUploadError(check.message);
      return;
    }

    setUploadError(null);
    const localRender = await verifyLocalLogoFile(file);
    if (!localRender.ok) {
      setUploadError(localRender.message);
      return;
    }

    setUploading(true);
    setValidation({ status: "checking" });
    onValidationChange({ status: "checking", ready: false });

    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("type", "logo");
      const res = await fetch(`/api/sm/clients/${client.id}/assets`, {
        method: "POST",
        body: formData,
      });
      const json = (await res.json()) as {
        storage_url?: string;
        logo_url?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Upload failed");

      const proxyUrl = clientLogoProxyUrl(client.id);
      const remoteRender = await verifyRemoteLogoUrl(proxyUrl);
      if (!remoteRender.ok) throw new Error(remoteRender.message);

      setValidation({ status: "valid", url: proxyUrl });
      onValidationChange({ status: "valid", url: proxyUrl, ready: true });
      onLogoUploaded?.();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Upload failed";
      setUploadError(message);
      setValidation({ status: "invalid", message });
      onValidationChange({ status: "invalid", message, ready: false });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function openFilePicker() {
    inputRef.current?.click();
  }

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
        <>
          <div className="flex items-center gap-4 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
            <button
              type="button"
              onClick={openFilePicker}
              disabled={uploading}
              className="flex h-16 w-28 shrink-0 cursor-pointer items-center justify-center rounded-md border border-dashed border-zinc-700 bg-white/95 transition-colors hover:border-violet-500/40 disabled:opacity-60"
              title="Click to upload or replace logo"
            >
              {uploading || validation.status === "checking" ? (
                <span className="text-[10px] text-zinc-500">
                  {uploading ? "Uploading…" : "Checking…"}
                </span>
              ) : validation.status === "valid" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt={`${client.name} logo preview`}
                  className="max-h-14 max-w-[100px] object-contain"
                />
              ) : (
                <span className="px-2 text-center text-[10px] text-zinc-500">
                  Click to upload
                </span>
              )}
            </button>
            <div className="min-w-0 flex-1">
              {validation.status === "valid" && (
                <p className="text-xs text-green-400/90">Logo looks good — ready for the poster.</p>
              )}
              {validation.status === "checking" && !uploading && (
                <p className="text-xs text-zinc-500">Validating logo file…</p>
              )}
              {validation.status === "invalid" && (
                <p className="text-xs leading-relaxed text-red-400/90">{validation.message}</p>
              )}
              {validation.status === "idle" && (
                <p className="text-xs text-zinc-500">No logo yet — upload one below.</p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={openFilePicker}
                  disabled={uploading}
                  className={`${btnSecondary} px-3 py-1.5 text-xs`}
                >
                  {uploading
                    ? "Uploading…"
                    : validation.status === "valid"
                      ? "Replace logo"
                      : "Upload logo"}
                </button>
                {validation.status === "invalid" && (
                  <button
                    type="button"
                    onClick={() => void runCheck()}
                    disabled={uploading}
                    className="text-xs text-violet-400 hover:text-violet-300 disabled:opacity-50"
                  >
                    Re-check
                  </button>
                )}
              </div>
            </div>
          </div>
          <p className="text-xs leading-relaxed text-zinc-600">{LOGO_UPLOAD_HINT}</p>
          {uploadError && (
            <p className="text-xs leading-relaxed text-red-400/90">{uploadError}</p>
          )}
          <input
            ref={inputRef}
            type="file"
            accept={LOGO_ACCEPT}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
        </>
      )}

      {!includeLogo && (
        <p className="text-xs text-zinc-500">
          Logo will be omitted from this poster. You can turn it back on anytime.
        </p>
      )}
    </div>
  );
}
