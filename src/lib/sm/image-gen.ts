import "server-only";

import { getReplicate, isReplicateConfigured } from "@/lib/replicate";
import { supabase } from "@/lib/supabase";
import type { SMAssetType, SMPlatform } from "@/types/sm";

const FLUX_MODEL = "black-forest-labs/flux-1.1-pro-ultra";
const BUCKET = "sm-assets";

export type FluxAspectRatio = "1:1" | "9:16" | "16:9" | "4:5" | "3:4";
export type AspectRatio = FluxAspectRatio;

type FileOutputLike = {
  blob?: () => Promise<Blob>;
  url?: () => URL | string;
};

function extractImageUrl(output: unknown): string | null {
  if (typeof output === "string") {
    if (output.startsWith("http")) return output;
    return null;
  }
  if (Array.isArray(output) && output.length > 0) {
    return extractImageUrl(output[0]);
  }
  if (output && typeof output === "object") {
    const fileOutput = output as FileOutputLike;
    if (typeof fileOutput.url === "function") {
      const value = fileOutput.url();
      return typeof value === "string" ? value : String(value);
    }
    const asString = String(output);
    if (asString.startsWith("http")) return asString;
  }
  return null;
}

async function resolveReplicateOutputToBuffer(output: unknown): Promise<Buffer> {
  const url = extractImageUrl(output);
  if (url) return downloadMarketingImage(url);

  if (output && typeof output === "object") {
    const fileOutput = output as FileOutputLike;
    if (typeof fileOutput.blob === "function") {
      const blob = await fileOutput.blob();
      return Buffer.from(await blob.arrayBuffer());
    }
  }

  if (Array.isArray(output) && output.length > 0) {
    return resolveReplicateOutputToBuffer(output[0]);
  }

  throw new Error(
    "Replicate returned no image URL or file output — check REPLICATE_API_TOKEN and model access"
  );
}

export function formatSmImageError(error: unknown): string {
  if (!(error instanceof Error) && (error === null || typeof error !== "object")) {
    return String(error ?? "Unknown error");
  }

  const err = error as Error & {
    status?: number;
    statusCode?: number;
    response?: { status?: number };
  };

  const message = err.message || "Unknown error";
  const status = err.status ?? err.statusCode ?? err.response?.status ?? null;

  if (
    status === 402 ||
    message.includes("Insufficient credit") ||
    message.includes("Payment Required")
  ) {
    return "Image generation unavailable: Replicate account has insufficient credit. Add billing at https://replicate.com/account/billing, wait a few minutes, then retry.";
  }

  return status ? `${message} (HTTP ${status})` : message;
}

export function logSmImageError(
  context: Record<string, unknown>,
  error: unknown
): string {
  const message = formatSmImageError(error);
  console.error("[SM generate] Image generation FAILED:", JSON.stringify({ ...context, message }));
  return message;
}

export function getAspectRatio(
  platform: SMPlatform | string,
  assetType: SMAssetType | string
): FluxAspectRatio {
  if (assetType === "story" || assetType === "reel_cover") return "9:16";
  if (platform === "linkedin") return "16:9";
  if (platform === "twitter") return "16:9";
  if (platform === "instagram" && assetType === "post") return "4:5";
  return "1:1";
}

export async function downloadMarketingImage(tempUrl: string): Promise<Buffer> {
  const res = await fetch(tempUrl);
  if (!res.ok) {
    throw new Error(`Failed to download Replicate image (HTTP ${res.status})`);
  }
  return Buffer.from(await res.arrayBuffer());
}

export async function generateMarketingImageBytes(
  prompt: string,
  aspectRatio: FluxAspectRatio = "1:1"
): Promise<Buffer> {
  if (!isReplicateConfigured()) {
    throw new Error(
      "REPLICATE_API_TOKEN is not set. Add it to .env.local and Vercel env vars."
    );
  }

  const replicate = getReplicate();
  const output = await replicate.run(FLUX_MODEL, {
    input: {
      prompt: prompt.slice(0, 3800),
      aspect_ratio: aspectRatio,
      output_format: "jpg",
      output_quality: 95,  // Ultra supports higher quality
      raw: true,            // Raw mode = more photorealistic, less AI-processed look
    },
  });

  return resolveReplicateOutputToBuffer(output);
}

export async function generateAndStoreImage(
  prompt: string,
  aspectRatio: AspectRatio,
  assetId: string
): Promise<string> {
  const bytes = await generateMarketingImageBytes(prompt, aspectRatio);
  const path = `generated/${assetId}-${Date.now()}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType: "image/jpeg",
    upsert: false,
  });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
