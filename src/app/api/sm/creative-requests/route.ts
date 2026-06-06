import { NextResponse } from "next/server";
import { smRouteHandler } from "@/lib/sm/api-auth";
import { createCreativeRequest } from "@/lib/sm/store";
import type { SMCreativeFormat, SMCreativeLens, SMGoal, SMPlatform } from "@/types/sm";

const VALID_FORMATS: SMCreativeFormat[] = [
  "social_media",
  "print_ad",
  "outdoor",
  "tv_script",
  "social_video",
  "pitch_deck",
];

const VALID_LENSES: SMCreativeLens[] = [
  "signalops",
  "human_truth",
  "brave_take",
  "category_breaker",
  "cultural_insider",
  "behaviour_change",
  "craft_first",
];

export const runtime = "nodejs";

export async function POST(req: Request) {
  return smRouteHandler(req, async () => {
    const body = await req.json();
    const client_id = String(body.client_id ?? "").trim();
    const brief_text = String(body.brief_text ?? "").trim();
    const platforms = Array.isArray(body.platforms) ? (body.platforms as SMPlatform[]) : [];
    const goal = body.goal as SMGoal | undefined;
    const uploaded_image_urls = Array.isArray(body.uploaded_image_urls)
      ? (body.uploaded_image_urls as string[])
      : [];

    if (!client_id) throw new Error("client_id is required");
    if (!brief_text) throw new Error("brief_text is required");
    if (platforms.length === 0) throw new Error("platforms must include at least one platform");

    const creative_lens =
      typeof body.creative_lens === "string" && VALID_LENSES.includes(body.creative_lens as SMCreativeLens)
        ? (body.creative_lens as SMCreativeLens)
        : "signalops";

    const creative_format =
      typeof body.creative_format === "string" &&
      VALID_FORMATS.includes(body.creative_format as SMCreativeFormat)
        ? (body.creative_format as SMCreativeFormat)
        : "social_media";

    const request = await createCreativeRequest({
      client_id,
      brief_text,
      platforms,
      goal,
      uploaded_image_urls,
      creative_format,
      creative_lens,
    });

    return request;
  });
}
