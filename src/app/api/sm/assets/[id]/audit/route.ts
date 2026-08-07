import { NextResponse } from "next/server";
import { smRouteHandler } from "@/lib/sm/api-auth";
import { getGeneratedAsset } from "@/lib/sm/store";
import { listAuditEvents } from "@/lib/sm/audit";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: RouteContext) {
  return smRouteHandler(_req, async () => {
    const { id } = await context.params;
    const asset = await getGeneratedAsset(id);
    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }
    const events = await listAuditEvents("asset", id);
    return { asset_id: id, events };
  });
}
