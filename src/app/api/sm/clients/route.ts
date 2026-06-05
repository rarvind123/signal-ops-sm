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
      brand_colors: body.brand_colors ?? [{ hex: "#000000", label: "primary" }],
      social_handles: body.social_handles ?? {},
    });

    return client;
  });
}
