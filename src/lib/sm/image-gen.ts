import "server-only";

import { configureFal, fal, isFalConfigured } from "@/lib/fal";
import { getReplicate, isReplicateConfigured } from "@/lib/replicate";
import { supabase } from "@/lib/supabase";
import type { SMAssetType, SMPlatform } from "@/types/sm";

const FLUX_ULTRA = "black-forest-labs/flux-1.1-pro-ultra";
const FLUX_PRO = "black-forest-labs/flux-1.1-pro";
const BUCKET = "sm-assets";

/** fal model cascade: Nano Banana 2 edit (refs) → Nano Banana 2 → Ideogram → FLUX.2 Pro */
const FAL_NANO_BANANA = "fal-ai/nano-banana-2";
const FAL_NANO_BANANA_EDIT = "fal-ai/nano-banana-2/edit";
const FAL_IDEOGRAM = "fal-ai/ideogram/v3";
const FAL_FLUX_2_PRO = "fal-ai/flux-2-pro";

export type GenerateImageOptions = {
  /** Public URLs of brief reference / inspiration images */
  referenceImageUrls?: string[];
  /** Subset of referenceImageUrls that the user uploaded — match composition first */
  userReferenceUrls?: string[];
  /** Optional seed for variation across regenerations */
  seed?: number;
};

type FluxInput = {
  prompt: string;
  aspect_ratio: FluxAspectRatio;
  output_format: "jpg" | "png";
  output_quality: number;
  raw?: boolean;
  safety_tolerance?: number;
  prompt_upsampling?: boolean;
};

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
    const obj = output as Record<string, unknown>;
    if (Array.isArray(obj.images) && obj.images.length > 0) {
      return extractImageUrl(obj.images[0]);
    }
    if (obj.image && typeof obj.image === "object") {
      return extractImageUrl(obj.image);
    }
    const urlValue = obj.url;
    if (typeof urlValue === "string" && urlValue.startsWith("http")) {
      return urlValue;
    }
    if (typeof urlValue === "function") {
      const value = (urlValue as () => URL | string)();
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

function fluxImageSize(
  aspectRatio: FluxAspectRatio
): "square_hd" | "portrait_16_9" | "landscape_16_9" | "portrait_4_3" {
  switch (aspectRatio) {
    case "9:16":
      return "portrait_16_9";
    case "16:9":
      return "landscape_16_9";
    case "4:5":
    case "3:4":
      return "portrait_4_3";
    default:
      return "square_hd";
  }
}

async function runFalModel(
  model: string,
  input: Record<string, unknown>,
  label: string
): Promise<Buffer> {
  configureFal();
  console.info(`[image-gen] fal → ${label} (${model})`);
  const result = await fal.subscribe(model, { input, logs: false });
  const data = (result as { data?: unknown }).data ?? result;
  const url = extractImageUrl(data);
  if (!url) {
    throw new Error(`fal ${label} returned no image URL`);
  }
  return downloadMarketingImage(url);
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
    message.includes("Payment Required") ||
    message.toLowerCase().includes("exhausted")
  ) {
    return "Image generation unavailable: account has insufficient credit. Top up fal/Replicate billing, then retry.";
  }

  if (message.toLowerCase().includes("nsfw") || message.toLowerCase().includes("safety")) {
    return "Image blocked by safety filter. Try Redo with a different scene direction, or simplify the brief (avoid skin-heavy close-ups).";
  }

  return status ? `${message} (HTTP ${status})` : message;
}

function isRetryableModelError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message : String(error ?? "");
  const lower = message.toLowerCase();
  return (
    lower.includes("nsfw") ||
    lower.includes("safety") ||
    lower.includes("content") ||
    lower.includes("moderat") ||
    lower.includes("timeout") ||
    lower.includes("429") ||
    lower.includes("503") ||
    lower.includes("502") ||
    lower.includes("no image")
  );
}

async function runFluxModel(model: string, input: FluxInput): Promise<Buffer> {
  const replicate = getReplicate();
  const output = await replicate.run(model as `${string}/${string}`, { input });
  return resolveReplicateOutputToBuffer(output);
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
    throw new Error(`Failed to download generated image (HTTP ${res.status})`);
  }
  return Buffer.from(await res.arrayBuffer());
}

