import { NextResponse } from "next/server";
import { smRouteHandler } from "@/lib/sm/api-auth";
import { createCreativeRequest } from "@/lib/sm/store";
import type { SMGoal, SMPlatform } from "@/types/sm";

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

    const request = await createCreativeRequest({
      client_id,
      brief_text,
      platforms,
      goal,
      uploaded_image_urls,
    });

    return request;
  });
}
