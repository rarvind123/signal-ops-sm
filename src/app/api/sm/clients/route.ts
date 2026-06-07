import { NextResponse } from "next/server";
import { smRouteHandler } from "@/lib/sm/api-auth";
import { createClient, listClients } from "@/lib/sm/store";
import type { SMClient, SMTone } from "@/types/sm";

export const runtime = "nodejs";

export async function GET(req: Request) {
  return smRouteHandler(req, async () => {
    const clients = await listClients();
    return clients;
  });
}

export async function POST(req: Request) {
  return smRouteHandler(req, async () => {
    const body = (await req.json()) as Partial<SMClient>;
    const name = body.name?.trim();
    if (!name) {
      throw new Error("name is required");
    }

    const client = await createClient({
      name,
      tagline: body.tagline?.trim() || undefined,
      usp: body.usp?.trim() || undefined,
      tone: body.tone as SMTone | undefined,
      target_audience: body.target_audience ?? {},
      has_brand_kit: body.has_brand_kit ?? false,
      logos: body.logos ?? {},
      color_palette: body.color_palette ?? {},
      brand_colors: body.brand_colors ?? [{ hex: "#000000", label: "primary" }],
      font_primary: body.font_primary,
      font_secondary: body.font_secondary,
      font_source: body.font_source,
      photo_style: body.photo_style,
      voice: body.voice ?? { do: [], dont: [] },
      social_handles: body.social_handles ?? {},
    });

    return client;
  });
}