function sanitizeReferenceUrls(urls?: string[]): string[] {
  if (!urls?.length) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of urls) {
    const url = raw?.trim();
    if (!url || !/^https?:\/\//i.test(url) || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
    if (out.length >= 4) break;
  }
  return out;
}

function referenceAwarePrompt(
  prompt: string,
  hasRefs: boolean,
  hasUserRefs: boolean
): string {
  if (!hasRefs) return prompt.slice(0, 3800);
  const userLead = hasUserRefs
    ? "USER REFERENCE IMAGE attached — this is the composition master. Match its exact subject, pose, framing, lighting, wardrobe, and shadow metaphor. Do NOT invent a different yoga pose or scene. "
    : "";
  const lead =
    userLead +
    "Create a NEW Instagram advertising photograph. Attached references may include best-in-category ad creatives and photographic mood boards. " +
    "Match their craft level: lighting, color grade, composition tension, wardrobe realism, and mood. " +
    "Do not copy reference text, logos, watermarks, headlines, or layouts. No corporate stock look. No neon/CGI silhouette overlays. ";
  return `${lead}${prompt}`.replace(/\s+/g, " ").trim().slice(0, 3800);
}

function variationSeed(options?: GenerateImageOptions): number {
  if (typeof options?.seed === "number" && Number.isFinite(options.seed)) {
    return Math.abs(Math.floor(options.seed)) % 2_147_483_647;
  }
  return Math.floor(Math.random() * 2_147_483_647);
}

