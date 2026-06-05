"use client";

import { useRef, useState } from "react";

export default function ImageUploader({
  clientId,
  onUpload,
}: {
  clientId: string;
  onUpload: (urls: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [urls, setUrls] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    const next: string[] = [...urls];
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.set("file", file);
        formData.set("client_id", clientId);
        const res = await fetch("/api/sm/upload", {
          method: "POST",
          body: formData,
        });
        const json = (await res.json()) as { url?: string; error?: string };
        if (!res.ok || !json.url) throw new Error(json.error ?? "Upload failed");
        next.push(json.url);
      }
      setUrls(next);
      onUpload(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm text-zinc-400">Reference images (optional)</label>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
      >
        {uploading ? "Uploading…" : "+ Attach images"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
      />
      {urls.length > 0 && (
        <p className="text-xs text-zinc-500">{urls.length} image(s) attached</p>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
