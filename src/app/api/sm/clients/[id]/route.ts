import { NextResponse } from "next/server";
import { smRouteHandler } from "@/lib/sm/api-auth";
import {
  deleteClient,
  getClient,
  listBrandAssets,
  updateClient,
} from "@/lib/sm/store";
import type { SMClient, SMTone } from "@/types/sm";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: Request, context: RouteContext) {
  return smRouteHandler(req, async () => {
    const { id } = await context.params;
    const client = await getClient(id);
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }
    const brand_assets = await listBrandAssets(id);
    return { ...client, brand_assets };
  });
}

export async function PATCH(req: Request, context: RouteContext) {
  return smRouteHandler(req, async () => {
    const { id } = await context.params;
    const body = (await req.json()) as Partial<SMClient>;
    const updated = await updateClient(id, {
      name: body.name?.trim(),
      tagline: body.tagline?.trim(),
      usp: body.usp?.trim(),
      tone: body.tone as SMTone | undefined,
      target_audience: body.target_audience,
      brand_colors: body.brand_colors,
      social_handles: body.social_handles,
    });
    if (!updated) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }
    return updated;
  });
}

export async function DELETE(req: Request, context: RouteContext) {
  return smRouteHandler(req, async () => {
    const { id } = await context.params;
    const deleted = await deleteClient(id);
    if (!deleted) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }
    return { ok: true };
  });
}
