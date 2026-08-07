import "server-only";

import { randomUUID } from "crypto";
import { supabase } from "@/lib/supabase";

const BUCKET = "sm-assets";

/**
 * Download a remote reference image and re-host on our public bucket.
 * fal cannot reliably fetch pinimg.com / hotlink-protected CDNs.
 */
export async function mirrorRemoteImageToStorage(
  clientId: string,
  remoteUrl: string
): Promise<string | null> {
  if (!remoteUrl || !/^https?:\/\//i.test(remoteUrl)) return null;

  try {
    const res = await fetch(remoteUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; InventiousVisualResearch/1.0; +https://inventious.co)",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        Referer: "https://www.pinterest.com/",
      },
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
      redirect: "follow",
    });
    if (!res.ok) {
      console.warn(
        `[visual-research/mirror] fetch failed HTTP ${res.status} for ${remoteUrl.slice(0, 120)}`
      );
      return null;
    }

    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    if (!contentType.startsWith("image/")) {
      console.warn(
        `[visual-research/mirror] non-image content-type ${contentType}`
      );
      return null;
    }

    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.length < 2_000) return null;

    const ext = contentType.includes("png")
      ? ".png"
      : contentType.includes("webp")
        ? ".webp"
        : ".jpg";
    const relativePath = `research/${clientId.replace(/[^a-zA-Z0-9._-]/g, "_")}/${randomUUID()}${ext}`;

    const { error } = await supabase.storage.from(BUCKET).upload(relativePath, bytes, {
      contentType,
      upsert: false,
    });
    if (error) {
      console.warn(`[visual-research/mirror] upload failed: ${error.message}`);
      return null;
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(relativePath);
    return data.publicUrl;
  } catch (error) {
    console.warn("[visual-research/mirror] soft-fail:", error);
    return null;
  }
}

export async function mirrorRemoteImages(
  clientId: string,
  urls: string[]
): Promise<string[]> {
  const out: string[] = [];
  for (const url of urls) {
    const mirrored = await mirrorRemoteImageToStorage(clientId, url);
    if (mirrored) out.push(mirrored);
  }
  return out;
}
