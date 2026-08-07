"use client";

import { useEffect, useRef, useState } from "react";
import { btnSecondary, label } from "@/lib/sm/ui";
import { apiUrl } from "@/lib/base-path";

export default function ImageUploader({
  clientId,
  onUpload,
  initialUrls = [],
}: {
  clientId: string;
  onUpload: (urls: string[]) => void;
  initialUrls?: string[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [urls, setUrls] = useState<string[]>(initialUrls);
  const [error, setError] = useState<string | null>(null);

  const initialKey = initialUrls.join("\0");
  useEffect(() => {
    setUrls(initialUrls);
    // Sync when parent loads saved URLs (edit brief / restore).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initialKey captures URL identity
  }, [initialKey]);

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
        const res = await fetch(apiUrl("/api/sm/upload"), {
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

  function removeAt(index: number) {
    const next = urls.filter((_, i) => i !== index);
    setUrls(next);
    onUpload(next);
  }

  return (
    <div className="flex flex-col gap-2">
      <span className={label}>Reference images</span>
      <p className="text-xs text-zinc-500">
        Inspiration for lighting, mood, and photographic style. Generation will match these
        visually — copy/text is added later as typography.
      </p>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={`${btnSecondary} w-fit text-xs`}
      >
        {uploading ? "Uploading…" : "Attach images"}
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
        <ul className="flex flex-wrap gap-2">
          {urls.map((url, i) => (
            <li key={url} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Reference ${i + 1}`}
                className="h-16 w-16 rounded object-cover"
              />
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-zinc-800 text-[10px] text-zinc-200"
                aria-label={`Remove reference ${i + 1}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="text-xs text-red-400/90">{error}</p>}
    </div>
  );
}
