"use client";

import { useRef, useState } from "react";

export default function LogoUploader({
  clientId,
}: {
  clientId?: string;
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
      const json = (await res.json()) as { storage_url?: string; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      setPreviewUrl(json.storage_url ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm text-zinc-400">Logo</label>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        className="flex h-28 cursor-pointer items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-900/30 hover:border-zinc-500"
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="Logo preview" className="max-h-24 max-w-full object-contain" />
        ) : (
          <span className="text-xs text-zinc-500">
            {uploading ? "Uploading…" : "Drop logo or click to upload"}
          </span>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      {!clientId && (
        <p className="text-xs text-zinc-600">Logo upload unlocks after first save.</p>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
