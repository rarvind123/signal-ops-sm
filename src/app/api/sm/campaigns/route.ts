import { NextResponse } from "next/server";
import { smRouteHandler } from "@/lib/sm/api-auth";
import { createCampaign, listCampaigns } from "@/lib/sm/store";
import type { SMCampaignObjective, SMPlatform } from "@/types/sm";

export const runtime = "nodejs";

export async function GET(req: Request) {
  return smRouteHandler(req, async () => {
    const url = new URL(req.url);
    const clientId = url.searchParams.get("client_id");
    if (!clientId) {
      return NextResponse.json({ error: "client_id is required" }, { status: 400 });
    }
    return listCampaigns(clientId);
  });
}

export async function POST(req: Request) {
  return smRouteHandler(req, async () => {
    const body = (await req.json()) as Record<string, unknown>;
    const client_id = typeof body.client_id === "string" ? body.client_id : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!client_id || !name) {
      return NextResponse.json({ error: "client_id and name are required" }, { status: 400 });
    }

    const campaign = await createCampaign({
      client_id,
      name,
      objective: body.objective as SMCampaignObjective | undefined,
      duration_days: Number(body.duration_days ?? 30),
      product_service:
        typeof body.product_service === "string" ? body.product_service : undefined,
      key_message: typeof body.key_message === "string" ? body.key_message : undefined,
      offer: typeof body.offer === "string" ? body.offer : undefined,
      target_audience: (body.target_audience as Record<string, unknown>) ?? {},
      platforms: Array.isArray(body.platforms) ? (body.platforms as SMPlatform[]) : [],
      mandatory_ctas: Array.isArray(body.mandatory_ctas)
        ? (body.mandatory_ctas as string[])
        : [],
      additional_notes:
        typeof body.additional_notes === "string" ? body.additional_notes : undefined,
    });

    return campaign;
  });
}
