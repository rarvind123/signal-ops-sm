"use client";

import { useRef, useState } from "react";
import {
  LOGO_ACCEPT,
  validateLogoFile,
  verifyLocalLogoFile,
  verifyRemoteLogoUrl,
} from "@/lib/sm/logo-upload";
import { clientLogoProxyUrl } from "@/lib/sm/logo-url";

export default function LogoVariantUploader({
  label: variantLabel,
  clientId,
  value,
  onUpload,
  onValidationChange,
}: {
  label: string;
  clientId: string;
  value?: string;
  onUpload: (url: string) => void;
  onValidationChange?: (variant: string, valid: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(value ?? null);
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState(Boolean(value));

  async function handleFile(file: File) {
    const check = validateLogoFile(file);
    if (!check.ok) {
      setError(check.message);
      setVerified(false);
      onValidationChange?.(variantLabel, false);
      return;
    }

    const localRender = await verifyLocalLogoFile(file);
    if (!localRender.ok) {
      setError(localRender.message);
      setVerified(false);
      onValidationChange?.(variantLabel, false);
      return;
    }

    setUploading(true);
    setError(null);
    setVerified(false);
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("type", "logo");
      formData.set("logo_variant", variantLabel);
      const res = await fetch(`/api/sm/clients/${clientId}/assets`, {
        method: "POST",
        body: formData,
      });
      const json = (await res.json()) as { storage_url?: string; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Upload failed");

      const proxyUrl =
        variantLabel === "primary"
          ? clientLogoProxyUrl(clientId)
          : (json.storage_url ?? null);
      const checkUrl = proxyUrl ?? json.storage_url;
      if (!checkUrl) throw new Error("Upload succeeded but logo URL is missing.");

      const remoteRender = await verifyRemoteLogoUrl(checkUrl);
      if (!remoteRender.ok) throw new Error(remoteRender.message);

      setPreview(checkUrl);
      setVerified(true);
      onValidationChange?.(variantLabel, true);
      onUpload(json.storage_url ?? checkUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
      setPreview(null);
      setVerified(false);
      onValidationChange?.(variantLabel, false);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={`flex h-16 flex-col items-center justify-center gap-1 rounded-lg border border-dashed transition-colors ${
          verified
            ? "border-green-500/40 bg-green-500/5"
            : error
              ? "border-red-500/30 bg-red-500/5"
              : "border-zinc-700 bg-zinc-900/30 hover:border-zinc-600"
        }`}
      >
        {preview && verified ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt={`${variantLabel} logo`}
            className="max-h-10 max-w-full object-contain px-2"
          />
        ) : (
          <span className="text-[10px] capitalize text-zinc-500">
            {uploading ? "…" : variantLabel}
          </span>
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
      </button>
      {error && (
        <p className="text-[10px] leading-snug text-red-400/90">{error}</p>
      )}
      {verified && variantLabel === "primary" && (
        <p className="text-[10px] text-green-400/80">Verified</p>
      )}
    </div>
  );
}
