"use client";

import { useEffect, useRef, useState } from "react";
import {
  LOGO_ACCEPT,
  LOGO_UPLOAD_HINT,
  type LogoValidationState,
  validateLogoFile,
  verifyLocalLogoFile,
  verifyRemoteLogoUrl,
} from "@/lib/sm/logo-upload";
import { clientLogoProxyUrl } from "@/lib/sm/logo-url";
import { label } from "@/lib/sm/ui";

export default function LogoUploader({
  clientId,
  initialPreviewUrl,
  onUploaded,
  onValidationChange,
}: {
  clientId?: string;
  initialPreviewUrl?: string | null;
  onUploaded?: (url: string) => void;
  onValidationChange?: (state: LogoValidationState) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialPreviewUrl ?? null);
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);

  function emit(state: LogoValidationState) {
    onValidationChange?.(state);
  }

  useEffect(() => {
    if (!clientId) return;
    const url = clientLogoProxyUrl(clientId);
    emit({ status: "checking" });
    void verifyRemoteLogoUrl(url).then((result) => {
      if (result.ok) {
        setPreviewUrl(url);
        setVerified(true);
        setError(null);
        emit({ status: "valid", url });
      } else if (initialPreviewUrl) {
        setPreviewUrl(null);
        setVerified(false);
        setError(result.message);
        emit({ status: "invalid", message: result.message });
      } else {
        setVerified(false);
        emit({ status: "idle" });
      }
    });
  }, [clientId, initialPreviewUrl]);

  async function handleFile(file: File) {
    if (!clientId) {
      setError("Save the brand profile first, then upload a logo.");
      emit({ status: "invalid", message: "Save the brand profile first." });
      return;
    }

    const check = validateLogoFile(file);
    if (!check.ok) {
      setError(check.message);
      setVerified(false);
      setPreviewUrl(null);
      emit({ status: "invalid", message: check.message });
      return;
    }

    emit({ status: "checking" });
    const localRender = await verifyLocalLogoFile(file);
    if (!localRender.ok) {
      setError(localRender.message);
      setVerified(false);
      setPreviewUrl(null);
      emit({ status: "invalid", message: localRender.message });
      return;
    }

    setUploading(true);
    setError(null);
    setVerified(false);
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("type", "logo");
      const res = await fetch(`/api/sm/clients/${clientId}/assets`, {
        method: "POST",
        body: formData,
      });
      const json = (await res.json()) as {
        storage_url?: string;
        logo_url?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Upload failed");

      const proxyUrl = clientLogoProxyUrl(clientId);
      const remoteRender = await verifyRemoteLogoUrl(proxyUrl);
      if (!remoteRender.ok) {
        throw new Error(remoteRender.message);
      }

      const url = json.logo_url ?? json.storage_url ?? proxyUrl;
      setPreviewUrl(proxyUrl);
      setVerified(true);
      emit({ status: "valid", url: proxyUrl });
      onUploaded?.(url);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Upload failed";
      setError(message);
      setPreviewUrl(null);
      setVerified(false);
      emit({ status: "invalid", message });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span className={label}>Logo</span>
      <p className="text-xs leading-relaxed text-zinc-600">{LOGO_UPLOAD_HINT}</p>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        className={`flex h-28 cursor-pointer items-center justify-center rounded-lg border border-dashed bg-zinc-900/20 transition-colors ${
          verified
            ? "border-green-500/40 bg-green-500/5"
            : error
              ? "border-red-500/30"
              : "border-zinc-800 hover:border-zinc-700"
        }`}
      >
        {previewUrl && verified ? (
          <div className="flex flex-col items-center gap-2 px-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Logo preview"
              className="max-h-16 max-w-full object-contain"
            />
            <span className="text-[10px] text-green-400/90">Logo verified</span>
          </div>
        ) : uploading ? (
          <span className="text-xs text-zinc-600">Uploading & verifying…</span>
        ) : (
          <span className="text-xs text-zinc-600">Click to upload</span>
        )}
      </div>
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
      {!clientId && (
        <p className="text-xs text-zinc-700">Available after saving the brand.</p>
      )}
      {error && <p className="text-xs leading-relaxed text-red-400/90">{error}</p>}
    </div>
  );
}
