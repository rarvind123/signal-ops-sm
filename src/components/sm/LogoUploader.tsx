"use client";

import { useRef, useState } from "react";
import {
  LOGO_ACCEPT,
  LOGO_UPLOAD_HINT,
  validateLogoFile,
} from "@/lib/sm/logo-upload";
import { label } from "@/lib/sm/ui";

export default function LogoUploader({
  clientId,
  onUploaded,
}: {
  clientId?: string;
  onUploaded?: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    if (!clientId) {
      setError("Save the brand profile first, then upload a logo.");
      return;
    }

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
      const url = json.logo_url ?? json.storage_url ?? null;
      setPreviewUrl(url);
      if (url) onUploaded?.(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
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
        className="flex h-24 cursor-pointer items-center justify-center rounded-lg border border-dashed border-zinc-800 bg-zinc-900/20 transition-colors hover:border-zinc-700"
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="Logo preview" className="max-h-20 max-w-full object-contain" />
        ) : (
          <span className="text-xs text-zinc-600">
            {uploading ? "Uploading…" : "Click to upload"}
          </span>
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