async function generateViaFal(
  prompt: string,
  aspectRatio: FluxAspectRatio,
  options?: GenerateImageOptions
): Promise<Buffer> {
  const allRefs = sanitizeReferenceUrls(options?.referenceImageUrls);
  const userRefs = sanitizeReferenceUrls(options?.userReferenceUrls);
  const hasUserRefs = userRefs.length > 0;
  const refs = hasUserRefs ? userRefs.slice(0, 2) : allRefs;
  const seed = variationSeed(options);

  if (refs.length > 0) {
    console.info(
      `[image-gen] fal edit refs=${refs.length} userOnly=${hasUserRefs} urls=${refs.map((u) => u.slice(0, 80)).join(" | ")}`
    );
  }

  const trimmedPrompt = referenceAwarePrompt(
    `${prompt} Variation seed ${seed}: ${hasUserRefs ? "preserve reference composition; subtle camera shift only" : "change camera angle, crop, and moment — do not repeat a previous frame"}.`,
    refs.length > 0,
    hasUserRefs
  );

  const editInput = (editSeed: number) => ({
    prompt: trimmedPrompt,
    image_urls: refs,
    num_images: 1,
    aspect_ratio: aspectRatio,
    resolution: "1K",
    output_format: "jpeg",
    safety_tolerance: "5",
    limit_generations: true,
    seed: editSeed,
  });

  // When refs exist, retry edit before falling back to text-only models.
  if (refs.length > 0) {
    let lastEditError: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await runFalModel(
          FAL_NANO_BANANA_EDIT,
          editInput(seed + attempt),
          attempt === 0 ? "nano-banana-2-edit-refs" : "nano-banana-2-edit-refs-retry"
        );
      } catch (error) {
        lastEditError = error;
        console.warn(
          `[image-gen] fal nano-banana-2/edit attempt ${attempt + 1} failed: ${formatSmImageError(error)}`
        );
      }
    }
    console.warn(
      `[image-gen] all reference-edit attempts failed (${refs.length} refs) — refusing text-only fallback`
    );
    throw lastEditError instanceof Error
      ? lastEditError
      : new Error(
          hasUserRefs
            ? "Could not apply user reference image — fal edit failed"
            : "Reference image edit failed — refusing to generate without refs"
        );
  }

  const attempts: Array<{
    label: string;
    model: string;
    input: Record<string, unknown>;
  }> = [
    {
      label: "nano-banana-2-1k",
      model: FAL_NANO_BANANA,
      input: {
        prompt: trimmedPrompt,
        num_images: 1,
        aspect_ratio: aspectRatio,
        resolution: "1K",
        output_format: "jpeg",
        safety_tolerance: "5",
        seed,
      },
    },
    {
      label: "flux-2-pro",
      model: FAL_FLUX_2_PRO,
      input: {
        prompt: trimmedPrompt,
        image_size: fluxImageSize(aspectRatio),
        output_format: "jpeg",
        safety_tolerance: "5",
        seed,
      },
    },
  ];

  if (refs.length === 0) {
    attempts.push({
      label: "ideogram-v3",
      model: FAL_IDEOGRAM,
      input: {
        prompt: trimmedPrompt,
        aspect_ratio: aspectRatio,
        rendering_speed: "QUALITY",
        expand_prompt: false,
        num_images: 1,
      },
    });
  }

  let lastError: unknown;
  for (const attempt of attempts) {
    try {
      return await runFalModel(attempt.model, attempt.input, attempt.label);
    } catch (error) {
      lastError = error;
      console.warn(
        `[image-gen] fal ${attempt.label} failed: ${formatSmImageError(error)} — trying next…`
      );
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("fal image generation failed on all models");
}

async function generateViaReplicateFlux(
  prompt: string,
  aspectRatio: FluxAspectRatio
): Promise<Buffer> {
  const trimmedPrompt = prompt.slice(0, 3800);
  const attempts: Array<{ model: string; input: FluxInput; label: string }> = [
    {
      model: FLUX_ULTRA,
      label: "replicate-ultra-raw",
      input: {
        prompt: trimmedPrompt,
        aspect_ratio: aspectRatio,
        output_format: "jpg",
        output_quality: 95,
        raw: true,
        safety_tolerance: 5,
      },
    },
    {
      model: FLUX_ULTRA,
      label: "replicate-ultra-standard",
      input: {
        prompt: trimmedPrompt,
        aspect_ratio: aspectRatio,
        output_format: "jpg",
        output_quality: 92,
        raw: false,
        safety_tolerance: 6,
      },
    },
    {
      model: FLUX_PRO,
      label: "replicate-pro-fallback",
      input: {
        prompt: trimmedPrompt,
        aspect_ratio: aspectRatio,
        output_format: "jpg",
        output_quality: 90,
        safety_tolerance: 6,
        prompt_upsampling: true,
      },
    },
  ];

  let lastError: unknown;
  for (const attempt of attempts) {
    try {
      console.info(`[image-gen] replicate → ${attempt.label}`);
      return await runFluxModel(attempt.model, attempt.input);
    } catch (error) {
      lastError = error;
      if (!isRetryableModelError(error)) throw error;
      console.warn(
        `[image-gen] NSFW/safety block on ${attempt.label}, trying next strategy…`
      );
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Image generation failed after safety-filter retries");
}

export async function generateMarketingImageBytes(
  prompt: string,
  aspectRatio: FluxAspectRatio = "1:1",
  options?: GenerateImageOptions
): Promise<Buffer> {
  const wantsRefs =
    (options?.referenceImageUrls?.length ?? 0) > 0 ||
    (options?.userReferenceUrls?.length ?? 0) > 0;

  if (isFalConfigured()) {
    try {
      return await generateViaFal(prompt, aspectRatio, options);
    } catch (falError) {
      if (wantsRefs) throw falError;
      console.warn(
        `[image-gen] fal cascade failed: ${formatSmImageError(falError)} — falling back to Replicate FLUX if configured`
      );
      if (!isReplicateConfigured()) throw falError;
    }
  }

  if (wantsRefs) {
    throw new Error(
      "Reference image generation requires FAL_KEY — Replicate fallback cannot use refs"
    );
  }

  if (isReplicateConfigured()) {
    return generateViaReplicateFlux(prompt, aspectRatio);
  }

  throw new Error(
    "No image provider configured. Set FAL_KEY (preferred) or REPLICATE_API_TOKEN in .env.local / Vercel."
  );
}

export async function generateAndStoreImage(
  prompt: string,
  aspectRatio: AspectRatio,
  assetId: string,
  options?: GenerateImageOptions
): Promise<string> {
  const bytes = await generateMarketingImageBytes(prompt, aspectRatio, options);
  const path = `generated/${assetId}-${Date.now()}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType: "image/jpeg",
    upsert: false,
  });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
