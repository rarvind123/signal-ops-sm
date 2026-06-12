"use client";

import { useRef, useState } from "react";
import {
  LOGO_ACCEPT,
  validateLogoFile,
} from "@/lib/sm/logo-upload";

export default function LogoVariantUploader({
  label,
  clientId,
  value,
  onUpload,
}: {
  label: string;
  clientId: string;
  value?: string;
  onUpload: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(value ?? null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    const check = validateLogoFile(file);
    if (!check.ok) {
      setError(check.message);
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("type", "logo");
      formData.set("logo_variant", label);
      const res = await fetch(`/api/sm/clients/${clientId}/assets`, {
        method: "POST",
        body: formData,
      });
      const json = (await res.json()) as { storage_url?: string; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      const url = json.storage_url ?? null;
      if (url) {
        setPreview(url);
        onUpload(url);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
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
        className="flex h-16 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-zinc-700 bg-zinc-900/30 transition-colors hover:border-zinc-600"
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={`${label} logo`} className="max-h-10 max-w-full object-contain px-2" />
        ) : (
          <span className="text-[10px] capitalize text-zinc-500">
            {uploading ? "…" : label}
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
    </div>
  );
}
