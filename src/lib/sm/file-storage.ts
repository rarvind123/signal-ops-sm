import "server-only";

import { randomUUID } from "crypto";
import { supabase } from "@/lib/supabase";

const BUCKET = "sm-assets";

function sanitizeSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function getPublicUrl(path: string): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export function smPublicFileUrl(relativePath: string): string {
  return getPublicUrl(relativePath.replace(/\\/g, "/"));
}

export async function saveSmUpload(
  clientId: string,
  file: File,
  kind: "assets" | "brief" = "assets"
): Promise<{ relativePath: string; publicUrl: string; metadata: Record<string, unknown> }> {
  const ext = file.name?.includes(".") ? `.${file.name.split(".").pop()}` : ".bin";
  const filename = `${randomUUID()}${ext}`;
  const relativePath = `clients/${sanitizeSegment(clientId)}/${kind}/${filename}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage.from(BUCKET).upload(relativePath, buffer, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  return {
    relativePath,
    publicUrl: getPublicUrl(relativePath),
    metadata: {
      width: null,
      height: null,
      format: ext.replace(".", ""),
      size_bytes: buffer.length,
      original_name: file.name,
    },
  };
}

export async function saveSmGeneratedImage(
  assetId: string,
  bytes: Buffer,
  ext = ".jpg"
): Promise<{ relativePath: string; publicUrl: string }> {
  const relativePath = `generated/${sanitizeSegment(assetId)}${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(relativePath, bytes, {
    contentType: ext === ".jpg" ? "image/jpeg" : "image/png",
    upsert: true,
  });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  return { relativePath, publicUrl: getPublicUrl(relativePath) };
}

export async function readSmFile(relativePath: string): Promise<Buffer> {
  const normalized = relativePath.replace(/\\/g, "/");
  const { data, error } = await supabase.storage.from(BUCKET).download(normalized);
  if (error || !data) {
    throw new Error(error?.message ?? "File not found");
  }
  return Buffer.from(await data.arrayBuffer());
}

export function relativePathFromPublicUrl(publicUrl: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(publicUrl.slice(idx + marker.length));
}
